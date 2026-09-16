const {test}=require('node:test');
const assert=require('node:assert/strict');
const {review,delivery}=require('../lib/energy-review');
const planner=require('../lib/energy-planner-v6');
const sample=require('../samples/energy-demo.json');

test('comparison reconciles with planner output and does not count held orders as on-time',()=>{
  const plan=planner.createEnergyPlan(sample),r=review(sample,plan);
  assert.equal(r.usageSaving,plan.baseline.usageCost-plan.proposed.usageCost);
  assert.equal(r.demandSaving,plan.baseline.demandExposure-plan.proposed.demandExposure);
  const held={...plan.proposed,unscheduled:plan.allocations.map(a=>({id:a.id}))};
  assert.equal(delivery(plan,held),0);
});
test('stock counts distinguish unknown, stale and future relative to shift',()=>{
  const i={shift:{date:'2026-09-16',start:'08:00'},lines:[]};
  const status=x=>review(x,null).checks.find(c=>c.label==='Inventory freshness').status;
  assert.equal(status(i),'Unknown');
  assert.equal(status({...i,inventoryCountedAt:'2026-09-14T08:00'}),'Stale');
  assert.equal(status({...i,inventoryCountedAt:'2026-09-16T07:00'}),'Dated snapshot');
  assert.equal(status({...i,inventoryCountedAt:'2026-09-17T07:00'}),'Review date');
});
test('missing power and incomplete background coverage stay visible',()=>{
  const plan=planner.createEnergyPlan(sample);
  plan.energyInput={intervalsUsed:1,shiftIntervals:40};
  const r=review({...sample,lines:[{kw:''}]},plan);
  assert.equal(r.checks[0].status,'Missing');
  assert.match(r.checks.find(c=>c.label==='Background load').detail,/39 use configured/);
});
test('different scheduled work cannot be presented as pure efficiency savings',()=>{
  const plan=planner.createEnergyPlan(sample);
  plan.proposed.jobs=plan.proposed.jobs.slice(1);
  const r=review(sample,plan);
  assert.equal(r.comparable,false);
  assert.match(r.tradeoff,/do not treat.*efficiency savings/);
});
test('stock coverage counts only orders not overdue at shift start',()=>{
  const plan={shift:{start:'08:00'},allocations:[{id:'ready',produce:0,dueMinute:600},{id:'overdue',produce:0,dueMinute:400}]};
  assert.equal(delivery(plan,{jobs:[],unscheduled:[]}),1);
});
test('stock-count timestamp persists independently across workspaces',()=>{
  const fs=require('node:fs'),vm=require('node:vm');
  const storage=new Map();
  const profile={id:'factory-a',name:'Test',master:structuredClone(sample)};
  storage.set('batchwatt_v5_active_factory_profile','factory-a');
  storage.set('batchwatt_v5_factory_profiles',JSON.stringify([profile]));
  const context={input:{...structuredClone(sample),inventoryCountedAt:'2026-09-16T07:00'},workflow:{items:{},release:null},result:null,persist(){},recalc(){},localDate:()=> '2026-09-16',window:{},location:{},document:{addEventListener(){}},setTimeout:fn=>fn(),localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../factory-workspaces-core.js'),'utf8'),context);
  const ws=context.window.BatchWattWorkspaces;
  ws.ensure();const first=ws.activeId();ws.save();
  ws.create('New day','2026-09-17');
  assert.equal(context.input.inventoryCountedAt,'');
  ws.load(first);
  assert.equal(context.input.inventoryCountedAt,'2026-09-16T07:00');
});
