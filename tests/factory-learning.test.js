const test=require('node:test');
const assert=require('node:assert/strict');
const Learning=require('../lib/factory-learning');
const products=[{id:'P1',name:'Ghee 1 L'},{id:'P2',name:'Ghee 500 ml'}];
const orders=[
  {id:'O1',externalId:'A-1',customer:'Store A',productId:'P1',qty:40,due:'2026-09-14T10:00',priority:'High'},
  {id:'O2',externalId:'A-2',customer:'Store A',productId:'P1',qty:60,due:'2026-09-14T11:00',priority:'Standard'},
  {id:'O3',externalId:'B-1',customer:'Store B',productId:'P2',qty:30,due:'2026-09-21T10:00',priority:'Urgent'}
];
test('learning accumulates unique orders and does not double count repeated workspaces',()=>{
  let state=Learning.empty('F1');
  let merged=Learning.merge(state,orders,products,'2026-09-14T00:00:00Z');
  assert.equal(merged.added,3);state=merged.state;
  merged=Learning.merge(state,orders,products,'2026-09-14T01:00:00Z');
  assert.equal(merged.added,0);assert.equal(merged.updated,0);assert.equal(merged.state.observations.length,3);
});
test('learning updates an existing external order instead of adding another observation',()=>{
  let state=Learning.merge(Learning.empty('F1'),orders,products).state;
  const changed={...orders[0],qty:50};
  const merged=Learning.merge(state,[changed],products,'2026-09-14T02:00:00Z');
  assert.equal(merged.added,0);assert.equal(merged.updated,1);assert.equal(merged.state.observations.find(x=>x.externalId==='A-1').qty,50);
});
test('summary exposes demand mix, rush share, due window and weekday signal',()=>{
  const state=Learning.merge(Learning.empty('F1'),orders,products).state;
  const s=Learning.summarize(state,'2026-09-14');
  assert.equal(s.sampleCount,3);assert.equal(s.uniqueCustomers,2);assert.equal(s.topProduct.name,'Ghee 1 L');assert.equal(s.topProduct.units,100);assert.equal(s.rushShare,66.7);assert.equal(s.busiestDueHour,10);assert.equal(s.weekdaySignal.avgOrders,1.5);assert.equal(s.weekdaySignal.avgUnits,65);
});
test('confidence grows with observation count without claiming operational learning',()=>{
  const many=Array.from({length:100},(_,i)=>({id:`O${i}`,customer:`C${i%10}`,productId:'P1',qty:10,due:`2026-09-${String(1+i%20).padStart(2,'0')}T10:00`,priority:'Standard'}));
  const s=Learning.summarize(Learning.merge(Learning.empty('F1'),many,products).state);
  assert.equal(s.confidence,'Strong');assert.equal(s.confidenceScore,100);
});
