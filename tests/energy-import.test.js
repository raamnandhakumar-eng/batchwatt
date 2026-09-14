const { test } = require('node:test');
const assert = require('node:assert/strict');
const energyImport = require('../lib/energy-import');
const { createEnergyPlan } = require('../lib/energy-planner');
const demo = require('../samples/energy-demo.json');
const fresh = () => JSON.parse(JSON.stringify(demo));

test('detects and validates a 15-minute interval load table', () => {
  const matrix = energyImport.parseDelimited('Time,Facility kW,Tariff rate\n08:00,20,0.12\n08:15,22,0.12\n08:30,25,0.20\n08:45,24,0.20');
  assert.equal(energyImport.detectMode(matrix[0]), 'interval');
  const mapping = energyImport.autoMap(matrix[0], 'interval');
  const built = energyImport.buildIntervalLoad(matrix, mapping, { shift: { start: '08:00', end: '09:00' } });
  assert.equal(built.valid.length, 4);
  assert.equal(built.invalid.length, 0);
  assert.equal(built.coverage, 100);
});

test('rejects duplicate and non-quarter-hour interval rows', () => {
  const matrix = energyImport.parseDelimited('Time,Facility kW\n08:00,20\n08:00,22\n08:10,24');
  const built = energyImport.buildIntervalLoad(matrix, energyImport.autoMap(matrix[0], 'interval'), { shift: { start: '08:00', end: '09:00' } });
  assert.equal(built.valid.length, 1);
  assert.equal(built.invalid.length, 2);
  assert.ok(built.invalid.some(x => x.errors.some(e => e.includes('Duplicate'))));
  assert.ok(built.invalid.some(x => x.errors.some(e => e.includes('15-minute'))));
});

test('maps a one-row energy settings table', () => {
  const matrix = energyImport.parseDelimited('Base kW,Peak target kW,Monthly peak kW,Off-peak rate,Peak rate,Peak start,Peak end,Demand charge,Currency\n18,70,60,0.13,0.28,16:00,20:00,15,USD');
  assert.equal(energyImport.detectMode(matrix[0]), 'settings');
  const built = energyImport.buildSettings(matrix, energyImport.autoMap(matrix[0], 'settings'));
  assert.equal(built.errors.length, 0);
  assert.equal(built.valid.baseKw, 18);
  assert.equal(built.valid.peakLimitKw, 70);
  assert.equal(built.valid.currency, 'USD');
});

test('planner uses imported interval load and rate at matching shift slots', () => {
  const input = fresh();
  input.energy.intervalLoad = [
    { time: '08:00', kw: 30, rate: 0.55 },
    { time: '08:15', kw: 32, rate: 0.55 }
  ];
  const result = createEnergyPlan(input);
  assert.equal(result.energyInput.intervalDataLoaded, true);
  assert.equal(result.energyInput.intervalsUsed, 2);
  assert.equal(result.baseline.profile[0].baseKw, 30);
  assert.equal(result.baseline.profile[0].rate, 0.55);
  assert.ok(result.baseline.profile[0].kw >= 30);
  assert.equal(result.baseline.profile[2].baseKw, input.energy.baseKw);
});
