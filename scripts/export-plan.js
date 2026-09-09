#!/usr/bin/env node
// Reproducible local reporting; customer inputs never leave this machine.
const fs = require('node:fs');
const path = require('node:path');
const { createPlan } = require('../lib/planner');
const { coverageSvg, csv } = require('../lib/insights');
const inputPath = process.argv[2];
const outputPath = process.argv[3] || 'output';
if (!inputPath) {
  console.error('Usage: node scripts/export-plan.js input.json [output-directory]');
  process.exit(1);
}
try {
  const result = createPlan(JSON.parse(fs.readFileSync(inputPath, 'utf8')));
  const workspace = {
    name: 'BatchWatt dispatch plan',
    orders: result.dispatchPlan.map((r, i) => ({
      id: `ORD-${i + 1}`, customer: r.customer, product: r.productName,
      qty: r.orderUnits, stock: r.dispatchFromStock, shortage: r.produceUnits,
      unit: 'units', due: r.dueDays === 0 ? 'Today' : r.dueDays === 1 ? 'Tomorrow' : 'Due date needs confirmation',
      priority: r.dueDays === 0 ? 'Urgent' : 'Standard',
      risk: r.produceUnits > 0 || r.packagingShortageUnits > 0,
      action: r.reasons.join(' ')
    }))
  };
  fs.mkdirSync(outputPath, { recursive: true });
  const files = {
    'plan.json': JSON.stringify(result, null, 2),
    'dispatch-plan.csv': csv(workspace),
    'stock-coverage.svg': coverageSvg(workspace),
    'floor-message.txt': result.whatsappSummary
  };
  for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(outputPath, name), content);
  console.log(`Exported ${result.summary.ordersParsed} orders and ${result.exceptions.length} review items to ${outputPath}.`);
} catch (error) {
  console.error(`Could not export plan: ${error.message}`);
  process.exitCode = 1;
}
