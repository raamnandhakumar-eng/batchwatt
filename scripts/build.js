const fs = require('node:fs');
const path = require('node:path');

// V5.2 standardized multi-factory decision workflow.
const assets = [
  ['ops.html', 'index.html'],
  ['ops.css', 'ops.css'],
  ['order-import.css', 'order-import.css'],
  ['energy-import.css', 'energy-import.css'],
  ['ops-app.js', 'ops-app.js'],
  ['order-import-ui.js', 'order-import-ui.js'],
  ['energy-import-ui.js', 'energy-import-ui.js'],
  ['planner.html', 'planner-v2.html'],
  ['planner.css', 'planner.css'],
  ['planner-app.js', 'planner-app.js'],
  ['demo-data.js', 'demo-data.js'],
  ['lib/procurement.js', 'lib/procurement.js'],
  ['lib/energy-planner.js', 'lib/energy-planner.js'],
  ['lib/energy-reports.js', 'lib/energy-reports.js'],
  ['lib/operations.js', 'lib/operations.js'],
  ['lib/order-import.js', 'lib/order-import.js'],
  ['lib/energy-import.js', 'lib/energy-import.js'],
  ['node_modules/exceljs/dist/exceljs.min.js', 'exceljs.min.js'],
];

const out = path.join(__dirname, '..', 'dist');
fs.rmSync(out, { recursive: true, force: true });

for (const [source, destination] of assets) {
  const target = path.join(out, destination);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(__dirname, '..', source), target);
}

for (const moduleName of ['demo-scenarios.js', 'unified-console.js', 'decision-console-v4.js', 'pilot-results-tab.js', 'katana-workspace.js', 'generic-default-workspace.js', 'operational-pipeline.js', 'integration-summary.js', 'decision-trace.js', 'decision-trace-render.js', 'planner-experience.js', 'standard-logic-ui.js', 'factory-profiles.js', 'factory-profiles-guard.js']) {
  fs.appendFileSync(
    path.join(out, 'ops-app.js'),
    `\n\n${fs.readFileSync(path.join(__dirname, '..', moduleName), 'utf8')}\n`,
  );
}
for (const styleName of ['unified-console.css', 'decision-console-v4.css', 'pilot-results-tab.css', 'katana-workspace.css', 'theme-blue.css', 'operational-pipeline.css', 'integration-summary.css', 'decision-trace.css', 'planner-experience.css', 'factory-profiles.css']) {
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

console.log(`Built ${assets.length} BatchWatt V5.2 assets with reusable factory profiles and standardized decisions.`);
