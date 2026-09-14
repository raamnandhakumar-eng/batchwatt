const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createEnergyPlan } = require('../lib/energy-planner');
const reports = require('../lib/energy-reports');
const handler = require('../api/generate-plan');
const demo = require('../samples/energy-demo.json');
const fresh = () => JSON.parse(JSON.stringify(demo));

test('demo lowers peak without dropping work or worsening dispatch', () => {
  const input=fresh(), before=JSON.stringify(input), r=createEnergyPlan(input);
  assert.equal(r.baseline.peakKw,82);
  assert.equal(r.proposed.peakKw,40);
  assert.equal(r.proposed.jobs.length,r.baseline.jobs.length);
  assert.equal(r.proposed.lateOrders,0);
  assert.equal(r.proposed.unscheduled.length,0);
  assert.equal(r.baseline.kwh,r.proposed.kwh,'shifting timing must not invent kWh savings');
  assert.equal(r.comparison.conditionalDemandSaving,555);
  assert.equal(JSON.stringify(input),before,'input is immutable');
});

test('V6 exposes whole-shift decisions and structured actions', () => {
  const r=createEnergyPlan(fresh());
  assert.equal(r.schemaVersion,'3.0');
  assert.match(r.plannerMethod,/whole-shift beam search/);
  assert.equal(r.decisions.length,r.proposed.jobs.length);
  assert.equal(r.orderDecisions.length,r.allocations.filter(a=>a.produce>0).length);
  assert.ok(r.objective.some(x=>x.includes('priority-weighted')));
  assert.ok(r.objective.some(x=>x.includes('cost')));
  assert.ok(r.comparison.totalModeledOperatingSaving>=0);
  for(const d of r.decisions){
    const proposed=r.proposed.jobs.find(j=>j.id===d.orderId);
    const baseline=r.baseline.jobs.find(j=>j.id===d.orderId);
    assert.equal(d.recommendedStart,proposed.startTime);
    assert.ok(proposed.lateMinutes<=baseline.lateMinutes);
    assert.ok(['RUN','SHIFT'].includes(d.action));
    assert.ok(typeof d.reason==='string'&&d.reason.length>10);
  }
});

test('shared finished stock and packaging are consumed once per product', () => {
  const input=fresh();
  input.orders=[{...input.orders[0],qty:100},{...input.orders[0],id:'second',qty:100,due:'2026-09-09T14:00'}];
  input.products[0].packaging=100;
  const r=createEnergyPlan(input);
  assert.deepEqual(r.allocations.map(o=>o.fromStock),[50,0]);
  assert.deepEqual(r.allocations.map(o=>o.packagingShort),[0,50]);
  assert.equal(r.proposed.unscheduled[0].id,'second');
  assert.equal(r.proposed.unscheduled[0].reasonCode,'PACKAGING');
});

test('machine runs never overlap on the same line or leave the shift', () => {
  const r=createEnergyPlan(fresh());
  for(const line of demo.lines){
    const jobs=r.proposed.jobs.filter(j=>j.lineId===line.id).sort((a,b)=>a.start-b.start);
    jobs.forEach((j,i)=>{assert.ok(j.start>=480&&j.end<=1080);if(i)assert.ok(j.start>=jobs[i-1].end);});
  }
});

test('power profile accounts for base load and scheduled jobs', () => {
  const r=createEnergyPlan(fresh());
  for(const slot of r.proposed.profile){
    const active=r.proposed.jobs.filter(j=>j.start<=slot.minute&&j.end>slot.minute);
    assert.ok(slot.kw>=8);
    if(!active.length)assert.equal(slot.kw,8);
  }
});

test('capacity shortages remain visible in exports', () => {
  const input=fresh();input.shift.end='09:00';const r=createEnergyPlan(input);
  assert.ok(r.proposed.unscheduled.length>0);
  assert.ok(r.proposed.unscheduled.some(x=>x.reasonCode==='CAPACITY'));
  assert.equal(reports.dispatchRows(r).length,input.orders.length);
  assert.ok(reports.csv(r).includes('Blocked'));
});

test('impossible target is flagged without changing power ratings', () => {
  const input=fresh();input.energy.peakLimitKw=10;const r=createEnergyPlan(input);
  assert.ok(r.proposed.overloadSlots>0);
  assert.ok(r.warnings.some(w=>w.includes('target exceeded')));
});

test('previous monthly peak eliminates already-incurred demand savings', () => {
  const input=fresh();input.energy.monthlyPeakKw=100;const r=createEnergyPlan(input);
  assert.equal(r.comparison.conditionalDemandSaving,0);
  assert.equal(r.baseline.demandExposure,0);
});

test('no demand tariff means no demand savings', () => {
  const input=fresh();input.energy.demandRate=0;const r=createEnergyPlan(input);
  assert.equal(r.comparison.conditionalDemandSaving,0);
  assert.ok(r.proposed.usageCost<=r.baseline.usageCost+.01);
});

test('stock-only orders use only background load and show overdue dispatch', () => {
  const input=fresh();input.orders=[{...input.orders[0],qty:10,due:'2026-09-08T17:00'}];const r=createEnergyPlan(input);
  assert.equal(r.proposed.peakKw,8);
  assert.equal(r.proposed.jobs.length,0);
  assert.equal(r.proposed.overdueStockOrders,1);
  assert.equal(reports.dispatchRows(r)[0].status,'Overdue stock dispatch');
});

