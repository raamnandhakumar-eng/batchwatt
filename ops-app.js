/* BatchWatt simple operator console. One next action, one run plan, one release decision. */
'use strict';
const $ = id => document.getElementById(id);
const DRAFT_KEY = 'batchwatt_v2_draft';
const OPS_KEY = 'batchwatt_v3_operations';
const ACTOR_KEY = 'batchwatt_v3_actor';
let input, result = null, workflow = {items:{},release:null};
let editingOrderId = null;
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
  }catch{ input=prepareDemo(); workflow={items:{},release:null}; }
  input.suppliers ||= []; input.materials ||= []; input.recipes ||= []; input.purchaseOrders ||= [];
}
function persist(){
  localStorage.setItem(DRAFT_KEY,JSON.stringify({input,isDemo:false}));
  localStorage.setItem(OPS_KEY,JSON.stringify(workflow));
  $('save-state').textContent='Saved on this device';
}
function fail(message){ $('error').hidden=!message; $('error').textContent=message||''; }
function recalc(){
  persist();
  if(!(input.orders||[]).length){ result=null; fail(''); renderAll(); return; }
  try{ result=BatchWattEnergy.createEnergyPlan(input); fail(''); }
  catch(err){ result=null; fail(err.message); }
  renderAll();
}
function ops(){ return BatchWattOperations.summary(input,result,workflow); }
function release(){ return BatchWattOperations.releaseStatus(input,workflow); }
function route(action){ return action==='procurement'?'buy':action==='orders'?'orders':'more'; }
function goto(view){ location.hash=view; }

function orderRows(){
  if(!result)return [];
  const jobs=new Map((result.proposed.jobs||[]).map(j=>[j.id,j]));
  const blocked=new Map((result.proposed.unscheduled||[]).map(j=>[j.id,j]));
  const shiftStart=BatchWattEnergy.timeMinutes(input.shift.start);
  return (result.allocations||[]).map(a=>{
    const job=jobs.get(a.id), hold=blocked.get(a.id);
    let status='Ready from stock', detail='No production needed';
    if(hold){status='Blocked';detail=hold.reason;}
    else if(job){status=job.lateMinutes>0?'Late':'Scheduled';detail=`${job.startTime}–${job.endTime} · ${job.line}`;}
    else if(!a.produce && a.dueMinute<shiftStart){status='Overdue';detail='Stock is available but due time has passed';}
    return {...a,status,detail};
  });
}

function nextAction(){
  if(!(input.orders||[]).length)return {title:'Add your first customer order',detail:'BatchWatt will tell you what to buy, what to run, and when.',label:'Add order',action:'order'};
  if(!result)return {title:'Finish the factory setup',detail:'A required product, recipe, machine, material, or energy input is missing.',label:'Open settings',action:'more'};
  const summary=ops(), rs=release();
  const blocker=(result.proposed.unscheduled||[])[0];
  if(blocker){
    const material=String(blocker.reason||'').includes('Material shortage');
    return {title:material?'Buy missing material':`Fix ${blocker.product}`,detail:blocker.reason,label:material?'Open buying':'Open settings',action:material?'buy':'more'};
  }
  if(summary.criticalCount>0){
    const issue=summary.items.find(i=>i.state.status!=='Resolved'&&i.severity==='critical');
    return {title:issue?.title||'Resolve critical issue',detail:issue?.detail||'The shift has a critical operating issue.',label:'Fix issue',action:route(issue?.action)};
  }
  if(!rs.isReleased || rs.isStale)return {title:rs.isStale?'Release the updated plan':'Release today’s shift plan',detail:'The plan has no hard blocker. Release it before the floor starts work.',label:rs.isStale?'Release again':'Release shift',action:'release'};
  const ready=orderRows().find(r=>r.status==='Ready from stock');
  if(ready)return {title:`Dispatch ${ready.product}`,detail:`${ready.fromStock} ${ready.unit} ready for ${ready.customer}. Due ${String(ready.due).replace('T',' ')}.`,label:'Open orders',action:'orders'};
  const buys=(result.procurement.requirements||[]).filter(m=>Number(m.toBuy)>0);
  if(buys.length){const m=buys[0];return {title:`Order ${m.toBuy} ${m.unit} ${m.name}`,detail:`Suggested replenishment. Estimated cost ${money(m.estimatedCost)}.`,label:'Create PO',action:'po',materialId:m.materialId,qty:m.toBuy};}
  const job=[...(result.proposed.jobs||[])].sort((a,b)=>a.start-b.start)[0];
  if(job)return {title:`Run ${job.product} at ${job.startTime}`,detail:`${job.produce} ${job.unit} on ${job.line}. Due ${String(job.due).replace('T',' ')}.`,label:'View run plan',action:'today'};
  return {title:'Shift plan complete',detail:'No production or buying action is waiting.',label:'View orders',action:'orders'};
}

