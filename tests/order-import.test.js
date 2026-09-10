const test=require('node:test');
const assert=require('node:assert/strict');
const OrderImport=require('../lib/order-import');

const products=[
  {id:'ghee',name:'Cow ghee 1 L'},
  {id:'spice',name:'Sambar powder 200 g'}
];
const shift={date:'2026-09-10',start:'08:00',end:'18:00'};

test('parses tab-delimited rows copied from Excel',()=>{
  const rows=OrderImport.parseDelimited('Customer\tProduct\tQuantity\tDue\tPriority\nRavi Stores\tCow ghee 1 L\t40\t9/10/2026 3:00 PM\tHigh');
  assert.equal(rows.length,2);
  assert.deepEqual(rows[0],['Customer','Product','Quantity','Due','Priority']);
  assert.equal(rows[1][2],'40');
});

test('parses quoted CSV safely',()=>{
  const rows=OrderImport.parseDelimited('Customer,Product,Quantity,Due\n"Ravi, Downtown","Cow ghee 1 L",40,"2026-09-10 15:00"');
  assert.equal(rows[1][0],'Ravi, Downtown');
  assert.equal(rows[1][1],'Cow ghee 1 L');
});

test('auto maps common customer order headers',()=>{
  const mapping=OrderImport.autoMap(['Client','SKU','Order Qty','Delivery Date','Urgency','Reference']);
  assert.equal(mapping.customer,0);
  assert.equal(mapping.product,1);
  assert.equal(mapping.qty,2);
  assert.equal(mapping.due,3);
  assert.equal(mapping.priority,4);
  assert.equal(mapping.orderId,5);
});

test('builds valid orders and defaults blank priority to Standard',()=>{
  const matrix=[
    ['Customer','Product','Quantity','Due','Priority'],
    ['Ravi Stores','Cow ghee 1 L','40','2026-09-10 15:00','High'],
    ['Anand Mart','Sambar powder 200 g','25','9/10/2026 4:30 PM','']
  ];
  const built=OrderImport.buildOrders(matrix,OrderImport.autoMap(matrix[0]),{products,existingOrders:[],shift});
  assert.equal(built.valid.length,2);
  assert.equal(built.invalid.length,0);
  assert.equal(built.valid[0].draft.due,'2026-09-10T15:00');
  assert.equal(built.valid[1].draft.priority,'Standard');
});

test('rejects unknown products and bad quantities without rejecting the valid batch',()=>{
  const matrix=[
    ['Customer','Product','Quantity','Due'],
    ['Ravi Stores','Cow ghee 1 L','40','2026-09-10 15:00'],
    ['Bad Row','Unknown SKU','10','2026-09-10 16:00'],
    ['Bad Qty','Cow ghee 1 L','0','2026-09-10 17:00']
  ];
  const built=OrderImport.buildOrders(matrix,OrderImport.autoMap(matrix[0]),{products,existingOrders:[],shift});
  assert.equal(built.valid.length,1);
  assert.equal(built.invalid.length,2);
  assert.match(built.invalid[0].errors.join(' '),/not in BatchWatt setup/);
  assert.match(built.invalid[1].errors.join(' '),/Quantity/);
});

test('rejects a duplicate loaded order',()=>{
  const matrix=[['Customer','Product','Quantity','Due'],['Ravi Stores','Cow ghee 1 L','40','2026-09-10 15:00']];
  const existing=[{id:'ORD-1',customer:'Ravi Stores',productId:'ghee',qty:40,due:'2026-09-10T15:00',priority:'High'}];
  const built=OrderImport.buildOrders(matrix,OrderImport.autoMap(matrix[0]),{products,existingOrders:existing,shift});
  assert.equal(built.valid.length,0);
  assert.equal(built.invalid.length,1);
  assert.match(built.invalid[0].errors.join(' '),/already loaded/);
});
