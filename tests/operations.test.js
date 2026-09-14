const test = require('node:test');
const assert = require('node:assert/strict');
const Ops = require('../lib/operations');

const input = {
  factory:'Plant A', shift:{date:'2026-09-10',start:'08:00',end:'18:00'},
  energy:{peakLimitKw:65}, lines:[], products:[], orders:[], materials:[], recipes:[], purchaseOrders:[]
};
const result = {
  proposed:{peakKw:60,unscheduled:[],jobs:[{id:'O0',customer:'Customer',product:'SKU',priority:'Standard',due:'2026-09-10T12:00',lateMinutes:0}]},
  allocations:[], procurement:{requirements:[]}
};

test('releasable plan has runnable work and no hard blockers',()=>{
  const s=Ops.summary(input,result,{items:{}});
  assert.equal(s.releasable,true);
  assert.equal(s.releaseMode,'full');
  assert.equal(s.openCount,0);
  assert.equal(s.peakHeadroomKw,5);
});

test('peak target breach creates a critical exception and blocks release',()=>{
  const breached={...result,proposed:{...result.proposed,peakKw:72}};
  const s=Ops.summary(input,breached,{items:{}});
  assert.equal(s.criticalCount,1);
  assert.equal(s.releasable,false);
  assert.equal(s.items[0].id,'energy:peak-limit');
});

test('blocked production stays visible while runnable work can be partially released',()=>{
  const blocked={...result,proposed:{...result.proposed,unscheduled:[{id:'O1',customer:'Customer',product:'SKU 2',priority:'Urgent',due:'2026-09-10T10:00',reasonCode:'MATERIAL',reason:'Material shortage: resin 5 kg.'}]}};
  const s=Ops.summary(input,blocked,{items:{}});
  assert.equal(s.blockedOrders,1);
  assert.equal(s.allOrdersFeasible,false);
  assert.equal(s.partialRelease,true);
  assert.equal(s.releaseMode,'partial');
  assert.equal(s.releasable,true);
  assert.equal(s.items[0].action,'procurement');
  assert.equal(s.items[0].reasonCode,'MATERIAL');
});

test('a plan with only held production is not releasable',()=>{
  const held={proposed:{peakKw:20,jobs:[],unscheduled:[{id:'O1',customer:'Customer',product:'SKU',priority:'High',due:'2026-09-10T10:00',reasonCode:'CAPACITY',reason:'Insufficient capacity.'}]},allocations:[],procurement:{requirements:[]}};
  const s=Ops.summary(input,held,{items:{}});
  assert.equal(s.releasable,false);
  assert.equal(s.releaseMode,'blocked');
});

test('release becomes stale after operational inputs change',()=>{
  const fingerprint=Ops.planFingerprint(input);
  assert.equal(Ops.releaseStatus(input,{release:{fingerprint}}).isReleased,true);
  const changed={...input,orders:[{id:'O2'}]};
  const status=Ops.releaseStatus(changed,{release:{fingerprint}});
  assert.equal(status.isReleased,false);
  assert.equal(status.isStale,true);
});
