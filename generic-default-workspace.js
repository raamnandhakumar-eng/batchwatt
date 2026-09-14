/* Keep demos out of the default saved workspace. */
'use strict';
(function(){
  const priorLoadState = loadState;

  function genericWorkspace(){
    const date = localDate();
    return {
      factory: 'Factory workspace',
      shift: { date, start: '08:00', end: '18:00' },
      energy: {
        currency: 'USD',
        baseKw: 20,
        peakLimitKw: 100,
        monthlyPeakKw: 80,
        rate: 0.12,
        peakRate: 0.24,
        peakStart: '16:00',
        peakEnd: '20:00',
        demandRate: 15
      },
      lines: [
        { id: 'line-1', name: 'Production line 1', kw: 25, changeoverMinutes: 15 }
      ],
      products: [
        { id: 'product-a', name: 'Product A', unit: 'units', lineId: 'line-1', rate: 100, stock: 0, packaging: 1000 }
      ],
      orders: [],
      suppliers: [
        { id: 'supplier-1', name: 'Primary supplier', contact: '', leadDays: 2 }
      ],
      materials: [
        { id: 'material-1', name: 'Primary material', unit: 'units', stock: 1000, reorderPoint: 100, unitCost: 1, supplierId: 'supplier-1' }
      ],
      recipes: [
        { id: 'recipe-1', productId: 'product-a', materialId: 'material-1', perUnit: 1 }
      ],
      purchaseOrders: []
    };
  }

  function isDemoWorkspace(data){
    const name = String(data?.factory || '').toLowerCase();
    return name === 'demo food factory' || name.includes('demo workspace') || name === 'rkg ghee' || name === 'pr food products';
  }

  loadState = function(){
    priorLoadState();
    if(!input || isDemoWorkspace(input)){
      input = genericWorkspace();
      workflow = { items: {}, release: null };
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ input, isDemo: false }));
        localStorage.setItem(OPS_KEY, JSON.stringify(workflow));
      } catch {}
    }
  };
})();
