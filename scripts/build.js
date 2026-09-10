const fs = require('node:fs');
const path = require('node:path');

// V3.6 operator MVP is the default app. V2 remains available for detailed setup.
const assets = [
  ['ops.html', 'index.html'],
  ['ops.css', 'ops.css'],
  ['order-import.css', 'order-import.css'],
  ['ops-app.js', 'ops-app.js'],
  ['order-import-ui.js', 'order-import-ui.js'],
  ['planner.html', 'planner-v2.html'],
  ['planner.css', 'planner.css'],
  ['planner-app.js', 'planner-app.js'],
  ['demo-data.js', 'demo-data.js'],
  ['lib/procurement.js', 'lib/procurement.js'],
  ['lib/energy-planner.js', 'lib/energy-planner.js'],
  ['lib/energy-reports.js', 'lib/energy-reports.js'],
  ['lib/operations.js', 'lib/operations.js'],
  ['lib/order-import.js', 'lib/order-import.js'],
  ['node_modules/exceljs/dist/exceljs.min.js', 'exceljs.min.js'],
];

const out = path.join(__dirname, '..', 'dist');
fs.rmSync(out, { recursive: true, force: true });

for (const [source, destination] of assets) {
  const target = path.join(out, destination);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(__dirname, '..', source), target);
}

// Keep source modules small while shipping the operator dashboard and decision layers in production.
for (const moduleName of [
  'today-energy.js',
  'demo-scenarios.js',
  'demo-ui.js',
  'decision-dashboard.js',
  'production-decision-ui.js',
]) {
  fs.appendFileSync(
    path.join(out, 'ops-app.js'),
    `\n\n${fs.readFileSync(path.join(__dirname, '..', moduleName), 'utf8')}\n`,
  );
}
for (const styleName of [
  'today-energy.css',
  'demo-ui.css',
  'decision-dashboard.css',
  'production-decision-ui.css',
]) {
  fs.appendFileSync(
    path.join(out, 'ops.css'),
    `\n\n${fs.readFileSync(path.join(__dirname, '..', styleName), 'utf8')}\n`,
  );
}

for (const htmlName of ['index.html', 'planner-v2.html']) {
  const htmlPath = path.join(out, htmlName);
  const portable = fs
    .readFileSync(htmlPath, 'utf8')
    .replace(/\b(href|src)="\/(?!\/)/g, '$1="./');
  fs.writeFileSync(htmlPath, portable);
}

console.log(`Built ${assets.length} BatchWatt V3.6 operator MVP assets with dashboard, cost-aware production decisions, visible energy, bulk order intake, two demos, plan export, and V2 preserved.`);