test('overnight tariff windows apply to correct intervals', () => {
  const input=fresh();input.energy.peakStart='17:00';input.energy.peakEnd='09:00';const r=createEnergyPlan(input);
  assert.equal(r.proposed.profile[0].rate,0.21);
  assert.equal(r.proposed.profile[4].rate,0.12);
  assert.equal(r.proposed.profile.at(-1).rate,0.21);
});

test('invalid relationships, dates and rates fail clearly', () => {
  for(const mutate of [i=>i.orders[0].productId='missing',i=>i.orders[0].due='2026-02-30T10:00',i=>i.products[0].rate=0,i=>i.lines[0].kw=-2,i=>i.orders.push({...i.orders[0]})]){
    const input=fresh();mutate(input);assert.throws(()=>createEnergyPlan(input));
  }
});

test('report escapes markup and spreadsheet formulas from factory inputs', () => {
  const input=fresh();input.factory='<b>Factory</b>';input.orders[0].customer='=SUM(1,1)';const r=createEnergyPlan(input);
  assert.ok(!reports.loadChart(r).includes('<b>Factory</b>'));
  assert.ok(reports.loadChart(r).includes('&lt;b&gt;Factory&lt;/b&gt;'));
  assert.ok(reports.csv(r).includes("'=SUM"));
});

test('Vercel API accepts V6 structured data and rejects bad requests', async () => {
  let code,body;const res={setHeader(){},status(n){code=n;return this;},json(b){body=b;return this;}};
  await handler({method:'POST',body:fresh()},res);
  assert.equal(code,200);
  assert.equal(body.schemaVersion,'3.0');
  assert.equal(body.proposed.peakKw,40);
  await handler({method:'POST',body:{...fresh(),orders:[{id:'bad'}]}},res);assert.equal(code,400);
  await handler({method:'GET'},res);assert.equal(code,405);
});

test('tight deadlines retain delivery performance for each scheduled order', () => {
  const input=fresh();input.orders.forEach(o=>o.due='2026-09-09T11:00');const r=createEnergyPlan(input);
  for(const j of r.proposed.jobs){const baseline=r.baseline.jobs.find(b=>b.id===j.id);assert.ok(!baseline||j.lateMinutes<=baseline.lateMinutes);}
});

test('product can choose a lower-power eligible line when delivery is protected', () => {
  const input=fresh();
  input.orders=[{id:'ALT-1',customer:'Customer',productId:'ghee',qty:250,due:'2026-09-09T13:00',priority:'High'}];
  input.products[0].stock=0;input.products[0].packaging=1000;
  input.products[0].lineOptions=[{lineId:'heating',rate:100},{lineId:'packing',rate:80}];
  input.lines.find(x=>x.id==='heating').kw=60;
  input.lines.find(x=>x.id==='packing').kw=10;
  input.energy.peakLimitKw=30;
  input.materials.find(x=>x.id==='ghee-base').stock=1000;
  const r=createEnergyPlan(input);
  assert.equal(r.proposed.jobs[0].lineId,'packing');
  assert.equal(r.orderDecisions[0].action,'SHIFT');
  assert.equal(r.proposed.lateOrders,0);
});

test('line downtime is treated as unavailable capacity', () => {
  const input=fresh();
  input.orders=[{id:'DOWN-1',customer:'Customer',productId:'ghee',qty:100,due:'2026-09-09T15:00',priority:'Standard'}];
  input.products[0].stock=0;input.products[0].packaging=1000;input.materials.find(x=>x.id==='ghee-base').stock=1000;
  input.lines.find(x=>x.id==='heating').downtime=[{start:'08:00',end:'10:00',reason:'maintenance'}];
  const r=createEnergyPlan(input);
  assert.ok(r.proposed.jobs[0].start>=600);
});

test('material HOLD shows modeled earliest replenishment date without pretending stock arrived', () => {
  const input=fresh();
  input.orders=[{id:'MAT-1',customer:'Customer',productId:'ghee',qty:500,due:'2026-09-09T13:00',priority:'High'}];
  input.products[0].stock=0;input.products[0].packaging=1000;input.materials.find(x=>x.id==='ghee-base').stock=0;
  input.purchaseOrders=[{id:'PO-1',supplierId:'supplier-1',materialId:'ghee-base',qty:500,unitCost:5,expectedDate:'2026-09-11',status:'Ordered',receivedQty:0}];
  const r=createEnergyPlan(input);
  assert.equal(r.proposed.jobs.length,0);
  assert.equal(r.holds[0].reasonCode,'MATERIAL');
  assert.equal(r.holds[0].earliestFeasibleDate,'2026-09-11');
});

test('total meter interval data is rejected to prevent machine-load double counting', () => {
  const input=fresh();
  input.energy.intervalLoadBasis='total';
  input.energy.intervalLoad=[{time:'08:00',kw:50}];
  assert.throws(()=>createEnergyPlan(input),/Total meter load cannot be safely combined/);
});
