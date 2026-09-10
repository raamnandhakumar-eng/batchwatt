/* BatchWatt V3 operations console. Local-first operational workflow over the V2 planning engine. */
'use strict';
const $ = id => document.getElementById(id);
const DRAFT_KEY = 'batchwatt_v2_draft';
const OPS_KEY = 'batchwatt_v3_operations';
const AUDIT_KEY = 'batchwatt_v3_audit';
const ACTOR_KEY = 'batchwatt_v3_actor';
let input, result = null, workflow = {items:{},release:null}, audit = [], queueFilter = 'open';
const clone = x => JSON.parse(JSON.stringify(x));
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const money = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(Number(n||0));
const localDate = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const uid = p => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;
const actor = () => localStorage.getItem(ACTOR_KEY) || 'Shift lead';

function prepareDemo(){
  const demo=clone(window.BATCHWATT_DEMO);
  const today=localDate();
  demo.shift.date=today;
  demo.orders.forEach(o=>o.due=today+o.due.slice(10));
  return demo;
}
function loadState(){
  try{
    const draft=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');
    input=draft?.input ? draft.input : prepareDemo();
    workflow=JSON.parse(localStorage.getItem(OPS_KEY)||'null') || {items:{},release:null};
    audit=JSON.parse(localStorage.getItem(AUDIT_KEY)||'[]');
  }catch{ input=prepareDemo(); workflow={items:{},release:null}; audit=[]; }
  input.suppliers ||= []; input.materials ||= []; input.recipes ||= []; input.purchaseOrders ||= [];
}
function persist(){
  localStorage.setItem(DRAFT_KEY,JSON.stringify({input,isDemo:false}));
  localStorage.setItem(OPS_KEY,JSON.stringify(workflow));
  localStorage.setItem(AUDIT_KEY,JSON.stringify(audit.slice(0,100)));
  $('save-state').textContent='Saved on this device';
}
function log(action,detail){
  audit.unshift({id:uid('evt'),at:new Date().toISOString(),actor:actor(),action,detail});
  audit=audit.slice(0,100); persist();
}
function fail(message){ $('error').hidden=!message; $('error').textContent=message||''; }
function recalc({record=false}={}){
  persist();
  try{ result=BatchWattEnergy.createEnergyPlan(input); fail(''); if(record)log('Plan recalculated',`${input.factory} · ${input.shift.date}`); }
  catch(err){ result=null; fail(err.message); }
  renderAll();
}
function ops(){ return BatchWattOperations.summary(input,result,workflow); }
function release(){ return BatchWattOperations.releaseStatus(input,workflow); }
function statusRows(){ return result ? BatchWattReports.dispatchRows(result) : []; }

