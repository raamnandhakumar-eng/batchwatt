const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require.resolve('../portfolio-interface.js'), 'utf8');

test('portfolio interface compiles and exposes learning as a primary view', () => {
  assert.doesNotThrow(() => new vm.Script(source));
  assert.match(source, /data-nav=.?learning|dataset\.nav='learning'/);
  assert.match(source, /\['today','orders','buy','learning','more'\]/);
});

test('portfolio interface keeps integrated decision story concise', () => {
  assert.match(source, /Integrate/);
  assert.match(source, /RUN · SHIFT · HOLD/);
  assert.match(source, /Delivery · peak · modeled cost/);
});
