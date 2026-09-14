const fs = require('node:fs');
const path = require('node:path');

require('./build.js');

const root = path.join(__dirname, '..');
const out = path.join(root, 'dist');
for (const file of ['factory-workspaces-core.js', 'factory-workspaces-ui.js']) {
  fs.appendFileSync(path.join(out, 'ops-app.js'), `\n\n${fs.readFileSync(path.join(root, file), 'utf8')}\n`);
}
fs.appendFileSync(
  path.join(out, 'ops.css'),
  `\n\n${fs.readFileSync(path.join(root, 'factory-workspaces.css'), 'utf8')}\n`,
);
console.log('Added BatchWatt V5.3 multi-workspace layer.');
