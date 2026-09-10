/* Material requirements, purchase planning, and receipts. Shared with the API. */
(function(root){
  'use strict';
  const round=n=>Math.round((n+Number.EPSILON)*10000)/10000;
  const number=(value,label,positive=false)=>{const n=Number(value);if(value===''||value==null||!Number.isFinite(n)||n<0||(positive&&n===0))throw new Error(`${label} must be ${positive?'positive':'zero or greater'}.`);return n;};
  const dateValid=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
  function validateProcurement(input){
    for(const key of ['suppliers','materials','recipes','purchaseOrders']){
      if(input[key]!==undefined&&!Array.isArray(input[key]))throw new Error(`${key} must be a list.`);
      const rows=input[key]||[];
      if(rows.length>500)throw new Error(`Use up to 500 ${key} per workspace.`);
      if(rows.some(r=>!r||typeof r.id!=='string'||!r.id)||new Set(rows.map(r=>r.id)).size!==rows.length)throw new Error(`${key} require unique IDs.`);
    }
    const suppliers=input.suppliers||[],materials=input.materials||[],recipes=input.recipes||[];
    suppliers.forEach(s=>{if(!String(s.name||'').trim())throw new Error('Supplier needs a name.');const days=number(s.leadDays,`${s.name} lead time`);if(!Number.isInteger(days))throw new Error('Supplier lead time must be whole days.');});
    materials.forEach(m=>{if(!String(m.name||'').trim()||!String(m.unit||'').trim())throw new Error('Each material needs a name and unit.');['stock','reorderPoint','unitCost'].forEach(k=>number(m[k],`${m.name} ${k}`));if(m.supplierId&&!suppliers.some(s=>s.id===m.supplierId))throw new Error(`${m.name}: select an existing supplier.`);});
    const pairs=new Set();
    recipes.forEach(r=>{if(!input.products.some(p=>p.id===r.productId)||!materials.some(m=>m.id===r.materialId))throw new Error('Each recipe row needs an existing product and material.');number(r.perUnit,'Material quantity per finished unit',true);const key=r.productId+'|'+r.materialId;if(pairs.has(key))throw new Error('Combine duplicate material rows in a product recipe.');pairs.add(key);});
    (input.purchaseOrders||[]).forEach(po=>{if(!suppliers.some(s=>s.id===po.supplierId)||!materials.some(m=>m.id===po.materialId))throw new Error('Purchase orders need an existing supplier and material.');number(po.qty,'Purchase quantity',true);number(po.unitCost,'Purchase unit cost');const received=number(po.receivedQty??0,'Received quantity');if(received>Number(po.qty))throw new Error('Received quantity cannot exceed the purchase quantity.');if(!dateValid(po.expectedDate))throw new Error('Purchase order needs a valid expected date.');if(!['Draft','Ordered','Part received','Received','Cancelled'].includes(po.status))throw new Error('Invalid purchase-order status.');if(po.status==='Received'&&received!==Number(po.qty))throw new Error('A received purchase order must be fully received.');if(['Draft','Cancelled','Ordered'].includes(po.status)&&received!==0)throw new Error('Purchase order receipt status is inconsistent.');if(po.status==='Part received'&&!(received>0&&received<Number(po.qty)))throw new Error('Partial receipt quantity is inconsistent.');});
  }
  function planMaterials(input,allocations){
    validateProcurement(input);
    const materials=input.materials||[],recipes=input.recipes||[],purchaseOrders=input.purchaseOrders||[];
    const remaining=new Map(materials.map(m=>[m.id,Number(m.stock)]));
    const required=new Map(materials.map(m=>[m.id,0]));
    const byOrder=new Map(),unmodeled=[];
    for(const order of allocations){
      const recipe=recipes.filter(r=>r.productId===order.productId);
      if(order.produce>0&&!recipe.length)unmodeled.push(order.id);
      const needs=recipe.map(r=>{const m=materials.find(m=>m.id===r.materialId),qty=round(order.produce*Number(r.perUnit));required.set(m.id,required.get(m.id)+qty);return {materialId:m.id,name:m.name,unit:m.unit,qty,available:remaining.get(m.id),shortage:round(Math.max(0,qty-remaining.get(m.id)))};});
      const shortages=needs.filter(n=>n.shortage>0);
      // A held batch does not reserve partial ingredients from other runnable batches.
      if(!shortages.length&&!order.packagingShort)needs.forEach(n=>remaining.set(n.materialId,round(remaining.get(n.materialId)-n.qty)));
      byOrder.set(order.id,{needs,shortages,recipeMissing:order.produce>0&&!recipe.length});
    }
    const requirements=materials.map(m=>{
      const needed=round(required.get(m.id)),incoming=purchaseOrders.filter(po=>po.materialId===m.id&&['Ordered','Part received'].includes(po.status)).reduce((sum,po)=>sum+Number(po.qty)-Number(po.receivedQty||0),0);
      const drafted=purchaseOrders.filter(po=>po.materialId===m.id&&po.status==='Draft').reduce((sum,po)=>sum+Number(po.qty),0);
      const toBuy=round(Math.max(0,needed+Number(m.reorderPoint)-Number(m.stock)-incoming-drafted));
      return {materialId:m.id,name:m.name,unit:m.unit,required:needed,stock:Number(m.stock),shortage:round(Math.max(0,needed-Number(m.stock))),incoming:round(incoming),drafted:round(drafted),reorderPoint:Number(m.reorderPoint),toBuy,estimatedCost:round(toBuy*Number(m.unitCost)),supplierId:m.supplierId||'',supplier:(input.suppliers||[]).find(s=>s.id===m.supplierId)?.name||'Choose supplier'};
    });
    return {byOrder,requirements,unmodeled,totalEstimatedPurchaseCost:round(requirements.reduce((sum,m)=>sum+m.estimatedCost,0))};
  }
  function receivePurchase(input,poId,quantity,receivedAt=new Date().toISOString()){
    validateProcurement(input);
    const qty=number(quantity,'Receipt quantity',true),copy=JSON.parse(JSON.stringify(input));
    const po=copy.purchaseOrders.find(po=>po.id===poId);
    if(!po||!['Ordered','Part received'].includes(po.status))throw new Error('Only ordered purchases can be received.');
    const remaining=round(Number(po.qty)-Number(po.receivedQty||0));if(qty>remaining)throw new Error(`Only ${remaining} units remain on this purchase order.`);
    const material=copy.materials.find(m=>m.id===po.materialId);
    material.stock=round(Number(material.stock)+qty);po.receivedQty=round(Number(po.receivedQty||0)+qty);
    po.status=po.receivedQty===Number(po.qty)?'Received':'Part received';
    po.receipts=[...(po.receipts||[]),{qty,receivedAt}];
    return copy;
  }
  const api={validateProcurement,planMaterials,receivePurchase};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BatchWattProcurement=api;
})(typeof globalThis!=='undefined'?globalThis:this);
