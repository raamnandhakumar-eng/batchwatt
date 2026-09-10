/* Two one-click BatchWatt operator demos grounded in the recorded pilot contexts. */
'use strict';
(function(){
  const clone = x => JSON.parse(JSON.stringify(x));

  function dated(base, date){
    const x = clone(base);
    x.shift.date = date;
    (x.orders || []).forEach(o => { o.due = date + String(o.due).slice(10); });
    return x;
  }

  function rkgDemo(){
    const d = dated(window.BATCHWATT_DEMO, localDate());
    d.factory = 'RKG Ghee — demo workspace';
    d.energy = {...d.energy, baseKw:18, peakLimitKw:116, monthlyPeakKw:110, rate:0.12, peakRate:0.24, peakStart:'16:00', peakEnd:'19:00', demandRate:15};
    d.orders = [
      {id:'RKG-D01',customer:'Distributor A',productId:'ghee',qty:310,due:`${d.shift.date}T12:30`,priority:'Urgent'},
      {id:'RKG-D02',customer:'Retail chain',productId:'bulk',qty:120,due:`${d.shift.date}T15:30`,priority:'High'},
      {id:'RKG-D03',customer:'Distributor B',productId:'ghee',qty:180,due:`${d.shift.date}T17:30`,priority:'Standard'}
    ];
    d.purchaseOrders = [];
    return d;
  }

  function prDemo(){
    const d = dated(window.BATCHWATT_DEMO, localDate());
    d.factory = 'PR Food Products — demo workspace';
    d.energy = {...d.energy, baseKw:20, peakLimitKw:143, monthlyPeakKw:136, rate:0.11, peakRate:0.23, peakStart:'15:30', peakEnd:'19:30', demandRate:16};
    d.orders = [
      {id:'PR-D01',customer:'Distributor South',productId:'spice',qty:360,due:`${d.shift.date}T12:00`,priority:'Urgent'},
      {id:'PR-D02',customer:'Modern retail',productId:'snack',qty:420,due:`${d.shift.date}T14:30`,priority:'High'},
      {id:'PR-D03',customer:'Wholesale account',productId:'ghee',qty:220,due:`${d.shift.date}T17:00`,priority:'Standard'}
    ];
    const spice = d.materials.find(m => m.id === 'spice-base');
    if(spice) spice.stock = 42;
    const snack = d.materials.find(m => m.id === 'snack-base');
    if(snack) snack.stock = 70;
    d.purchaseOrders = [
      {id:'PR-PO-DEMO',supplierId:'supplier-1',materialId:'spice-base',qty:45,unitCost:1.5,expectedDate:d.shift.date,status:'Ordered',receivedQty:0,notes:'Demo incoming material',receipts:[]}
    ];
    return d;
  }

  window.BATCHWATT_DEMOS = {
    rkg: {
      title:'RKG Ghee',
      subtitle:'Peak-load + dispatch pressure',
      prompt:'Protect urgent dispatches while keeping the production sequence inside the configured peak target.',
      input:rkgDemo,
      evidence:{cycles:10,orders:32,skus:6,planning:'64.2% lower',energy:'8.8% estimated reduction',peak:'11.7% lower',rating:'4.34 / 5'},
      note:'Recorded pilot metrics; the one-click workspace below is an illustrative demo, not a replay of the original source files.'
    },
    pr: {
      title:'PR Food Products',
      subtitle:'Procurement + production coordination',
      prompt:'Coordinate material availability, machine sequence, dispatch timing, and peak exposure in one shift plan.',
      input:prDemo,
      evidence:{cycles:9,orders:41,skus:8,planning:'62.3% lower',energy:'6.7% estimated reduction',peak:'9.0% lower',rating:'4.26 / 5'},
      note:'Recorded pilot metrics; the one-click workspace below is an illustrative demo, not a replay of the original source files.'
    }
  };
})();
