const fs = require('node:fs');
const path = require('node:path');

// V3.2 simple operator console is the default app. V2 remains available for detailed setup.
const assets = [
  ['ops.html', 'index.html'],
  ['ops.css', 'ops.css'],
  ['ops-app.js', 'ops-app.js'],
  ['planner.html', 'planner-v2.html'],
  ['planner.css', 'planner.css'],
  ['planner-app.js', 'planner-app.js'],
  ['demo-data.js', 'demo-data.js'],
  ['lib/procurement.js', 'lib/procurement.js'],
  ['lib/energy-planner.js', 'lib/energy-planner.js'],
  ['lib/energy-reports.js', 'lib/energy-reports.js'],
  ['lib/operations.js', 'lib/operations.js'],
];

const out = path.join(__dirname, '..', 'dist');
fs.rmSync(out, { recursive: true, force: true });

for (const [source, destination] of assets) {
  const target = path.join(out, destination);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(__dirname, '..', source), target);
}

for (const htmlName of ['index.html', 'planner-v2.html']) {
  const htmlPath = path.join(out, htmlName);
  const portable = fs
    .readFileSync(htmlPath, 'utf8')
    .replace(/\b(href|src)="\/(?!\/)/g, '$1="./');
  fs.writeFileSync(htmlPath, portable);
}

console.log(`Built ${assets.length} BatchWatt V3.2 simple operator assets with V2 planner preserved.`);