function renderToday(){
  $('factory-title').textContent=input.factory||'My factory';
  $('shift-label').textContent=`${input.shift.date} · ${input.shift.start}–${input.shift.end}`;
  const action=nextAction();
  $('next-title').textContent=action.title; $('next-detail').textContent=action.detail; $('next-button').textContent=action.label;
  $('next-button').dataset.action=action.action; $('next-button').dataset.material=action.materialId||''; $('next-button').dataset.qty=action.qty||'';

  if(!result){
    $('plan-status').textContent=(input.orders||[]).length?'Needs setup':'No orders yet'; $('plan-status').className='status-pill warn';
    $('run-summary').textContent=''; $('run-list').innerHTML='<div class="empty">Add an order to create today’s run plan.</div>';
    $('release-card').className='release-card blocked'; $('release-title').textContent='Not ready to release'; $('release-detail').textContent='Create a valid plan first.'; $('release-plan').disabled=true;
    $('issue-count').textContent='0'; $('issue-list').innerHTML='<div class="empty">No plan issues yet.</div>'; return;
  }

  const summary=ops(), rs=release(), jobs=[...(result.proposed.jobs||[])].sort((a,b)=>a.start-b.start);
  if(rs.isReleased){$('plan-status').textContent='Released';$('plan-status').className='status-pill good';}
  else if(summary.releasable){$('plan-status').textContent='Ready to release';$('plan-status').className='status-pill good';}
  else{$('plan-status').textContent='Needs action';$('plan-status').className='status-pill warn';}

  $('run-summary').textContent=`${jobs.length} production run${jobs.length===1?'':'s'}`;
  $('run-list').innerHTML=jobs.length?jobs.map(j=>`<div class="run-row"><span class="run-time">${esc(j.startTime)}</span><div class="run-main"><strong>${esc(j.product)}</strong><small>${j.produce} ${esc(j.unit)} · ${esc(j.line)} · ${esc(j.customer)}</small></div><span class="run-badge ${j.lateMinutes?'late':''}">${j.lateMinutes?`${j.lateMinutes}m late`:'On time'}</span></div>`).join(''):'<div class="empty">No production run is needed. Orders may be covered from stock.</div>';

  const releaseCard=$('release-card');
  if(rs.isReleased){releaseCard.className='release-card released';$('release-title').textContent='Shift released';$('release-detail').textContent=`Released by ${rs.release.actor} at ${new Date(rs.release.at).toLocaleString()}.`;$('release-plan').disabled=true;$('release-plan').textContent='Released';}
  else if(rs.isStale){releaseCard.className='release-card blocked';$('release-title').textContent='Plan changed after release';$('release-detail').textContent='Review the updated plan and release it again.';$('release-plan').disabled=!summary.releasable;$('release-plan').textContent='Release again';}
  else if(summary.releasable){releaseCard.className='release-card ready';$('release-title').textContent='Ready to release';$('release-detail').textContent='No blocked production or critical energy issue remains.';$('release-plan').disabled=false;$('release-plan').textContent='Release shift';}
  else{releaseCard.className='release-card blocked';$('release-title').textContent='Release blocked';$('release-detail').textContent='Fix the issues below first.';$('release-plan').disabled=true;$('release-plan').textContent='Release shift';}

  const issues=summary.items.filter(i=>i.state.status!=='Resolved');
  $('issue-count').textContent=issues.length;
  $('issue-list').innerHTML=issues.length?issues.map(i=>`<div class="issue-row"><div><span class="issue-type">${esc(i.type)}</span><strong>${esc(i.title)}</strong><p>${esc(i.detail)}</p></div><button class="quiet" data-go="${route(i.action)}">Fix</button></div>`).join(''):'<div class="empty">No operating issues.</div>';
  $('issues-panel').open=summary.blockedOrders>0||summary.criticalCount>0;
}

