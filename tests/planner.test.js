const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createPlan, parseWhatsappOrders, parseStockCsv, demandChargeSavingForToday } = require('../lib/planner');
const base = {
  whatsappText: 'A: 10 jars 500ml today\nB: 10 jars 500ml tomorrow',
  stockCsv: 'sku,finished_units,packaging_units,last_known\nGHEE_500ML,5,8,false',
  billText: 'no demand charge'
};
test('finished stock and packaging are allocated once across orders', () => {
  const plan = createPlan(base);
  assert.deepEqual(plan.dispatchPlan.map(r => r.dispatchFromStock), [5, 0]);
  assert.deepEqual(plan.dispatchPlan.map(r => r.packagingReservedUnits), [5, 3]);
  assert.deepEqual(plan.dispatchPlan.map(r => r.packagingShortageUnits), [0, 7]);
  assert.equal(plan.summary.unitsToProduce, 15);
  assert.equal(plan.dispatchPlan[1].decision, 'resolve_packaging');
  assert.ok(plan.dispatchPlan[1].reasons.some(reason => reason.includes('7 additional')));
  assert.ok(plan.exceptions.some(e => e.issue === 'packaging_shortage'));
  assert.deepEqual(createPlan(base), plan, 'planning must not mutate caller inputs');
});
test('stock-only orders produce no modeled machine load', () => {
  const plan = createPlan({ ...base, stockCsv: base.stockCsv.replace('5,8', '30,8') });
  assert.equal(plan.energyReceipt.fastPeakKw, 0);
  assert.equal(plan.energyReceipt.electricityKwh, 0);
  assert.deepEqual(plan.fastProfile, []);
});
test('product sizes are not mistaken for order quantities', () => {
  const parsed = parseWhatsappOrders('A: 500ml ghee 30 jars today\nB: 500ml ghee today');
  assert.deepEqual(parsed.orders.map(o => o.units), [30]);
  assert.ok(parsed.exceptions.some(e => e.issue === 'unknown_quantity'));
});
test('reject negative and fractional unit quantities', () => {
  assert.equal(parseWhatsappOrders('A: -10 jars 500ml today\nB: 1.5 jars 500ml today').orders.length, 0);
});
test('case size and unknown dates are explicit assumptions', () => {
  const result = parseWhatsappOrders('A: 2 cases 500ml');
  assert.equal(result.orders[0].units, 48);
  assert.deepEqual(result.exceptions.map(e => e.issue), ['case_size_assumed', 'due_date_assumed']);
});
test('duplicate and invalid stock balances require review', () => {
  const result = parseStockCsv('sku,finished_units,packaging_units\nGHEE_500ML,5,8\nGHEE_500ML,100,100\nGHEE_1L,-5,10');
  assert.equal(result.stock.GHEE_500ML.finishedUnits, 5);
  assert.equal(result.stock.GHEE_1L.finishedUnits, 0);
  assert.equal(result.exceptions.length, 2);
});
test('no demand savings when the monthly peak is already higher', () => {
  const result = demandChargeSavingForToday(70, 50, { monthlyPeakSoFarKw: 90, demandChargePerKw: 350 });
  assert.equal(result.high, 0);
  assert.equal(result.wouldSetNewMonthlyPeak, false);
});
test('invalid input fails with a useful error', () => {
  assert.throws(() => createPlan(null), /input object/);
});
