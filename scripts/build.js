const fs = require('node:fs');
const path = require('node:path');

// Explicit public asset list: includes selected in-app pilot summaries; excludes raw workbooks and reports.
const assets = [
  ['planner.html', 'index.html'],
  ['planner.css', 'planner.css'],
  ['planner-app.js', 'planner-app.js'],
  ['demo-data.js', 'demo-data.js'],
  ['lib/procurement.js', 'lib/procurement.js'],
  ['lib/energy-planner.js', 'lib/energy-planner.js'],
  ['lib/energy-reports.js', 'lib/energy-reports.js'],
];

const out = path.join(__dirname, '..', 'dist');
fs.rmSync(out, { recursive: true, force: true });

for (const [source, destination] of assets) {
  const target = path.join(out, destination);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(__dirname, '..', source), target);
}

// The source app is also served at a domain root on Vercel. GitHub Pages serves this
// repository under /batchwatt/, so convert root-relative HTML assets and navigation
// into paths relative to the generated index.html. Relative paths work in both places.
const indexPath = path.join(out, 'index.html');
const portableIndex = fs
  .readFileSync(indexPath, 'utf8')
  .replace(/\b(href|src)="\/(?!\/)/g, '$1="./');
fs.writeFileSync(indexPath, portableIndex);

console.log(
  `Built ${assets.length} V2 application assets. Selected pilot summaries are embedded; raw workbooks are excluded.`,
);
