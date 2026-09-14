/* Multi-factory master data + per-factory workspace layer. */
'use strict';
(function(){
  const PROFILE_KEY='batchwatt_v5_factory_profiles';
  const ACTIVE_KEY='batchwatt_v5_active_factory_profile';
  const WORKSPACE_KEY='batchwatt_v5_factory_workspaces';
  let ready=false,restoring=false;
  const escP=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}};
  const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const copy=x=>JSON.parse(JSON.stringify(x));
  const makeId=prefix=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;

  function masterFromInput(src){
    const energy=copy(src?.energy||{});delete energy.intervalLoad;delete energy.sources;
    return {
      factory:String(src?.factory||'Factory'),
      shift:{start:src?.shift?.start||'08:00',end:src?.shift?.end||'17:00'},
      energy,
      lines:copy(src?.lines||[]),products:copy(src?.products||[]),suppliers:copy(src?.suppliers||[]),materials:copy(src?.materials||[]),recipes:copy(src?.recipes||[])
    };
  }
  function blankMaster(name){return {factory:name,shift:{start:'08:00',end:'17:00'},energy:{currency:'USD',baseKw:0,peakLimitKw:100,monthlyPeakKw:0,rate:.12,peakRate:.2,peakStart:'16:00',peakEnd:'20:00',demandRate:15},lines:[],products:[],suppliers:[],materials:[],recipes:[]};}
  function workspaceFromMaster(profile){const m=copy(profile.master);return {...m,factory:profile.name,shift:{date:localDate(),start:m.shift?.start||'08:00',end:m.shift?.end||'17:00'},energy:{...(m.energy||{})},orders:[],purchaseOrders:[]};}
  function profiles(){return read(PROFILE_KEY,[]);}
  function workspaces(){return read(WORKSPACE_KEY,{});}
  function activeId(){return localStorage.getItem(ACTIVE_KEY)||'';}
  function currentProfile(){return profiles().find(p=>p.id===activeId())||null;}

  function ensureInitialProfile(){
    let list=profiles();
    if(!list.length){
      const id=makeId('factory');const name=String(input?.factory||'My factory');
      list=[{id,name,master:masterFromInput(input),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}];
      write(PROFILE_KEY,list);localStorage.setItem(ACTIVE_KEY,id);
      const ws={};ws[id]={input:copy(input),workflow:copy(workflow),savedAt:new Date().toISOString()};write(WORKSPACE_KEY,ws);
    }else if(!list.some(p=>p.id===activeId()))localStorage.setItem(ACTIVE_KEY,list[0].id);
  }
  function saveWorkspace(id=activeId()){
    if(!ready||restoring||!id||!input)return;
    const ws=workspaces();ws[id]={input:copy(input),workflow:copy(workflow),savedAt:new Date().toISOString()};write(WORKSPACE_KEY,ws);
  }
  function loadProfileWorkspace(id){
    const list=profiles(),profile=list.find(p=>p.id===id);if(!profile)return;
    saveWorkspace();localStorage.setItem(ACTIVE_KEY,id);
    const saved=workspaces()[id];restoring=true;
    input=saved?.input?copy(saved.input):workspaceFromMaster(profile);
    workflow=saved?.workflow?copy(saved.workflow):{items:{},release:null};
    input.suppliers||=[];input.materials||=[];input.recipes||=[];input.purchaseOrders||=[];input.orders||=[];
    restoring=false;result=null;recalc();renderProfileUI();location.hash='#today';
  }

  function mountSwitcher(){
    const right=document.querySelector('.appbar-right');if(!right||document.getElementById('factory-profile-switcher'))return;
    const wrap=document.createElement('div');wrap.id='factory-profile-switcher';wrap.className='factory-profile-switcher';
    wrap.innerHTML='<span>FACTORY</span><select id="factory-profile-select" aria-label="Active factory"></select>';
    right.prepend(wrap);wrap.querySelector('select').addEventListener('change',e=>loadProfileWorkspace(e.target.value));
  }
  function mountSetup(){
    const more=document.getElementById('more');if(!more||document.getElementById('factory-profile-panel'))return;
    const head=more.querySelector('.page-head');const panel=document.createElement('section');panel.id='factory-profile-panel';panel.className='panel compact-panel factory-profile-panel';
    panel.innerHTML=`<div class="panel-head"><div><p class="eyebrow">FACTORY PROFILE</p><h2>Reusable plant master data</h2><p class="subtle">Products, lines, materials, BOMs, shift defaults and energy settings stay with this factory. Daily orders and interval energy remain in its own workspace.</p></div><div class="fp-head-actions"><button id="fp-new" class="quiet" type="button">+ Factory</button><button id="fp-save" class="primary" type="button">Save profile</button></div></div>
      <div class="fp-profile-row"><label>Profile<select id="fp-profile-select"></select></label><label>Factory name<input id="fp-name"></label><div id="fp-summary" class="fp-summary"></div><button id="fp-delete" class="quiet danger-lite" type="button">Delete</button></div>
      <details class="fp-master-details"><summary>Edit master data</summary><p class="subtle">These settings define how the standard BatchWatt engine behaves for this plant.</p>
        <div class="fp-editor-section"><div class="fp-editor-head"><div><strong>Production lines</strong><small>Machine/line power and changeover assumptions.</small></div><button type="button" class="quiet" data-fp-add="line">+ Line</button></div><div id="fp-lines" class="fp-table"></div></div>
        <div class="fp-editor-section"><div class="fp-editor-head"><div><strong>Products</strong><small>Rate, line assignment, finished stock and packaging availability.</small></div><button type="button" class="quiet" data-fp-add="product">+ Product</button></div><div id="fp-products" class="fp-table"></div></div>
        <div class="fp-editor-section"><div class="fp-editor-head"><div><strong>Materials</strong><small>Raw-material stock and replenishment assumptions.</small></div><button type="button" class="quiet" data-fp-add="material">+ Material</button></div><div id="fp-materials" class="fp-table"></div></div>
        <div class="fp-editor-section"><div class="fp-editor-head"><div><strong>BOM / recipes</strong><small>Material required per product unit.</small></div><button type="button" class="quiet" data-fp-add="recipe">+ BOM row</button></div><div id="fp-recipes" class="fp-table"></div></div>
      </details>`;
    if(head)head.insertAdjacentElement('afterend',panel);else more.prepend(panel);
    panel.querySelector('#fp-profile-select').addEventListener('change',e=>loadProfileWorkspace(e.target.value));
    panel.querySelector('#fp-save').addEventListener('click',saveProfileMaster);
    panel.querySelector('#fp-new').addEventListener('click',openNewProfileDialog);
    panel.querySelector('#fp-delete').addEventListener('click',deleteCurrentProfile);
    panel.addEventListener('click',handleEditorClick);
  }
  function mountDialog(){
    if(document.getElementById('factory-profile-dialog'))return;
    const d=document.createElement('dialog');d.id='factory-profile-dialog';d.innerHTML=`<form id="factory-profile-form"><div class="dialog-head"><h2>Create factory profile</h2><button type="button" class="icon-button" id="fp-dialog-close" aria-label="Close">×</button></div><label>Factory name<input id="fp-new-name" required placeholder="Plant or site name"></label><fieldset class="fp-create-options"><legend>Start from</legend><label><input type="radio" name="fp-mode" value="duplicate" checked> Duplicate current factory configuration</label><label><input type="radio" name="fp-mode" value="blank"> Blank factory</label></fieldset><button class="primary big" type="submit">Create factory</button></form>`;document.body.appendChild(d);
    d.querySelector('#fp-dialog-close').onclick=()=>d.close();d.querySelector('form').addEventListener('submit',e=>{e.preventDefault();createProfile();});
  }

  function option(value,label,current){return `<option value="${escP(value)}" ${value===current?'selected':''}>${escP(label)}</option>`;}
  function renderSwitcher(){
    const list=profiles(),active=activeId();
    ['factory-profile-select','fp-profile-select'].forEach(id=>{const sel=document.getElementById(id);if(sel){sel.innerHTML=list.map(p=>option(p.id,p.name,active)).join('');sel.value=active;}});
  }
  function renderEditor(){
    const lineOptions=(current='')=>(input.lines||[]).map(l=>option(l.id,l.name,current)).join('');
    const productOptions=(current='')=>(input.products||[]).map(p=>option(p.id,p.name,current)).join('');
    const materialOptions=(current='')=>(input.materials||[]).map(m=>option(m.id,m.name,current)).join('');
    const lines=document.getElementById('fp-lines');if(lines)lines.innerHTML=(input.lines||[]).map(l=>`<div class="fp-data-row fp-line" data-id="${escP(l.id)}"><input data-field="name" value="${escP(l.name)}" aria-label="Line name"><label>kW<input data-field="kw" type="number" min="0" step="any" value="${Number(l.kw||0)}"></label><label>Changeover min<input data-field="changeoverMinutes" type="number" min="0" step="15" value="${Number(l.changeoverMinutes||0)}"></label><button type="button" class="quiet fp-remove" data-fp-remove="line">Remove</button></div>`).join('')||'<div class="fp-empty">No lines configured.</div>';
    const products=document.getElementById('fp-products');if(products)products.innerHTML=(input.products||[]).map(p=>`<div class="fp-data-row fp-product" data-id="${escP(p.id)}"><input data-field="name" value="${escP(p.name)}" aria-label="Product name"><input data-field="unit" value="${escP(p.unit||'units')}" aria-label="Unit"><label>Line<select data-field="lineId">${lineOptions(p.lineId)}</select></label><label>Units/hr<input data-field="rate" type="number" min=".000001" step="any" value="${Number(p.rate||0)}"></label><label>Stock<input data-field="stock" type="number" min="0" step="any" value="${Number(p.stock||0)}"></label><label>Packaging<input data-field="packaging" type="number" min="0" step="any" value="${Number(p.packaging||0)}"></label><button type="button" class="quiet fp-remove" data-fp-remove="product">Remove</button></div>`).join('')||'<div class="fp-empty">No products configured.</div>';
    const mats=document.getElementById('fp-materials');if(mats)mats.innerHTML=(input.materials||[]).map(m=>`<div class="fp-data-row fp-material" data-id="${escP(m.id)}"><input data-field="name" value="${escP(m.name)}" aria-label="Material name"><input data-field="unit" value="${escP(m.unit||'units')}" aria-label="Unit"><label>Stock<input data-field="stock" type="number" min="0" step="any" value="${Number(m.stock||0)}"></label><label>Reorder point<input data-field="reorderPoint" type="number" min="0" step="any" value="${Number(m.reorderPoint||0)}"></label><label>Unit cost<input data-field="unitCost" type="number" min="0" step="any" value="${Number(m.unitCost||0)}"></label><button type="button" class="quiet fp-remove" data-fp-remove="material">Remove</button></div>`).join('')||'<div class="fp-empty">No materials configured.</div>';
    const rec=document.getElementById('fp-recipes');if(rec)rec.innerHTML=(input.recipes||[]).map(r=>`<div class="fp-data-row fp-recipe" data-id="${escP(r.id)}"><label>Product<select data-field="productId">${productOptions(r.productId)}</select></label><label>Material<select data-field="materialId">${materialOptions(r.materialId)}</select></label><label>Per unit<input data-field="perUnit" type="number" min=".000001" step="any" value="${Number(r.perUnit||0)}"></label><button type="button" class="quiet fp-remove" data-fp-remove="recipe">Remove</button></div>`).join('')||'<div class="fp-empty">No BOM rows configured.</div>';
  }
  function renderSetupSummary(){
    const p=currentProfile(),name=document.getElementById('fp-name'),sum=document.getElementById('fp-summary'),del=document.getElementById('fp-delete');
    if(name)name.value=p?.name||input?.factory||'';
    if(sum)sum.innerHTML=`<span>${input?.products?.length||0} products</span><span>${input?.lines?.length||0} lines</span><span>${input?.materials?.length||0} materials</span><span>${input?.recipes?.length||0} BOM rows</span>`;
    if(del)del.disabled=profiles().length<=1;renderEditor();
  }
  function renderProfileUI(){mountSwitcher();mountSetup();mountDialog();renderSwitcher();renderSetupSummary();}

  function num(el,label,{positive=false}={}){const v=Number(el?.value);if(!Number.isFinite(v)||(positive?v<=0:v<0))throw new Error(`${label} must be ${positive?'greater than zero':'zero or greater'}.`);return v;}
  function syncEditorIntoInput(){
    const name=document.getElementById('fp-name')?.value.trim();if(!name)throw new Error('Factory name is required.');
    const lines=[...document.querySelectorAll('#fp-lines .fp-line')].map(row=>({id:row.dataset.id,name:row.querySelector('[data-field="name"]').value.trim(),kw:num(row.querySelector('[data-field="kw"]'),'Line kW'),changeoverMinutes:num(row.querySelector('[data-field="changeoverMinutes"]'),'Changeover')}));
    if(lines.some(l=>!l.name))throw new Error('Every production line needs a name.');
    const lineIds=new Set(lines.map(l=>l.id));
    const products=[...document.querySelectorAll('#fp-products .fp-product')].map(row=>({id:row.dataset.id,name:row.querySelector('[data-field="name"]').value.trim(),unit:row.querySelector('[data-field="unit"]').value.trim()||'units',lineId:row.querySelector('[data-field="lineId"]').value,rate:num(row.querySelector('[data-field="rate"]'),'Product rate',{positive:true}),stock:num(row.querySelector('[data-field="stock"]'),'Finished stock'),packaging:num(row.querySelector('[data-field="packaging"]'),'Packaging')}));
    if(products.some(p=>!p.name))throw new Error('Every product needs a name.');if(products.some(p=>!lineIds.has(p.lineId)))throw new Error('Every product must be assigned to a configured production line.');
    const oldMaterials=new Map((input.materials||[]).map(m=>[m.id,m]));
    const materials=[...document.querySelectorAll('#fp-materials .fp-material')].map(row=>{const old=oldMaterials.get(row.dataset.id)||{};return {id:row.dataset.id,name:row.querySelector('[data-field="name"]').value.trim(),unit:row.querySelector('[data-field="unit"]').value.trim()||'units',stock:num(row.querySelector('[data-field="stock"]'),'Material stock'),reorderPoint:num(row.querySelector('[data-field="reorderPoint"]'),'Reorder point'),unitCost:num(row.querySelector('[data-field="unitCost"]'),'Unit cost'),supplierId:old.supplierId||''};});
    if(materials.some(m=>!m.name))throw new Error('Every material needs a name.');const productIds=new Set(products.map(p=>p.id)),materialIds=new Set(materials.map(m=>m.id));
    const recipes=[...document.querySelectorAll('#fp-recipes .fp-recipe')].map(row=>({id:row.dataset.id,productId:row.querySelector('[data-field="productId"]').value,materialId:row.querySelector('[data-field="materialId"]').value,perUnit:num(row.querySelector('[data-field="perUnit"]'),'BOM quantity',{positive:true})}));
    if(recipes.some(r=>!productIds.has(r.productId)||!materialIds.has(r.materialId)))throw new Error('Every BOM row must reference an existing product and material.');
    input.factory=name;input.lines=lines;input.products=products;input.materials=materials;input.recipes=recipes;
  }
  function saveProfileMaster(){
    try{syncEditorIntoInput();const list=profiles(),i=list.findIndex(p=>p.id===activeId());if(i<0)throw new Error('Active factory profile was not found.');list[i]={...list[i],name:input.factory,master:masterFromInput(input),updatedAt:new Date().toISOString()};write(PROFILE_KEY,list);workflow.release=null;recalc();saveWorkspace();renderProfileUI();const s=document.getElementById('save-state');if(s)s.textContent='Factory profile saved';}
    catch(err){fail(err.message);}
  }
  function openNewProfileDialog(){const d=document.getElementById('factory-profile-dialog');if(!d)return;document.getElementById('fp-new-name').value='';d.showModal();document.getElementById('fp-new-name').focus();}
  function createProfile(){
    const name=document.getElementById('fp-new-name').value.trim();if(!name)return;const mode=document.querySelector('input[name="fp-mode"]:checked')?.value||'duplicate';
    const id=makeId('factory'),master=mode==='blank'?blankMaster(name):{...masterFromInput(input),factory:name};let list=profiles();list.push({id,name,master,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});write(PROFILE_KEY,list);
    const ws=workspaces();ws[id]={input:workspaceFromMaster({id,name,master}),workflow:{items:{},release:null},savedAt:new Date().toISOString()};write(WORKSPACE_KEY,ws);document.getElementById('factory-profile-dialog').close();loadProfileWorkspace(id);
  }
  function deleteCurrentProfile(){
    const list=profiles();if(list.length<=1)return;const p=currentProfile();if(!p||!confirm(`Delete the factory profile “${p.name}” and its saved workspace?`))return;
    const remaining=list.filter(x=>x.id!==p.id);write(PROFILE_KEY,remaining);const ws=workspaces();delete ws[p.id];write(WORKSPACE_KEY,ws);localStorage.setItem(ACTIVE_KEY,remaining[0].id);ready=false;ready=true;loadProfileWorkspace(remaining[0].id);
  }
  function handleEditorClick(e){
    const add=e.target.closest('[data-fp-add]');if(add){const type=add.dataset.fpAdd;if(type==='line')input.lines.push({id:makeId('line'),name:`Line ${input.lines.length+1}`,kw:20,changeoverMinutes:15});if(type==='product')input.products.push({id:makeId('product'),name:`Product ${input.products.length+1}`,unit:'units',lineId:input.lines[0]?.id||'',rate:100,stock:0,packaging:0});if(type==='material')input.materials.push({id:makeId('material'),name:`Material ${input.materials.length+1}`,unit:'units',stock:0,reorderPoint:0,unitCost:0,supplierId:''});if(type==='recipe'){if(!input.products.length||!input.materials.length){fail('Add at least one product and material before adding a BOM row.');return;}input.recipes.push({id:makeId('recipe'),productId:input.products[0].id,materialId:input.materials[0].id,perUnit:1});}renderSetupSummary();return;}
    const rem=e.target.closest('[data-fp-remove]');if(!rem)return;const row=rem.closest('[data-id]'),id=row?.dataset.id,type=rem.dataset.fpRemove;if(!id)return;
    if(type==='line'&&(input.products||[]).some(p=>p.lineId===id)){fail('Move or remove products assigned to this line first.');return;}
    if(type==='product'&&(input.recipes||[]).some(r=>r.productId===id)){fail('Remove this product’s BOM rows first.');return;}
    if(type==='material'&&(input.recipes||[]).some(r=>r.materialId===id)){fail('Remove BOM rows using this material first.');return;}
    if(type==='line')input.lines=input.lines.filter(x=>x.id!==id);if(type==='product')input.products=input.products.filter(x=>x.id!==id);if(type==='material')input.materials=input.materials.filter(x=>x.id!==id);if(type==='recipe')input.recipes=input.recipes.filter(x=>x.id!==id);renderSetupSummary();
  }

  const priorPersist=persist;persist=function(){const value=priorPersist.apply(this,arguments);saveWorkspace();return value;};
  const priorRecalc=recalc;recalc=function(){const value=priorRecalc.apply(this,arguments);renderProfileUI();return value;};
  document.addEventListener('DOMContentLoaded',()=>{ensureInitialProfile();ready=true;renderProfileUI();saveWorkspace();});
  window.addEventListener('hashchange',renderProfileUI);
})();
