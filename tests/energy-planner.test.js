const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createEnergyPlan } = require('../lib/energy-planner');
const reports = require('../lib/energy-reports');
const handler = require('../api/generate-plan');
const demo = require('../samples/energy-demo.json');
const fresh = () => JSON.parse(JSON.stringify(demo));
test('demo lowers peak without dropping work or worsening any dispatch', () => {
  const input=fresh(), before=JSON.stringify(input), r=createEnergyPlan(input);
  assert.equal(r.baseline.peakKw,82);assert.equal(r.proposed.peakKw,40);
  assert.equal(r.proposed.jobs.length,r.baseline.jobs.length);
  assert.equal(r.proposed.lateOrders,0);assert.equal(r.proposed.unscheduled.length,0);
  assert.equal(r.baseline.kwh,r.proposed.kwh,'shifting timing must not invent kWh savings');
  assert.equal(r.comparison.conditionalDemandSaving,555);
  assert.equal(JSON.stringify(input),before,'input is immutable');
});
test('cost-aware decisions explain what to produce and when without worsening dispatch', () => {
  const r=createEnergyPlan(fresh());
  assert.equal(r.schemaVersion,'2.1');
  assert.equal(r.decisions.length,r.proposed.jobs.length);
  assert.ok(r.objective.some(x=>x.includes('due times')));
  assert.ok(r.objective.some(x=>x.includes('cost')));
  assert.ok(r.comparison.totalModeledOperatingSaving>=0);
  for(const d of r.decisions){
    const proposed=r.proposed.jobs.find(j=>j.id===d.orderId);
    const baseline=r.baseline.jobs.find(j=>j.id===d.orderId);
    assert.equal(d.recommendedStart,proposed.startTime);
    assert.ok(proposed.lateMinutes<=baseline.lateMinutes);
    assert.ok(typeof d.reason==='string'&&d.reason.length>10);
  }
});
test('shared finished stock and packaging are consumed once per product', () => {
  const input=fresh();input.orders=[{...input.orders[0],qty:100},{...input.orders[0],id:'second',qty:100,due:'2026-09-09T14:00'}];input.products[0].packaging=100;
  const r=createEnergyPlan(input);
  assert.deepEqual(r.allocations.map(o=>o.fromStock),[50,0]);
  assert.deepEqual(r.allocations.map(o=>o.packagingShort),[0,50]);
  assert.equal(r.proposed.unscheduled[0].id,'second');
});
test('machine runs never overlap on the same line or leave the shift', () => {
  const r=createEnergyPlan(fresh());
  for(const line of demo.lines){const jobs=r.proposed.jobs.filter(j=>j.lineId===line.id).sort((a,b)=>a.start-b.start);jobs.forEach((j,i)=>{assert.ok(j.start>=480&&j.end<=1080);if(i)assert.ok(j.start>=jobs[i-1].end);});}
});
test('power profile accounts for base load and all scheduled jobs', () => {
  const r=createEnergyPlan(fresh());
  for(const slot of r.proposed.profile){const expected=8+r.proposed.jobs.filter(j=>j.start<=slot.minute&&j.end>slot.minute).reduce((sum,j)=>sum+j.kw,0);assert.equal(slot.kw,expected);}
});
test('capacity shortages remain visible rather than vanishing from exports', () => {
  const input=fresh();input.shift.end='09:00';const r=createEnergyPlan(input);
  assert.ok(r.proposed.unscheduled.length>0);
  assert.equal(reports.dispatchRows(r).length,input.orders.length);
  assert.ok(reports.csv(r).includes('Blocked'));
});
test('impossible target is flagged without changing real power ratings', () => {
  const input=fresh();input.energy.peakLimitKw=10;const r=createEnergyPlan(input);
  assert.ok(r.proposed.overloadSlots>0);assert.ok(r.warnings.some(w=>w.includes('target exceeded')));
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
  assert.equal(r.proposed.peakKw,8);assert.equal(r.proposed.jobs.length,0);
  assert.equal(r.proposed.overdueStockOrders,1);assert.equal(reports.dispatchRows(r)[0].status,'Overdue stock dispatch');
});
test('overnight tariff windows apply to the correct intervals', () => {
  const input=fresh();input.energy.peakStart='17:00';input.energy.peakEnd='09:00';const r=createEnergyPlan(input);
  assert.equal(r.proposed.profile[0].rate,0.21);assert.equal(r.proposed.profile[4].rate,0.12);assert.equal(r.proposed.profile.at(-1).rate,0.21);
});
test('invalid relationships, dates, rates and duplicate orders fail clearly', () => {
  for(const mutate of [i=>i.orders[0].productId='missing',i=>i.orders[0].due='2026-02-30T10:00',i=>i.products[0].rate=0,i=>i.lines[0].kw=-2,i=>i.orders.push({...i.orders[0]})]){const input=fresh();mutate(input);assert.throws(()=>createEnergyPlan(input));}
});
test('report escapes markup and CSV formulas from factory inputs', () => {
  const input=fresh();input.factory='<script>alert(1)</script>';input.orders[0].customer='=HYPERLINK("bad")';const r=createEnergyPlan(input);
  assert.ok(!reports.loadChart(r).includes('<script>'));assert.ok(reports.loadChart(r).includes('&lt;script&gt;'));
  assert.ok(reports.csv(r).includes("'=HYPERLINK"));assert.ok(reports.message(r).includes('Conditional monthly'));
});
test('Vercel API accepts the same structured data and rejects bad requests', async () => {
  let code,body;const res={setHeader(){},status(n){code=n;return this;},json(b){body=b;return this;}};
  await handler({method:'POST',body:fresh()},res);assert.equal(code,200);assert.equal(body.schemaVersion,'2.1');assert.equal(body.proposed.peakKw,40);
  await handler({method:'POST',body:{...fresh(),orders:[{id:'bad'}]}},res);assert.equal(code,400);
  await handler({method:'GET'},res);assert.equal(code,405);
});
test('tight deadlines retain delivery performance for each scheduled order', () => {
  const input=fresh();input.orders.forEach(o=>o.due='2026-09-09T11:00');const r=createEnergyPlan(input);
  for(const j of r.proposed.jobs){const baseline=r.baseline.jobs.find(b=>b.id===j.id);assert.ok(j.lateMinutes<=baseline.lateMinutes);}
});