function renderOrders(){
  const rows=orderRows(), statusById=new Map(rows.map(r=>[r.id,r]));
  const query=($('order-search')?.value||'').trim().toLowerCase();
  const filter=$('order-status-filter')?.value||'all';
  const all=(input.orders||[]).map(o=>{const p=input.products.find(p=>p.id===o.productId),r=statusById.get(o.id);return {...o,product:p?.name||o.productId,unit:p?.unit||'',status:r?.status||'Needs plan',detail:r?.detail||'Complete setup to calculate this order.'};});
  const risk=o=>['Blocked','Late','Overdue','Needs plan'].includes(o.status);
  const items=all.filter(o=>(filter!=='attention'||risk(o))&&`${o.customer} ${o.product} ${o.id}`.toLowerCase().includes(query));
  if($('order-count'))$('order-count').textContent=`${items.length} of ${all.length} orders · ${all.filter(risk).length} need attention`;
  const buttons=o=>`<div class="actions"><button class="quiet" data-edit-order="${esc(o.id)}" aria-label="Edit order for ${esc(o.customer)}">Edit</button><button class="quiet" data-delete-order="${esc(o.id)}" aria-label="Remove order for ${esc(o.customer)}">Remove</button></div>`;
  const tone=o=>risk(o)?'status-bad':'status-good';
  $('orders-table').innerHTML=items.length?items.map(o=>`<tr><td><strong>${esc(o.customer)}</strong><small class="order-detail">${esc(o.priority)}</small></td><td>${esc(o.product)}</td><td>${esc(o.qty)} ${esc(o.unit)}</td><td>${esc(o.due.replace('T',' '))}</td><td class="${tone(o)}">${esc(o.status)}<small class="order-detail">${esc(o.detail)}</small></td><td>${buttons(o)}</td></tr>`).join(''):'<tr><td colspan="6">'+(all.length?'No orders match. Clear your search or choose All orders.':'No orders yet. Add an order or import your order sheet.')+'</td></tr>';
  $('orders-cards').innerHTML=items.length?items.map(o=>`<article class="order-card"><div class="order-card-head"><strong>${esc(o.customer)}</strong><span class="${tone(o)}">${esc(o.status)}</span></div><p>${esc(o.product)} · ${esc(o.qty)} ${esc(o.unit)} · ${esc(o.priority)}</p><p>Due ${esc(o.due.replace('T',' '))}</p><p>${esc(o.detail)}</p>${buttons(o)}</article>`).join(''):'<div class="empty">'+(all.length?'No matching orders.':'Add your first order above.')+'</div>';
}

function renderBuy(){
  if(!result){$('buy-summary').textContent='Add an order and complete setup to calculate material needs.';$('buy-list').innerHTML='<div class="empty">No buy plan yet.</div>';$('purchase-list').innerHTML='';return;}
  const buys=(result.procurement.requirements||[]).filter(m=>Number(m.toBuy)>0), spend=buys.reduce((s,m)=>s+Number(m.estimatedCost||0),0);
  $('buy-summary').textContent=buys.length?`${buys.length} material action${buys.length===1?'':'s'} · estimated ${money(spend)}`:'No purchase is recommended for the current plan.';
  $('buy-list').innerHTML=buys.length?buys.map(m=>{const supplier=input.suppliers.find(s=>s.id===m.supplierId)?.name||m.supplier||'Supplier not set';const urgent=Number(m.shortage)>0;return `<article class="buy-row ${urgent?'urgent':''}"><div><span class="eyebrow">${urgent?'NEEDED FOR ORDERS':'BUFFER REPLENISHMENT'}</span><strong class="buy-qty">${m.toBuy} ${esc(m.unit)} ${esc(m.name)}</strong><p>${urgent?`${m.shortage} ${esc(m.unit)} short for current production.`:`Replenishes the configured buffer.`} ${esc(supplier)} · est. ${money(m.estimatedCost)}</p></div><button class="primary" data-create-po="${esc(m.materialId)}" data-qty="${m.toBuy}">Create PO</button></article>`;}).join(''):'<div class="empty">Stock and incoming supply cover the current plan.</div>';
  const open=(input.purchaseOrders||[]).filter(po=>po.status!=='Cancelled');
  $('purchase-list').innerHTML=open.length?open.map(po=>{const m=input.materials.find(x=>x.id===po.materialId),s=input.suppliers.find(x=>x.id===po.supplierId),remain=Number(po.qty)-Number(po.receivedQty||0);return `<div class="purchase-row"><div><strong>${esc(m?.name||po.materialId)} · ${esc(po.status)}</strong><p>${esc(s?.name||po.supplierId)} · ${po.qty} ${esc(m?.unit||'units')} · due ${esc(po.expectedDate)}</p></div><div class="actions">${po.status==='Draft'?`<button data-po-action="order" data-id="${esc(po.id)}">Mark ordered</button>`:''}${['Ordered','Part received'].includes(po.status)?`<button data-po-action="receive" data-id="${esc(po.id)}">Receive delivery</button><small>${remain} remaining</small>`:''}</div></div>`;}).join(''):'<div class="empty">No purchase orders yet.</div>';
}