function metric(label,value,note,attention=false){ return `<article class="metric ${attention?'attention':''}"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></article>`; }
function renderOperations(){
  $('top-factory').textContent=input.factory||'Factory';
  $('shift-label').textContent=`${input.factory} · ${input.shift.date} · ${input.shift.start}–${input.shift.end}`;
  if(!result){ $('ops-metrics').innerHTML=metric('Plan status','Incomplete','Fix the highlighted setup issue',true); $('work-queue').innerHTML='<div class="empty">Complete the workspace inputs to create an operational plan.</div>'; return; }
  const s=ops(), rs=release();
  const ready=statusRows().filter(r=>['Scheduled','Ready from stock'].includes(r.status)).length;
  const headroom=s.peakHeadroomKw;
  $('ops-metrics').innerHTML=[
    metric('Dispatch ready',`${ready}/${statusRows().length}`,'Scheduled or available from stock',ready<statusRows().length),
    metric('Open exceptions',s.openCount,`${s.criticalCount} critical`,s.openCount>0),
    metric('Blocked orders',s.blockedOrders,'Must be cleared before release',s.blockedOrders>0),
    metric('Peak headroom',`${headroom} kW`,`${result.proposed.peakKw} kW planned vs ${input.energy.peakLimitKw} kW target`,headroom<0)
  ].join('');

  const strip=$('release-strip');
  strip.className='release-strip'+(rs.isReleased?' released':rs.isStale?' stale':'');
  if(rs.isReleased){ $('release-title').textContent='Shift plan released'; $('release-detail').textContent=`Released by ${rs.release.actor} at ${new Date(rs.release.at).toLocaleString()}.`; }
  else if(rs.isStale){ $('release-title').textContent='Released plan is stale'; $('release-detail').textContent='Orders, stock, tariff, or setup changed after release. Recalculate and release again.'; }
  else if(s.releasable){ $('release-title').textContent='Ready for supervisor release'; $('release-detail').textContent='No hard operational blocker remains. Release records the current plan fingerprint.'; }
  else { $('release-title').textContent='Release blocked'; $('release-detail').textContent='Clear blocked orders, critical exceptions, and peak-limit breaches first.'; }
  $('release-plan').disabled=!s.releasable || rs.isReleased;
  $('release-plan').textContent=rs.isReleased?'Released':'Release shift plan';

  renderQueue(s.items);
  const jobs=[...(result.proposed.jobs||[])].sort((a,b)=>a.start-b.start);
  $('run-board').innerHTML=jobs.length?jobs.map(j=>`<div class="run-row"><span class="run-time">${esc(j.startTime)}</span><div><strong>${esc(j.product)}</strong><small>${esc(j.line)} · ${esc(j.customer)} · ${j.produce} ${esc(j.unit)}</small></div><span class="pill ${j.lateMinutes?'critical':'ready'}">${j.lateMinutes?`${j.lateMinutes}m late`:'Ready'}</span></div>`).join(''):'<div class="empty">No production run scheduled.</div>';
  renderAudit();
}
function renderQueue(items){
  const visible=queueFilter==='open'?items.filter(i=>i.state.status!=='Resolved'):items;
  $('work-queue').innerHTML=visible.length?visible.map(i=>`<article class="work-item ${i.severity} ${i.state.status==='Resolved'?'resolved':''}">
    <span class="severity-dot"></span>
    <div class="work-main"><strong>${esc(i.title)}</strong><p>${esc(i.detail)}</p><div class="work-meta"><span class="pill ${i.severity}">${esc(i.severity.toUpperCase())}</span><span>${esc(i.type)}</span>${i.due?`<span>Due ${esc(String(i.due).replace('T',' '))}</span>`:''}<span>${esc(i.state.owner||'Unassigned')}</span><span>${esc(i.state.status)}</span></div></div>
    <div class="work-actions">${i.state.status==='Open'?`<button data-work="ack" data-id="${esc(i.id)}">Acknowledge</button>`:''}${!i.state.owner&&i.state.status!=='Resolved'?`<button data-work="assign" data-id="${esc(i.id)}">Assign</button>`:''}${i.state.status!=='Resolved'?`<button data-work="resolve" data-id="${esc(i.id)}">Resolve</button>`:''}<button data-go="${esc(i.action)}">Open</button></div>
  </article>`).join(''):'<div class="empty">No exceptions in this view.</div>';
}
function renderAudit(){
  $('audit-log').innerHTML=audit.length?audit.slice(0,20).map(e=>`<div class="audit-row"><time>${esc(new Date(e.at).toLocaleString())}</time><span>${esc(e.actor)}</span><div><strong>${esc(e.action)}</strong><br><small>${esc(e.detail)}</small></div></div>`).join(''):'<div class="empty">Operational actions will appear here.</div>';
}
function renderOrders(){
  const rows=new Map(statusRows().map(r=>[r.id,r]));
  $('orders-table').innerHTML=(input.orders||[]).map(o=>{ const p=input.products.find(p=>p.id===o.productId), r=rows.get(o.id); const ok=r&&['Scheduled','Ready from stock'].includes(r.status); return `<tr><td><strong>${esc(o.id)}</strong></td><td>${esc(o.customer)}</td><td>${esc(p?.name||o.productId)}</td><td>${o.qty}</td><td>${esc(o.due.replace('T',' '))}</td><td>${esc(o.priority)}</td><td class="${ok?'status-good':'status-bad'}">${esc(r?.status||'Needs plan')}</td><td><button data-delete-order="${esc(o.id)}">Remove</button></td></tr>`; }).join('')||'<tr><td colspan="8">No orders loaded.</td></tr>';
}
function renderProcurement(){
  if(!result){ $('materials-table').innerHTML='<tr><td colspan="6">Complete the plan to calculate material requirements.</td></tr>'; return; }
  $('materials-table').innerHTML=(result.procurement.requirements||[]).map(m=>`<tr><td><strong>${esc(m.name)}</strong><small>${esc(m.unit)}</small></td><td>${m.stock}</td><td>${m.required}</td><td>${m.incoming}</td><td class="${m.toBuy?'status-bad':''}">${m.toBuy}</td><td>${money(m.estimatedCost)}</td></tr>`).join('')||'<tr><td colspan="6">No materials configured.</td></tr>';
  $('purchase-list').innerHTML=(input.purchaseOrders||[]).length?(input.purchaseOrders||[]).map(po=>{ const m=input.materials.find(x=>x.id===po.materialId), s=input.suppliers.find(x=>x.id===po.supplierId), remain=Number(po.qty)-Number(po.receivedQty||0); return `<article class="purchase-card"><div><strong>${esc(po.id)} · ${esc(m?.name||po.materialId)}</strong><p>${esc(s?.name||po.supplierId)} · ${po.qty} ${esc(m?.unit||'units')} · due ${esc(po.expectedDate)} · ${esc(po.status)}</p></div><div class="actions">${po.status==='Draft'?`<button data-po-action="order" data-id="${esc(po.id)}">Mark ordered</button>`:''}${['Ordered','Part received'].includes(po.status)?`<button data-po-action="receive" data-id="${esc(po.id)}">Receive ${remain}</button>`:''}</div></article>`; }).join(''):'<div class="empty">No purchase orders yet.</div>';
}
function renderEnergy(){
  if(!result){ $('energy-metrics').innerHTML=''; $('load-chart').innerHTML='<div class="empty">Complete the plan to see the load profile.</div>'; return; }
  $('energy-metrics').innerHTML=[
    metric('Planned peak',`${result.proposed.peakKw} kW`,`${result.comparison.peakReductionKw} kW below baseline`,result.proposed.peakKw>input.energy.peakLimitKw),
    metric('Shift energy',`${result.proposed.kwh} kWh`,'Modeled 15-minute load'),
    metric('Shift energy charge',money(result.proposed.usageCost),'Excludes monthly demand charge'),
    metric('Conditional demand saving',money(result.comparison.conditionalDemandSaving),'Only if this schedule changes final monthly peak')
  ].join('');
  $('load-chart').innerHTML=BatchWattReports.loadChart(result);
  $('energy-verdict').textContent=result.proposed.peakKw<=input.energy.peakLimitKw?'Within peak target':'Above peak target';
  $('energy-verdict').className='pill '+(result.proposed.peakKw<=input.energy.peakLimitKw?'ready':'critical');
  const fields=[['baseKw','Background load (kW)','number'],['peakLimitKw','Peak target (kW)','number'],['monthlyPeakKw','Month peak so far (kW)','number'],['rate','Off-peak USD/kWh','number'],['peakRate','Peak USD/kWh','number'],['demandRate','Demand USD/kW','number'],['peakStart','Peak starts','time'],['peakEnd','Peak ends','time']];
  $('energy-settings').innerHTML=fields.map(([key,label,type])=>`<label>${label}<input data-energy="${key}" type="${type}" ${type==='time'?'step="900"':'min="0" step="any"'} value="${esc(input.energy[key])}"></label>`).join('');
}
function renderSetup(){
  $('factory-name').value=input.factory||''; $('shift-date').value=input.shift.date; $('shift-start').value=input.shift.start; $('shift-end').value=input.shift.end;
  $('line-list').innerHTML=(input.lines||[]).map(l=>`<div class="simple-row"><div><strong>${esc(l.name)}</strong><p>${l.kw} kW · ${l.changeoverMinutes} min changeover</p></div></div>`).join('')||'<div class="empty">No lines configured.</div>';
  $('product-list').innerHTML=(input.products||[]).map(p=>`<div class="simple-row"><div><strong>${esc(p.name)}</strong><p>${p.rate} ${esc(p.unit)}/hr · stock ${p.stock} · packaging ${p.packaging}</p></div></div>`).join('')||'<div class="empty">No products configured.</div>';
}
function renderAll(){ renderOperations(); renderOrders(); renderProcurement(); renderEnergy(); renderSetup(); showView(); }
function showView(){
  const view=['operations','orders','procurement','energy','setup'].includes(location.hash.slice(1))?location.hash.slice(1):'operations';
  document.querySelectorAll('[data-view]').forEach(x=>x.hidden=x.dataset.view!==view);
  document.querySelectorAll('[data-nav]').forEach(a=>a.toggleAttribute('aria-current',a.dataset.nav===view));
  window.scrollTo(0,0);
}
function openOrder(){
  if(!input.products?.length){ location.hash='setup'; return; }
  $('order-form').reset(); $('order-product').innerHTML=input.products.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join(''); $('order-qty').value=1; $('order-due').value=`${input.shift.date}T${input.shift.end}`; $('order-dialog').showModal();
}
function openPo(materialId=''){
  if(!input.suppliers.length||!input.materials.length){ location.hash='setup'; fail('Add suppliers and materials in the detailed setup before creating purchase orders.'); return; }
  $('po-form').reset(); $('po-supplier').innerHTML=input.suppliers.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join(''); $('po-material').innerHTML=input.materials.map(m=>`<option value="${esc(m.id)}" ${m.id===materialId?'selected':''}>${esc(m.name)}</option>`).join(''); const mat=input.materials.find(m=>m.id===$('po-material').value); $('po-cost').value=mat?.unitCost||0; $('po-date').value=input.shift.date; $('po-dialog').showModal();
}
function setWork(id,patch,action){
  workflow.items ||= {}; const prev=workflow.items[id]||{status:'Open',owner:'',note:'',updatedAt:null}; workflow.items[id]={...prev,...patch,updatedAt:new Date().toISOString()}; log(action,id); renderAll();
}

