const fs = require('node:fs');
const path = require('node:path');

require('./build.js');

const root = path.join(__dirname, '..');
const out = path.join(root, 'dist');

// V6 planner keeps the public browser path stable while replacing the legacy scheduling core.
fs.copyFileSync(
  path.join(root, 'lib', 'energy-planner-v6.js'),
  path.join(out, 'lib', 'energy-planner.js'),
);

for (const file of ['lib/factory-learning.js', 'factory-workspaces-core.js', 'factory-workspaces-ui.js', 'release-policy-v6.js', 'factory-v6-config.js', 'energy-basis-v6.js', 'factory-learning-ui.js']) {
  fs.appendFileSync(path.join(out, 'ops-app.js'), `\n\n${fs.readFileSync(path.join(root, file), 'utf8')}\n`);
}
for (const file of ['factory-workspaces.css', 'factory-v6-config.css', 'energy-basis-v6.css', 'factory-learning.css']) {
  fs.appendFileSync(path.join(out, 'ops.css'), `\n\n${fs.readFileSync(path.join(root, file), 'utf8')}\n`);
}

console.log('Added BatchWatt V6 whole-shift scheduling, partial release, multi-factory workspaces, multi-line product configuration, energy-load basis protection and per-factory order learning.');
