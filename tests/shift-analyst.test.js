const { test } = require('node:test');
const assert = require('node:assert/strict');
const analyst = require('../lib/shift-analyst');

function fixtures() {
  const input = {
    factory: 'Test dairy',
    shift: { date: '2026-10-22', start: '08:00', end: '16:00' },
    energy: { currency: 'USD', peakLimitKw: 100 },
    products: [{ id: 'ghee', name: 'Ghee 1L' }, { id: 'bulk', name: 'Bulk ghee' }],
    orders: [
      { id: 'A', productId: 'ghee', priority: 'Urgent' },
      { id: 'B', productId: 'ghee', priority: 'Standard' },
      { id: 'C', productId: 'bulk', priority: 'High' }
    ],
    inventoryCountedAt: '2026-10-21T20:00'
  };
  const plan = {
    baseline: { jobs: [{ id: 'B' }, { id: 'C' }], peakKw: 112, kwh: 250, usageCost: 80, demandExposure: 120 },
    proposed: {
      jobs: [{ id: 'B', product: 'Ghee 1L', priority: 'Standard', lateMinutes: 30 },
        { id: 'C', product: 'Bulk ghee', priority: 'High', lateMinutes: 0 }],
      peakKw: 94, kwh: 248, usageCost: 70, demandExposure: 0,
      lateOrders: 1, overdueStockOrders: 0
    },
    holds: [{ orderId: 'A', product: 'Ghee 1L', priority: 'Urgent', reasonCode: 'PACKAGING',
      reason: 'Short 40 packaging units.' }],
    allocations: [],
    comparison: { shiftedJobs: 1 },
    energyInput: { intervalsUsed: 24, shiftIntervals: 32 }
  };
  return { input, plan };
}

test('needs a valid plan before reporting operational findings', () => {
  const a = analyst.analyze({ factory: 'Empty dairy', orders: [] }, null);
  assert.equal(a.ready, false);
  assert.equal(a.risks.length, 0);
  assert.match(analyst.answer(a, 'What next?').body, /Generate/);
});

test('ranks urgent holds ahead of lateness and calculates order-count mix', () => {
  const { input, plan } = fixtures();
  const original = JSON.stringify({ input, plan });
  const a = analyst.analyze(input, plan);
  assert.equal(a.ready, true);
  assert.equal(a.metrics.holds, 1);
  assert.equal(a.metrics.atRiskOrders, 2);
  assert.equal(a.metrics.onTime, 1);
  assert.equal(a.metrics.peakDelta, 18);
  assert.equal(a.risks[0].orderId, 'A');
  assert.equal(a.risks[0].level, 'critical');
  assert.equal(a.mix[0].name, 'Ghee 1L');
  assert.equal(a.mix[0].count, 2);
  assert.ok(Math.abs(a.mix[0].share - 2 / 3) < 0.001);
  assert.equal(JSON.stringify({ input, plan }), original, 'analyst never mutates a plan');
});

test('reports conditional demand exposure separately from electricity cost', () => {
  const { input, plan } = fixtures();
  const a = analyst.analyze(input, plan);
  assert.equal(a.comparable, true);
  assert.equal(a.metrics.usageDelta, 10);
  assert.equal(a.metrics.demandDelta, 120);
  const cost = analyst.answer(a, 'How much will electricity cost?');
  assert.match(cost.body, /conditional monthly demand-charge exposure/i);
  assert.match(cost.body, /not a daily saving/i);
});

test('does not call plan differences efficiency savings when order sets differ', () => {
  const { input, plan } = fixtures();
  plan.proposed.jobs[1].id = 'DIFFERENT';
  const a = analyst.analyze(input, plan);
  assert.equal(a.comparable, false);
  assert.match(analyst.answer(a, 'How much money can we save?').body, /do not call these differences efficiency savings/);
});

test('flags peak target breach and poor input coverage', () => {
  const { input, plan } = fixtures();
  plan.proposed.peakKw = 108;
  input.inventoryCountedAt = '';
  const a = analyst.analyze(input, plan);
  assert.equal(a.metrics.peakBreach, true);
  assert.ok(a.actions.some(x => x.title === 'Peak target exceeded'));
  assert.ok(a.actions.some(x => x.title === 'Verify stock freshness'));
  assert.ok(a.actions.some(x => x.title === 'Improve energy input coverage'));
  assert.match(analyst.answer(a, 'What is the peak energy?').body, /exceeds the peak target/i);
});

test('late stock-only dispatch is identified without scheduled machine load', () => {
  const { input, plan } = fixtures();
  plan.allocations.push({ id: 'D', product: 'Bulk ghee', priority: 'High', produce: 0, dueMinute: 420 });
  input.orders.push({ id: 'D', productId: 'bulk', priority: 'High' });
  const a = analyst.analyze(input, plan);
  assert.ok(a.risks.some(x => x.orderId === 'D' && x.type === 'late'));
  assert.equal(a.metrics.atRiskOrders, 3);
});

test('keeps unknown inputs explicit and never presents order quantities as comparable volume', () => {
  const { input, plan } = fixtures();
  input.inventoryCountedAt = '';
  const a = analyst.analyze(input, plan);
  assert.equal(a.quality[0].status, 'unknown');
  assert.match(analyst.answer(a, 'Which product dominates my portfolio?').body, /order shares, not comparable product quantities/);
});