function renderMore(){
  $('factory-name').value=input.factory||'';$('shift-date').value=input.shift.date;$('shift-start').value=input.shift.start;$('shift-end').value=input.shift.end;
  const fields=[['baseKw','Background load (kW)','number'],['peakLimitKw','Peak target (kW)','number'],['monthlyPeakKw','Month peak so far (kW)','number'],['rate','Off-peak USD/kWh','number'],['peakRate','Peak USD/kWh','number'],['demandRate','Demand USD/kW','number'],['peakStart','Peak starts','time'],['peakEnd','Peak ends','time']];
  $('energy-settings').innerHTML=fields.map(([key,label,type])=>`<label>${label}<input data-energy="${key}" type="${type}" ${type==='time'?'step="900"':'min="0" step="any"'} value="${esc(input.energy[key])}"></label>`).join('');
  if(!result){$('energy-status').textContent='No plan';$('energy-status').className='status-pill neutral';$('energy-summary').innerHTML='<div class="stat"><span>Peak</span><strong>—</strong></div><div class="stat"><span>Energy</span><strong>—</strong></div><div class="stat"><span>Shift cost</span><strong>—</strong></div>';return;}
  const within=result.proposed.peakKw<=input.energy.peakLimitKw;
  $('energy-status').textContent=within?'Within peak target':'Above peak target';$('energy-status').className='status-pill '+(within?'good':'bad');
  $('energy-summary').innerHTML=`<div class="stat"><span>Planned peak</span><strong>${result.proposed.peakKw} kW</strong></div><div class="stat"><span>Shift energy</span><strong>${result.proposed.kwh} kWh</strong></div><div class="stat"><span>Shift cost</span><strong>${money(result.proposed.usageCost)}</strong></div>`;
}

function renderAll(){renderToday();renderOrders();renderBuy();renderMore();showView();}
function showView(){const view=['today','orders','buy','more'].includes(location.hash.slice(1))?location.hash.slice(1):'today';document.querySelectorAll('[data-view]').forEach(x=>x.hidden=x.dataset.view!==view);document.querySelectorAll('[data-nav]').forEach(a=>a.toggleAttribute('aria-current',a.dataset.nav===view));window.scrollTo(0,0);}
function openOrder(orderId=null){
  if(!input.products?.length){goto('more');fail('Add products in the detailed planner before creating orders.');return;}
  const order=typeof orderId==='string'?input.orders.find(o=>o.id===orderId):null;
  editingOrderId=order?.id||null;
  $('order-form').reset();
  $('order-dialog-title').textContent=order?'Edit customer order':'Add customer order';
  $('order-submit').textContent=order?'Save changes':'Add order';
  $('order-product').innerHTML=input.products.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
  $('order-customer').value=order?.customer||'';
  if(order)$('order-product').value=order.productId;
  $('order-qty').value=order?.qty||1;
  $('order-due').value=order?.due||`${input.shift.date}T${input.shift.end}`;
  $('order-priority').value=order?.priority||'Standard';
  $('order-dialog').showModal();
}
function openReceipt(id){
  const po=input.purchaseOrders.find(p=>p.id===id);
  if(!po||!['Ordered','Part received'].includes(po.status))return;
  const material=input.materials.find(m=>m.id===po.materialId);
  const remaining=Number((Number(po.qty)-Number(po.receivedQty||0)).toFixed(6));
  $('receipt-form').dataset.poId=id;
  $('receipt-detail').textContent=`${material?.name||po.materialId}: ${remaining} ${material?.unit||'units'} still due. Enter only the quantity that arrived.`;
  $('receipt-qty').max=remaining;$('receipt-qty').value=remaining;
  $('receipt-error').textContent='';$('receipt-dialog').showModal();
}

