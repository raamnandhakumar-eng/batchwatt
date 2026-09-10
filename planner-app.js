/* BatchWatt V2: editable factory workspace, one shared planning engine. */
'use strict';
const $v2 = id => document.getElementById(id);
const esc2 = BatchWattReports.escape;
const DRAFT_KEY = 'batchwatt_v2_draft';
const HISTORY_KEY = 'batchwatt_v2_history';
let factoryData, energyResult = null, isDemo = true, history = [];
const copyData = value => JSON.parse(JSON.stringify(value));
const newId = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
const localDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const option = (id,label,current) => `<option value="${esc2(id)}" ${id===current?'selected':''}>${esc2(label)}</option>`;
const field = (collection,row,key,type='text',extra='') => `<input type="${type}" data-collection="${collection}" data-id="${esc2(row.id)}" data-field="${key}" value="${esc2(row[key])}" aria-label="${esc2(key)} for ${esc2(row.name || row.customer || row.id)}" ${extra}>`;
const removeButton = (collection,row) => `<button class="remove" data-remove="${collection}" data-id="${esc2(row.id)}" aria-label="Remove ${esc2(row.name || row.customer || row.id)}">×</button>`;
function loadDemo() {
  factoryData = copyData(window.BATCHWATT_DEMO);
  factoryData.shift.date = localDate();
  factoryData.orders.forEach(o => {o.due = localDate() + o.due.slice(10);});
  isDemo = true;
}
function persistDraft() {
  try {localStorage.setItem(DRAFT_KEY,JSON.stringify({input:factoryData,isDemo}));$v2('save-state').textContent='Draft saved on this browser. Inputs stay on this device.';}
  catch {$v2('save-state').textContent='Browser storage is unavailable or full. Back up your inputs before leaving.';}
}
function ensureProcurement() { for (const key of ['suppliers','materials','recipes','purchaseOrders']) if (!factoryData[key]) factoryData[key]=[]; }
function renderInputs() {
  ensureProcurement();
  renderProcurementInputs();
  $v2('factory-name').value = factoryData.factory;
  $v2('planning-date').value = factoryData.shift.date;
  $v2('shift-start').value = factoryData.shift.start;
  $v2('shift-end').value = factoryData.shift.end;
  $v2('mode-banner').textContent = isDemo ? 'DEMO WORKSPACE · Illustrative food-factory data. Results are modeled examples, not pilot savings.' : 'YOUR FACTORY · Device-local workspace. Enter confirmed loads, inventory and tariff values before relying on the plan.';
  $v2('order-inputs').innerHTML = factoryData.orders.map(o => `<tr><td>${field('orders',o,'customer')}</td><td><select data-collection="orders" data-id="${esc2(o.id)}" data-field="productId" aria-label="Product for ${esc2(o.id)}">${option('','Choose product',o.productId)}${factoryData.products.map(p=>option(p.id,p.name,o.productId)).join('')}</select></td><td>${field('orders',o,'qty','number','min="0.01" step="any"')}</td><td>${field('orders',o,'due','datetime-local')}</td><td><select data-collection="orders" data-id="${esc2(o.id)}" data-field="priority" aria-label="Priority for ${esc2(o.id)}">${['Standard','High','Urgent'].map(p=>option(p,p,o.priority)).join('')}</select></td><td>${removeButton('orders',o)}</td></tr>`).join('') || '<tr><td colspan="6">Add an order or paste your incoming orders below.</td></tr>';
  $v2('product-inputs').innerHTML = factoryData.products.map(p => `<tr><td>${field('products',p,'name')}</td><td>${field('products',p,'unit')}</td><td><select data-collection="products" data-id="${esc2(p.id)}" data-field="lineId" aria-label="Line for ${esc2(p.name)}">${option('','Choose line',p.lineId)}${factoryData.lines.map(l=>option(l.id,l.name,p.lineId)).join('')}</select></td><td>${field('products',p,'rate','number','min="0.01" step="any"')}</td><td>${field('products',p,'stock','number','min="0" step="any"')}</td><td>${field('products',p,'packaging','number','min="0" step="any"')}</td><td>${removeButton('products',p)}</td></tr>`).join('') || '<tr><td colspan="7">Add your products, line rates and shared stock balances.</td></tr>';
  $v2('line-inputs').innerHTML = factoryData.lines.map(l => `<tr><td>${field('lines',l,'name')}</td><td>${field('lines',l,'kw','number','min="0.01" step="any"')}</td><td>${field('lines',l,'changeoverMinutes','number','min="0" step="1"')}</td><td>${removeButton('lines',l)}</td></tr>`).join('') || '<tr><td colspan="4">Add at least one machine or production line.</td></tr>';
  const fields = [
    ['baseKw','Background load (kW)','number'],['peakLimitKw','Peak demand target (kW)','number'],['monthlyPeakKw','Month peak so far (kW)','number'],
    ['currency','Currency','text'],['rate','Off-peak rate / kWh','number'],['peakRate','Peak rate / kWh','number'],
    ['demandRate','Monthly demand rate / kW','number'],['peakStart','Peak tariff starts','time'],['peakEnd','Peak tariff ends','time']
  ];
  $v2('energy-inputs').innerHTML = fields.map(([key,label,type]) => `<label>${label}<input data-energy="${key}" type="${type}" value="${esc2(factoryData.energy[key])}" ${type==='number'?'min="0" step="any"':type==='time'?'step="900"':'maxlength="3"'}></label>`).join('');
}
function recalculate() {
  $v2('reviewed').checked = false;
  $v2('save-plan').disabled = true;
  persistDraft();
  try {
    energyResult = BatchWattEnergy.createEnergyPlan(factoryData);
    $v2('errors').hidden = true;$v2('results').hidden = false;
    renderResult();
    renderProcurementResult();
  } catch(error) {
    energyResult = null;renderProcurementResult();$v2('results').hidden = true;
    $v2('errors').hidden = false;$v2('errors').textContent=`Complete your setup to generate a plan: ${error.message}`;
  }
}
function renderResult() {
  const r = energyResult, c = r.comparison;
  const money = value => BatchWattReports.money(value,r.energy.currency);
  const rows = BatchWattReports.dispatchRows(r);
  $v2('metric-peak').textContent = `${r.proposed.peakKw} kW`;
  $v2('metric-peak-change').textContent = `${c.peakReductionKw} kW lower (${c.peakReductionPct}%) vs ${r.baseline.peakKw} kW baseline.`;
  $v2('metric-demand').textContent = money(c.conditionalDemandSaving);
  $v2('metric-usage').textContent = money(c.usageSaving);
  $v2('metric-usage-note').textContent = c.usageSaving < 0 ? `Energy cost rises by ${money(-c.usageSaving)} in this schedule. Compare with conditional demand savings.` : 'Tariff timing effect for this shift. Not a claim of lower kWh.';
  const ready = rows.filter(o => ['Scheduled','Ready from stock'].includes(o.status)).length;
  $v2('metric-dispatch').textContent = `${ready} / ${rows.length}`;
  $v2('metric-dispatch-note').textContent = `${r.proposed.unscheduled.length} blocked · ${r.proposed.lateOrders+r.proposed.overdueStockOrders} late · ${c.shiftedJobs} runs shifted`;
  $v2('load-chart').innerHTML = BatchWattReports.loadChart(r);
  $v2('energy-verdict').textContent = c.shiftedJobs ? `Move ${c.shiftedJobs} production run(s) to reduce simultaneous machine load. Proposed peak ${r.proposed.peakKw} kW against your ${r.energy.peakLimitKw} kW target.` : 'The current inputs do not produce a better schedule under the dispatch and cost checks. The baseline schedule is retained.';
  const compare = [
    ['Peak load',`${r.baseline.peakKw} kW`,`${r.proposed.peakKw} kW`],
    ['Shift electricity',`${r.baseline.kwh} kWh`,`${r.proposed.kwh} kWh`],
    ['Shift energy charge',money(r.baseline.usageCost),money(r.proposed.usageCost)],
    ['Extra demand-charge exposure¹',money(r.baseline.demandExposure),money(r.proposed.demandExposure)],
    ['Late production orders',r.baseline.lateOrders,r.proposed.lateOrders],
    ['Above target',`${r.baseline.overloadSlots*15} min`,`${r.proposed.overloadSlots*15} min`]
  ];
  $v2('comparison-rows').innerHTML=compare.map(row=>`<tr>${row.map(value=>`<td>${esc2(value)}</td>`).join('')}</tr>`).join('')+'<tr><td colspan="3"><small>¹ Increment above the month’s peak so far. Conditional monthly exposure, separate from today’s energy charge.</small></td></tr>';
  $v2('review-items').innerHTML = r.warnings.length ? `<ul class="review-list">${r.warnings.map(w=>`<li>${esc2(w)}</li>`).join('')}</ul>` : '<div class="clear-review">All loaded orders fit their dispatch deadlines. No material or packaging blocker or peak-target exceedance in this model.</div>';
  const start=BatchWattEnergy.timeMinutes(r.shift.start),length=BatchWattEnergy.timeMinutes(r.shift.end)-start;
  $v2('timeline').innerHTML=factoryData.lines.map(l=>`<div class="timeline-row"><span>${esc2(l.name)}</span><div class="timeline-track">${r.proposed.jobs.filter(j=>j.lineId===l.id).map(j=>`<span class="run-block" style="left:${(j.start-start)/length*100}%;width:${(j.end-j.start)/length*100}%" title="${esc2(`${j.product}: ${j.startTime}–${j.endTime}, ${j.produce} ${j.unit}`)}">${esc2(j.startTime)} ${esc2(j.product)}</span>`).join('')}</div></div>`).join('');
  $v2('dispatch-rows').innerHTML=rows.map(o=>`<tr><td><strong>${esc2(o.id)}</strong><small>${esc2(o.customer)}</small></td><td>${esc2(o.product)}<small>Due ${esc2(o.due.replace('T',' '))}</small></td><td>${o.fromStock} → <strong>${o.produce}</strong><small>${esc2(o.unit)}${o.packagingShort?` · ${o.packagingShort} packaging short`:''}</small></td><td>${o.start?`${o.start}–${o.end}`:'—'}<small>${esc2(o.line)}</small></td><td><span class="status ${['Scheduled','Ready from stock'].includes(o.status)?'':'bad'}">${esc2(o.status)}</span><small>${esc2(o.reason)}</small></td></tr>`).join('');
  $v2('floor-message').value=BatchWattReports.message(r);
  $v2('assumptions').innerHTML=r.assumptions.map(a=>`<li>${esc2(a)}</li>`).join('');
}
function downloadV2(content,type,name) {
  const url=URL.createObjectURL(new Blob([content],{type}));
  const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function reportSnapshot() {return {schemaVersion:'2.0',isDemo,input:copyData(factoryData),result:energyResult};}
function renderHistory() {
  $v2('saved-plans').innerHTML=history.length?history.map(s=>`<div class="saved-row"><div><strong>${esc2(s.input.factory)}</strong> <span class="tag">${s.isDemo?'DEMO':'REVIEWED'}${s.result.warnings.length?' · ISSUES NOTED':''}</span><small>${esc2(s.input.shift.date)} · ${s.result.proposed.peakKw} kW proposed peak · reviewed ${esc2(new Date(s.reviewedAt).toLocaleString())}</small></div><div class="actions"><button class="quiet" data-history="export" data-id="${esc2(s.id)}">Export snapshot</button><button class="quiet" data-history="restore" data-id="${esc2(s.id)}">Restore inputs</button><button class="quiet" data-history="delete" data-id="${esc2(s.id)}">Delete</button></div></div>`).join(''):'<p class="muted">No reviewed plans yet. Review the current plan and save a snapshot above.</p>';
}
function saveHistory() {
  try{localStorage.setItem(HISTORY_KEY,JSON.stringify(history));return true;}
  catch{$v2('save-state').textContent='The snapshot could not be stored. Download the full JSON report instead.';return false;}
}
function notice(message) {$v2('save-state').textContent=message;}
function bindV2() {
  document.addEventListener('change',event=>{
    const el=event.target;
    if(el.dataset.collection){const row=factoryData[el.dataset.collection].find(r=>r.id===el.dataset.id);row[el.dataset.field]=el.type==='number'&&el.value!==''?Number(el.value):el.value;renderInputs();recalculate();}
    else if(el.dataset.energy){factoryData.energy[el.dataset.energy]=el.type==='number'&&el.value!==''?Number(el.value):el.value.toUpperCase();recalculate();}
  });
  document.addEventListener('click',event=>{
    const remove=event.target.closest('[data-remove]');
    if(remove){const type=remove.dataset.remove,id=remove.dataset.id;
      if(type==='lines'&&factoryData.products.some(p=>p.lineId===id)){notice('Move products to another line before removing this line.');return;}
      if(type==='products'&&factoryData.orders.some(o=>o.productId===id)){notice('Remove or reassign this product’s orders first.');return;}
      if(type==='materials'&&(factoryData.recipes.some(r=>r.materialId===id)||factoryData.purchaseOrders.some(po=>po.materialId===id))){notice('Remove recipe references and retain any purchase records before removing this material.');return;}
      if(type==='suppliers'&&(factoryData.materials.some(m=>m.supplierId===id)||factoryData.purchaseOrders.some(po=>po.supplierId===id))){notice('This supplier is linked to materials or purchases. Reassign materials first; purchase-linked suppliers must be retained.');return;}
      if(type==='products'&&factoryData.recipes.some(r=>r.productId===id)){notice('Remove this product’s recipe rows first.');return;}
      factoryData[type]=factoryData[type].filter(r=>r.id!==id);renderInputs();recalculate();
    }
    const action=event.target.closest('[data-history]');
    if(action){const saved=history.find(s=>s.id===action.dataset.id);if(!saved)return;
      if(action.dataset.history==='export')downloadV2(JSON.stringify(saved,null,2),'application/json',`batchwatt-${saved.input.shift.date}-reviewed.json`);
      if(action.dataset.history==='restore'&&confirm('Replace the current draft with this snapshot’s inputs?')){factoryData=copyData(saved.input);isDemo=saved.isDemo;renderInputs();recalculate();location.hash='overview';}
      if(action.dataset.history==='delete'&&confirm('Delete this saved snapshot from this browser?')){const old=history;history=history.filter(s=>s.id!==saved.id);if(!saveHistory())history=old;renderHistory();}
    }
  });
  [['factory-name',null,'factory'],['planning-date','shift','date'],['shift-start','shift','start'],['shift-end','shift','end']].forEach(([id,group,key])=>$v2(id).addEventListener('change',e=>{(group?factoryData[group]:factoryData)[key]=e.target.value;recalculate();}));
  $v2('add-line').onclick=()=>{factoryData.lines.push({id:newId('line'),name:'New line',kw:0,changeoverMinutes:0});renderInputs();recalculate();};
  $v2('add-product').onclick=()=>{factoryData.products.push({id:newId('sku'),name:'New product',unit:'units',lineId:factoryData.lines[0]?.id||'',rate:0,stock:0,packaging:0});renderInputs();recalculate();};
  $v2('add-order').onclick=()=>{factoryData.orders.push({id:newId('order'),customer:'',productId:factoryData.products[0]?.id||'',qty:1,due:`${factoryData.shift.date}T${factoryData.shift.end}`,priority:'Standard'});renderInputs();recalculate();};
  $v2('load-demo').onclick=()=>{if(!confirm('Replace the current draft with the demo? Saved snapshots remain available.'))return;loadDemo();renderInputs();recalculate();};
  $v2('new-workspace').onclick=()=>{if(!confirm('Start a new factory draft? Back up current inputs first if needed. Saved snapshots remain available.'))return;
    factoryData={factory:'My factory',shift:{date:localDate(),start:'08:00',end:'18:00'},energy:{currency:'INR',baseKw:0,peakLimitKw:1,monthlyPeakKw:0,rate:0,peakRate:0,peakStart:'16:00',peakEnd:'19:00',demandRate:0},lines:[],products:[],orders:[]};isDemo=false;renderInputs();recalculate();location.hash='setup';};
  $v2('download-load').onclick=()=>energyResult&&downloadV2(BatchWattReports.loadChart(energyResult),'image/svg+xml','batchwatt-load-comparison.svg');
  $v2('download-plan').onclick=()=>energyResult&&downloadV2(BatchWattReports.csv(energyResult),'text/csv;charset=utf-8','batchwatt-dispatch-plan.csv');
  $v2('download-report').onclick=()=>energyResult&&downloadV2(JSON.stringify(reportSnapshot(),null,2),'application/json','batchwatt-full-report.json');
  $v2('export-inputs').onclick=()=>downloadV2(JSON.stringify({schemaVersion:'2.0',isDemo,input:factoryData},null,2),'application/json','batchwatt-inputs.json');
  $v2('restore-inputs').onchange=async event=>{try{const file=event.target.files[0];if(!file)return;if(file.size>2000000)throw new Error('Use a JSON file smaller than 2 MB.');const imported=JSON.parse(await file.text());const input=imported.input||imported;BatchWattEnergy.createEnergyPlan(input);if(!confirm('Replace current draft with the imported inputs?'))return;factoryData=copyData(input);isDemo=imported.isDemo===true;renderInputs();recalculate();}catch(e){notice(`Could not restore: ${e.message}`);}finally{event.target.value='';}};
  $v2('copy-plan').onclick=async()=>{if(!energyResult)return;try{await navigator.clipboard.writeText(BatchWattReports.message(energyResult));notice('Floor message copied. Review before sending.');}catch{$v2('floor-message').closest('details').open=true;$v2('floor-message').select();notice('Select and copy the floor message below.');}};
  $v2('reviewed').onchange=e=>{$v2('save-plan').disabled=!e.target.checked||!energyResult;};
  $v2('save-plan').onclick=()=>{if(!energyResult||!$v2('reviewed').checked)return;const old=history;history=[{...copyData(reportSnapshot()),id:newId('plan'),reviewedAt:new Date().toISOString()},...history].slice(0,8);if(!saveHistory()){history=old;return;}renderHistory();$v2('save-plan').disabled=true;notice('Reviewed snapshot saved on this browser.');};
  $v2('import-orders').onclick=()=>{
    const text=$v2('paste-orders').value.trim();if(!text){$v2('import-status').textContent='Paste at least one order.';return;}
    try{const orders=text.split(/\n/).filter(s=>s.trim()).map((line,i)=>{
      const parts=line.split('|').map(s=>s.trim());if(parts.length<4||parts.length>5)throw new Error(`Row ${i+1}: use the displayed pipe-separated format.`);
      const [customer,product,qty,due,priority='Standard']=parts;
      const matches=factoryData.products.filter(p=>p.id===product||p.name.toLowerCase()===product.toLowerCase());if(matches.length!==1)throw new Error(`Row ${i+1}: product must match one existing product name or ID.`);
      return {id:newId('order'),customer,productId:matches[0].id,qty:Number(qty),due:due.replace(' ','T'),priority:['Urgent','High','Standard'].find(p=>p.toLowerCase()===priority.toLowerCase())||priority};
    });
    BatchWattEnergy.createEnergyPlan({...factoryData,orders:[...factoryData.orders,...orders]});factoryData.orders.push(...orders);renderInputs();recalculate();$v2('import-status').textContent=`Added ${orders.length} orders. All rows were validated.`;$v2('paste-orders').value='';
    }catch(error){$v2('import-status').textContent=`Nothing added. ${error.message}`;}
  };
}
document.addEventListener('DOMContentLoaded',()=>{
  loadDemo();
  try{const saved=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');if(saved?.input&&Array.isArray(saved.input.orders)&&Array.isArray(saved.input.products)&&Array.isArray(saved.input.lines)&&saved.input.energy&&saved.input.shift){factoryData=saved.input;isDemo=saved.isDemo===true;}}catch{}
  try{const saved=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');if(Array.isArray(saved))history=saved.filter(s=>s?.input&&s?.result?.warnings&&s?.result?.proposed).slice(0,8);}catch{}
  renderInputs();bindV2();bindProcurement();recalculate();renderHistory();
});

function linkedSelect(collection,row,key,options,label) {
  return `<select data-collection="${collection}" data-id="${esc2(row.id)}" data-field="${key}" aria-label="${esc2(label)}">${option('','Choose',row[key])}${options.map(item=>option(item.id,item.name,row[key])).join('')}</select>`;
}
function renderProcurementInputs() {
  $v2('material-inputs').innerHTML=factoryData.materials.map(m=>`<tr><td>${field('materials',m,'name')}</td><td>${field('materials',m,'unit')}</td><td>${field('materials',m,'stock','number','min="0" step="any"')}</td><td>${field('materials',m,'reorderPoint','number','min="0" step="any"')}</td><td>${field('materials',m,'unitCost','number','min="0" step="any"')}</td><td>${linkedSelect('materials',m,'supplierId',factoryData.suppliers,'Supplier for '+m.name)}</td><td>${removeButton('materials',m)}</td></tr>`).join('')||'<tr><td colspan="7">Add materials and confirmed stock balances.</td></tr>';
  $v2('recipe-inputs').innerHTML=factoryData.recipes.map(r=>`<tr><td>${linkedSelect('recipes',r,'productId',factoryData.products,'Recipe product')}</td><td>${linkedSelect('recipes',r,'materialId',factoryData.materials.map(m=>({...m,name:m.name+' ('+m.unit+')'})),'Recipe material')}</td><td>${field('recipes',r,'perUnit','number','min="0.0001" step="any"')}</td><td>${removeButton('recipes',r)}</td></tr>`).join('')||'<tr><td colspan="4">Add material requirements for each product. Production without a recipe is held.</td></tr>';
  $v2('supplier-inputs').innerHTML=factoryData.suppliers.map(s=>`<tr><td>${field('suppliers',s,'name')}</td><td>${field('suppliers',s,'contact')}</td><td>${field('suppliers',s,'leadDays','number','min="0" step="1"')}</td><td>${removeButton('suppliers',s)}</td></tr>`).join('')||'<tr><td colspan="4">Add your suppliers and typical delivery lead times.</td></tr>';
  renderPurchases();
}
function renderProcurementResult() {
  const procurement=energyResult?.procurement;
  if(!procurement){$v2('procurement-rows').innerHTML='<tr><td colspan="6">Complete the order and factory inputs to calculate material requirements.</td></tr>';$v2('procurement-summary').textContent='You can create purchase orders and record receipts independently below.';return;}
  const money=value=>BatchWattReports.money(value,factoryData.energy.currency);
  const short=procurement.requirements.filter(m=>m.shortage>0).length;
  $v2('procurement-summary').innerHTML=`<div><strong>${short}</strong><span>materials short for loaded orders</span></div><div><strong>${money(procurement.totalEstimatedPurchaseCost)}</strong><span>estimated new buying requirement</span></div><div><strong>${factoryData.purchaseOrders.filter(po=>['Ordered','Part received'].includes(po.status)).length}</strong><span>open purchase orders</span></div>`;
  $v2('procurement-rows').innerHTML=procurement.requirements.map(m=>`<tr><td><strong>${esc2(m.name)}</strong><small>${esc2(m.unit)} · ${esc2(m.supplier)}</small></td><td>${m.required} / ${m.stock}<small>${m.shortage>0?`${m.shortage} short`:'Covered from stock'}</small></td><td>${m.incoming} / ${m.drafted}</td><td><strong>${m.toBuy}</strong><small>Buffer ${m.reorderPoint}</small></td><td>${money(m.estimatedCost)}</td><td>${m.toBuy>0?`<button class="quiet" data-buy="${esc2(m.materialId)}">Draft purchase</button>`:'No new purchase needed'}</td></tr>`).join('')||'<tr><td colspan="6">Add material inventory and product recipes.</td></tr>';
}
function renderPurchases() {
  $v2('purchase-rows').innerHTML=[...factoryData.purchaseOrders].reverse().map(po=>{
    const m=factoryData.materials.find(m=>m.id===po.materialId),s=factoryData.suppliers.find(s=>s.id===po.supplierId);
    return `<tr><td><strong>${esc2(po.id)}</strong><small>${esc2(s?.name||'Missing supplier')}</small></td><td>${esc2(m?.name||'Missing material')}<small>${esc2(po.notes||'')}</small></td><td>${po.qty} / ${po.receivedQty||0}<small>${esc2(m?.unit||'units')}</small></td><td>${esc2(po.expectedDate)}</td><td>${BatchWattReports.money(Number(po.qty)*Number(po.unitCost),factoryData.energy.currency)}</td><td><span class="status ${['Cancelled','Draft'].includes(po.status)?'bad':''}">${esc2(po.status)}</span><div class="actions purchase-actions">${po.status==='Draft'?`<button class="quiet" data-po-action="order" data-id="${esc2(po.id)}">Mark ordered</button><button class="quiet" data-po-action="cancel" data-id="${esc2(po.id)}">Cancel</button>`:''}${['Ordered','Part received'].includes(po.status)?`<button class="primary" data-po-action="receive" data-id="${esc2(po.id)}">Receive</button>`:''}<button class="quiet" data-po-action="export" data-id="${esc2(po.id)}">Download PO</button></div></td></tr>`;
  }).join('')||'<tr><td colspan="6">No purchase orders yet. Draft one from the buying list or create it manually.</td></tr>';
}
function openPurchase(materialId='') {
  if(!factoryData.suppliers.length||!factoryData.materials.length){notice('Add a supplier and material before drafting a purchase order.');location.hash='procurement';return;}
  const material=factoryData.materials.find(m=>m.id===materialId)||factoryData.materials[0];
  $v2('po-supplier').innerHTML=option('','Choose supplier',material.supplierId)+factoryData.suppliers.map(s=>option(s.id,s.name,material.supplierId)).join('');
  $v2('po-material').innerHTML=factoryData.materials.map(m=>option(m.id,m.name+' ('+m.unit+')',material.id)).join('');
  fillPurchase();$v2('po-notes').value='';$v2('po-error').textContent='';$v2('purchase-dialog').showModal();
}
function fillPurchase() {
  const m=factoryData.materials.find(m=>m.id===$v2('po-material').value);if(!m)return;
  $v2('po-price').value=m.unitCost;$v2('po-qty').value=energyResult?.procurement.requirements.find(r=>r.materialId===m.id)?.toBuy||1;
  const supplier=factoryData.suppliers.find(s=>s.id===$v2('po-supplier').value);
  const date=new Date(localDate()+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+Number(supplier?.leadDays||0));$v2('po-date').value=date.toISOString().slice(0,10);
}
function bindProcurement() {
  $v2('add-supplier').onclick=()=>{factoryData.suppliers.push({id:newId('supplier'),name:'New supplier',contact:'',leadDays:0});renderInputs();recalculate();};
  $v2('add-material').onclick=()=>{factoryData.materials.push({id:newId('material'),name:'New material',unit:'kg',stock:0,reorderPoint:0,unitCost:0,supplierId:factoryData.suppliers[0]?.id||''});renderInputs();recalculate();};
  $v2('add-recipe').onclick=()=>{if(!factoryData.products.length||!factoryData.materials.length){notice('Add a product and material before creating its recipe.');return;}factoryData.recipes.push({id:newId('recipe'),productId:factoryData.products[0].id,materialId:factoryData.materials[0].id,perUnit:1});renderInputs();recalculate();};
  $v2('new-purchase').onclick=()=>openPurchase();
  $v2('po-material').onchange=()=>{const m=factoryData.materials.find(m=>m.id===$v2('po-material').value);if(m?.supplierId)$v2('po-supplier').value=m.supplierId;fillPurchase();};
  $v2('po-supplier').onchange=fillPurchase;
  document.addEventListener('click',event=>{
    const close=event.target.closest('[data-close]');if(close)$v2(close.dataset.close).close();
    const buy=event.target.closest('[data-buy]');if(buy)openPurchase(buy.dataset.buy);
    const action=event.target.closest('[data-po-action]');if(!action)return;
    const po=factoryData.purchaseOrders.find(po=>po.id===action.dataset.id);if(!po)return;
    if(action.dataset.poAction==='order'&&po.status==='Draft'){po.status='Ordered';po.orderedAt=new Date().toISOString();renderInputs();recalculate();notice('Marked as ordered in your records. No message was sent to the supplier.');}
    if(action.dataset.poAction==='cancel'&&po.status==='Draft'){po.status='Cancelled';renderInputs();recalculate();}
    if(action.dataset.poAction==='export'){const supplier=factoryData.suppliers.find(s=>s.id===po.supplierId),material=factoryData.materials.find(m=>m.id===po.materialId);downloadV2(JSON.stringify({factory:factoryData.factory,currency:factoryData.energy.currency,purchaseOrder:po,supplier,material:material?.name,unit:material?.unit},null,2),'application/json',po.id+'.json');}
    if(action.dataset.poAction==='receive'){$v2('receipt-po-id').value=po.id;$v2('receipt-detail').textContent=`${po.id}: ${Number(po.qty)-Number(po.receivedQty||0)} remaining.`;$v2('receipt-qty').value=Number(po.qty)-Number(po.receivedQty||0);$v2('receipt-qty').max=Number(po.qty)-Number(po.receivedQty||0);$v2('receipt-error').textContent='';$v2('receipt-dialog').showModal();}
  });
  $v2('purchase-form').onsubmit=event=>{event.preventDefault();try{
    const po={id:newId('PO'),supplierId:$v2('po-supplier').value,materialId:$v2('po-material').value,qty:Number($v2('po-qty').value),unitCost:Number($v2('po-price').value),expectedDate:$v2('po-date').value,notes:$v2('po-notes').value,status:'Draft',receivedQty:0,createdAt:new Date().toISOString()};
    BatchWattProcurement.validateProcurement({...factoryData,purchaseOrders:[...factoryData.purchaseOrders,po]});factoryData.purchaseOrders.push(po);$v2('purchase-dialog').close();renderInputs();recalculate();notice('Purchase draft saved. Mark it ordered after placing it with your supplier.');
  }catch(error){$v2('po-error').textContent=error.message;}};
  $v2('receipt-form').onsubmit=event=>{event.preventDefault();try{factoryData=BatchWattProcurement.receivePurchase(factoryData,$v2('receipt-po-id').value,Number($v2('receipt-qty').value));$v2('receipt-dialog').close();renderInputs();recalculate();notice('Receipt recorded. Material stock and the production/energy plan have been updated.');}catch(error){$v2('receipt-error').textContent=error.message;}};
  $v2('export-procurement').onclick=()=>{if(!energyResult){notice('Generate a valid plan before exporting its buying list.');return;}const cell=value=>{let text=String(value??'');if(/^[\s]*[=+@-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};const rows=[['Material','Unit','Required','Stock','Shortage','Incoming','Drafted','New purchase','Estimated cost','Supplier'],...energyResult.procurement.requirements.map(m=>[m.name,m.unit,m.required,m.stock,m.shortage,m.incoming,m.drafted,m.toBuy,m.estimatedCost,m.supplier])];downloadV2('\uFEFF'+rows.map(r=>r.map(cell).join(',')).join('\r\n'),'text/csv;charset=utf-8','batchwatt-buying-list.csv');};
}