document.addEventListener('DOMContentLoaded',()=>{
  loadState(); recalc();
  window.addEventListener('hashchange',showView);
  $('refresh-plan').onclick=()=>recalc({record:true});
  $('load-demo').onclick=()=>{ input=prepareDemo(); workflow={items:{},release:null}; log('Demo loaded','Reset operational workspace to illustrative factory data.'); recalc(); location.hash='operations'; };
  $('new-workspace').onclick=()=>{ const d=prepareDemo(); d.factory='My factory'; d.orders=[]; d.purchaseOrders=[]; input=d; workflow={items:{},release:null}; log('Workspace started','Created a new workspace from the safe starter configuration.'); recalc(); location.hash='setup'; };
  $('open-order').onclick=openOrder; $('open-order-2').onclick=openOrder;
  $('open-po').onclick=()=>openPo();
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
  $('order-form').onsubmit=e=>{ e.preventDefault(); const order={id:uid('ORD'),customer:$('order-customer').value.trim(),productId:$('order-product').value,qty:Number($('order-qty').value),due:$('order-due').value,priority:$('order-priority').value}; input.orders.push(order); $('order-dialog').close(); log('Customer order added',`${order.id} · ${order.customer} · ${order.qty}`); recalc(); location.hash='operations'; };
  $('po-form').onsubmit=e=>{ e.preventDefault(); const po={id:uid('PO'),supplierId:$('po-supplier').value,materialId:$('po-material').value,qty:Number($('po-qty').value),unitCost:Number($('po-cost').value),expectedDate:$('po-date').value,status:'Draft',receivedQty:0,notes:'',receipts:[]}; input.purchaseOrders.push(po); $('po-dialog').close(); log('Purchase order drafted',`${po.id} · ${po.qty}`); recalc(); location.hash='procurement'; };
  $('release-plan').onclick=()=>{ const s=ops(); if(!s.releasable)return; workflow.release={fingerprint:BatchWattOperations.planFingerprint(input),at:new Date().toISOString(),actor:actor()}; log('Shift plan released',`${input.shift.date} · ${result.proposed.jobs.length} scheduled run(s)`); renderAll(); };
  $('clear-audit').onclick=()=>{ audit=[]; persist(); renderAudit(); };
  $('queue-filter').onclick=e=>{ const b=e.target.closest('[data-filter]'); if(!b)return; queueFilter=b.dataset.filter; document.querySelectorAll('#queue-filter button').forEach(x=>x.classList.toggle('active',x===b)); renderQueue(ops().items); };
  document.addEventListener('click',e=>{
    const w=e.target.closest('[data-work]'); if(w){ if(w.dataset.work==='ack')setWork(w.dataset.id,{status:'Acknowledged'},'Exception acknowledged'); if(w.dataset.work==='assign')setWork(w.dataset.id,{owner:actor()},'Exception assigned'); if(w.dataset.work==='resolve')setWork(w.dataset.id,{status:'Resolved'},'Exception marked resolved'); return; }
    const go=e.target.closest('[data-go]'); if(go){ location.hash=go.dataset.go; return; }
    const del=e.target.closest('[data-delete-order]'); if(del){ input.orders=input.orders.filter(o=>o.id!==del.dataset.deleteOrder); log('Order removed',del.dataset.deleteOrder); recalc(); return; }
    const po=e.target.closest('[data-po-action]'); if(po){ const row=input.purchaseOrders.find(x=>x.id===po.dataset.id); if(!row)return; if(po.dataset.poAction==='order'){row.status='Ordered';log('Purchase order placed',row.id);recalc();} else { const remain=Number(row.qty)-Number(row.receivedQty||0); input=BatchWattProcurement.receivePurchase(input,row.id,remain);log('Material receipt recorded',`${row.id} · ${remain}`);recalc();} }
  });
  document.addEventListener('change',e=>{
    if(e.target.dataset.energy){ input.energy[e.target.dataset.energy]=e.target.type==='number'?Number(e.target.value):e.target.value; log('Energy setting changed',e.target.dataset.energy); recalc(); }
  });
  const setupChange=()=>{ input.factory=$('factory-name').value.trim()||'My factory'; input.shift.date=$('shift-date').value; input.shift.start=$('shift-start').value; input.shift.end=$('shift-end').value; log('Workspace setup changed',`${input.factory} · ${input.shift.date}`); recalc(); };
  ['factory-name','shift-date','shift-start','shift-end'].forEach(id=>$(id).addEventListener('change',setupChange));
  $('po-material').addEventListener('change',()=>{ const m=input.materials.find(x=>x.id===$('po-material').value); if(m)$('po-cost').value=m.unitCost; });
});