function openPo(materialId='',qty=''){if(!input.suppliers.length||!input.materials.length){goto('more');fail('Add suppliers and materials in the detailed planner first.');return;}$('po-form').reset();$('po-supplier').innerHTML=input.suppliers.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');$('po-material').innerHTML=input.materials.map(m=>`<option value="${esc(m.id)}" ${m.id===materialId?'selected':''}>${esc(m.name)}</option>`).join('');const mat=input.materials.find(m=>m.id===$('po-material').value);if(mat?.supplierId)$('po-supplier').value=mat.supplierId;$('po-cost').value=mat?.unitCost||0;$('po-qty').value=qty||1;const sup=input.suppliers.find(s=>s.id===$('po-supplier').value),d=new Date(`${input.shift.date}T12:00:00`);d.setDate(d.getDate()+Number(sup?.leadDays||0));$('po-date').value=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;$('po-dialog').showModal();}
function releaseShift(){const summary=ops();if(!summary.releasable)return;workflow.release={fingerprint:BatchWattOperations.planFingerprint(input),at:new Date().toISOString(),actor:actor()};persist();recalc();}

document.addEventListener('DOMContentLoaded',()=>{
  loadState();recalc();window.addEventListener('hashchange',showView);
  $('order-search').oninput=renderOrders;$('order-status-filter').onchange=renderOrders;
  $('order-customer').oninput=()=> $('order-customer').setCustomValidity('');
  $('receipt-form').onsubmit=e=>{e.preventDefault();try{input=BatchWattProcurement.receivePurchase(input,$('receipt-form').dataset.poId,Number($('receipt-qty').value));$('receipt-dialog').close();recalc();}catch(err){$('receipt-error').textContent=err.message;}};
  $('open-order').onclick=()=>openOrder();$('open-order-2').onclick=()=>openOrder();$('open-po').onclick=()=>openPo();$('release-plan').onclick=releaseShift;
  $('next-button').onclick=()=>{const b=$('next-button'),action=b.dataset.action;if(action==='order')openOrder();else if(action==='release')releaseShift();else if(action==='po')openPo(b.dataset.material,b.dataset.qty);else goto(action||'today');};
  $('load-demo').onclick=()=>{if(!confirm('Replace this workspace with demo data?'))return;input=prepareDemo();workflow={items:{},release:null};recalc();goto('today');};
  $('new-workspace').onclick=()=>{if(!confirm('Clear the current orders and purchase orders to start a new workspace?'))return;const d=prepareDemo();d.factory='My factory';d.orders=[];d.purchaseOrders=[];input=d;workflow={items:{},release:null};recalc();goto('more');};
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
  $('order-form').onsubmit=e=>{e.preventDefault();const order={id:editingOrderId||uid('ORD'),customer:$('order-customer').value.trim(),productId:$('order-product').value,qty:Number($('order-qty').value),due:$('order-due').value,priority:$('order-priority').value};if(!order.customer){$('order-customer').setCustomValidity('Enter a customer name.');$('order-customer').reportValidity();return;}const index=input.orders.findIndex(o=>o.id===editingOrderId);if(index>=0)input.orders[index]={...input.orders[index],...order};else input.orders.push(order);editingOrderId=null;$('order-dialog').close();recalc();goto('today');};
  $('po-form').onsubmit=e=>{e.preventDefault();const po={id:uid('PO'),supplierId:$('po-supplier').value,materialId:$('po-material').value,qty:Number($('po-qty').value),unitCost:Number($('po-cost').value),expectedDate:$('po-date').value,status:'Draft',receivedQty:0,notes:'',receipts:[]};input.purchaseOrders.push(po);$('po-dialog').close();recalc();goto('buy');};
  document.addEventListener('click',e=>{const go=e.target.closest('[data-go]');if(go){goto(go.dataset.go);return;}const create=e.target.closest('[data-create-po]');if(create){openPo(create.dataset.createPo,create.dataset.qty);return;}const edit=e.target.closest('[data-edit-order]');if(edit){openOrder(edit.dataset.editOrder);return;}const del=e.target.closest('[data-delete-order]');if(del){if(!confirm('Remove this order from the plan?'))return;input.orders=input.orders.filter(o=>o.id!==del.dataset.deleteOrder);workflow.release=null;recalc();return;}const po=e.target.closest('[data-po-action]');if(po){const row=input.purchaseOrders.find(x=>x.id===po.dataset.id);if(!row)return;if(po.dataset.poAction==='order')row.status='Ordered';else{openReceipt(row.id);return;}recalc();}});
  document.addEventListener('change',e=>{if(e.target.dataset.energy){input.energy[e.target.dataset.energy]=e.target.type==='number'?Number(e.target.value):e.target.value;recalc();}});
  const setupChange=()=>{input.factory=$('factory-name').value.trim()||'My factory';input.shift.date=$('shift-date').value;input.shift.start=$('shift-start').value;input.shift.end=$('shift-end').value;recalc();};
  ['factory-name','shift-date','shift-start','shift-end'].forEach(id=>$(id).addEventListener('change',setupChange));
  $('po-material').addEventListener('change',()=>{const m=input.materials.find(x=>x.id===$('po-material').value);if(m){$('po-cost').value=m.unitCost;if(m.supplierId)$('po-supplier').value=m.supplierId;}});
});
