const { test } = require('node:test');
const assert = require('node:assert/strict');
const localContext = require('../lib/shift-ai-context');

function sample() {
  return {
    input: {
      factory: 'Sample dairy',
      shift: { date: '2026-10-22', start: '08:00', end: '17:00' },
      energy: { currency: 'USD', peakLimitKw: 120 },
      products: [{ id: 'a', name: 'Jar ghee' }],
      orders: [{ id: 'ORDER-1', productId: 'a', priority: 'Urgent' }]
    },
    plan: {
      baseline: { jobs: [], peakKw: 100, kwh: 220, usageCost: 50, demandExposure: 0 },
      proposed: { jobs: [], peakKw: 100, kwh: 220, usageCost: 50, demandExposure: 0 },
      holds: [{ orderId: 'ORDER-1', product: 'Jar ghee', priority: 'Urgent',
        reason: 'Packaging unavailable' }],
      allocations: [],
      energyInput: { intervalsUsed: 0, shiftIntervals: 36 },
      comparison: { shiftedJobs: 0 }
    }
  };
}
test('returns null when no computed plan is available', () => {
  assert.equal(localContext.context(sample().input, null), null);
});
test('provides bounded, referenced operational facts to local model', () => {
  const { input, plan } = sample();
  const c = localContext.context(input, plan);
  assert.equal(c.facts.scope.factory, 'Sample dairy');
  assert.equal(c.facts.evidence.noActualProductionOrMeterVerification, true);
  assert.equal(c.facts.highPriorityRecords[0].ref, 'R1');
  assert.equal(c.sources[0].orderId, 'ORDER-1');
  assert.equal(c.facts.metrics.holds, 1);
  assert.ok(c.key.length > 50);
});
test('prompts prevent fabricated approvals and distinguish monthly charge exposure', () => {
  const { input, plan } = sample();
  const msg = localContext.messages(localContext.context(input, plan), 'risks');
  assert.match(msg[0].content, /Do not invent/);
  assert.match(msg[0].content, /monthly billed peak/);
  assert.match(msg[1].content, /R1/);
  assert.throws(() => localContext.messages(localContext.context(input, plan), 'approve'), /Unknown analyst task/);
});
