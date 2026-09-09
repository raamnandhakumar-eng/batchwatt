const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const insights = require('../lib/insights');
const app = { document: { addEventListener() {} }, BatchWattInsights: insights, console, Date, XLSX: { utils: { sheet_to_json: rows => rows } } };
vm.createContext(app);
vm.runInContext(fs.readFileSync(require.resolve('../app.js'), 'utf8'), app);
const order = { id: 'ORD-1', product: 'Ghee', customer: 'A', qty: 10, stock: 4, shortage: 6, unit: 'jars', risk: true, due: 'today', priority: 'High' };
test('bad rows are rejected even when other rows are valid', () => {
  const bad = app.parseMessageLine('A | Ghee | nope | today | high | stock 2', 1);
  assert.ok(insights.validateOrders([order, bad]).some(e => e.includes('Row 2')));
});
test('natural input ignores customer numbers and rejects product-size quantities', () => {
  assert.equal(app.parseMessageLine('Store 23 needs 40 jars of Cow Ghee tomorrow stock 10', 0).qty, 40);
  assert.ok(insights.validateOrders([app.parseMessageLine('Store needs 500ml ghee tomorrow', 0)]).length > 0);
});
test('earlier due dates outrank later dates within the review queue', () => {
  const orders = [{...order, id:'later', due:'tomorrow', priority:'Urgent'}, {...order, id:'first', due:'today', priority:'Standard'}];
  assert.equal(insights.sortedOrders({orders})[0].id, 'first');
  assert.equal(insights.dueTime('2026-02-30'), Infinity);
});
test('relative dates stay anchored to the intake date', () => {
  const reference = new Date(2026, 8, 9, 12);
  assert.equal(new Date(insights.dueTime('tomorrow', reference)).getDate(), 10);
});
test('blank spreadsheet numbers use defaults and missing metrics stay missing', () => {
  const wb = { SheetNames: ['Orders', 'Pilot Summary'], Sheets: {
    Orders: [{ Product: 'Ghee', Quantity: 10, Stock: 4 }],
    'Pilot Summary': [{ 'Baseline energy (kwh)': 100 }]
  }};
  const workspace = app.workbookToWorkspace(wb, 'orders.csv', 'Test');
  assert.equal(workspace.ordersCount, 1);
  assert.equal(workspace.orders[0].shortage, 6);
  assert.equal(workspace.energyReduction, null);
  assert.equal(workspace.atRisk, 1);
  assert.equal(app.metricReduction(0, 100, 90), 0);
});
test('ready orders remain zero-risk when the summary is absent', () => {
  const wb = { SheetNames: ['Orders'], Sheets: { Orders: [{ Product: 'Ghee', Quantity: 10, Stock: 10 }] } };
  assert.equal(app.workbookToWorkspace(wb, 'ready.csv', '').atRisk, 0);
});
test('neither plans nor WhatsApp output truncate large workspaces', () => {
  const orders = Array.from({length: 20}, (_, i) => ({...order, id: `O${i}`, product:`Product ${i}`}));
  assert.equal(app.createPlansFromOrders(orders).length, 20);
  assert.ok(app.createWhatsAppMessage({name:'Test',orders,ordersCount:20}).includes('Product 19'));
});
test('SVG escapes order text and keeps each order in its own unit', () => {
  const svg = insights.coverageSvg({ name: '<script>bad</script>', orders: [order, {...order, unit:'kg', product:'<img onerror=alert(1)>'}] });
  assert.ok(!svg.includes('<script>'));
  assert.ok(!svg.includes('<img'));
  assert.ok(svg.includes('10 jars'));
  assert.ok(svg.includes('10 kg'));
  assert.ok(!svg.includes('NaN'));
});
test('CSV includes every order and neutralizes formulas and embedded quotes', () => {
  const csv = insights.csv({ orders: [{...order, customer:'=1+1', product:'Ghee, "premium"'}] });
  assert.ok(csv.includes("'=1+1"));
  assert.ok(csv.includes('"Ghee, ""premium"""'));
});
test('partial pilot data is labeled instead of pretending to contain all orders', () => {
  assert.ok(insights.warnings({orders:[order],ordersCount:32})[0].includes('1 loaded order rows'));
});
