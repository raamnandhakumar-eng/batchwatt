/* Multiple operating workspaces per factory: storage and state. */
'use strict';
(function(){
  const STORE='batchwatt_v53_factory_workspaces';
  const ACTIVE_WS='batchwatt_v53_active_workspaces';
  const ACTIVE_FACTORY='batchwatt_v5_active_factory_profile';
  const PROFILES='batchwatt_v5_factory_profiles';
  let restoring=false;
  const copy=x=>JSON.parse(JSON.stringify(x));
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??f;}catch{return f;}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const uid=()=>`workspace-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  const factoryId=()=>localStorage.getItem(ACTIVE_FACTORY)||'';
  const profiles=()=>read(PROFILES,[]);
  const profile=id=>profiles().find(p=>p.id===id)||null;
  const stores=()=>read(STORE,{});
  const activeMap=()=>read(ACTIVE_WS,{});
  const list=(id=factoryId())=>stores()[id]||[];
  const activeId=(id=factoryId())=>activeMap()[id]||'';

  function inventory(rows,fields){const out={};for(const r of rows||[]){out[r.id]={};for(const f of fields)out[r.id][f]=r[f];}return out;}
  function stateFromInput(src){return {shift:copy(src?.shift||{}),energy:copy(src?.energy||{}),orders:copy(src?.orders||[]),purchaseOrders:copy(src?.purchaseOrders||[]),productState:inventory(src?.products,['stock','packaging']),materialState:inventory(src?.materials,['stock'])};}
  function freshState(p){const m=copy(p?.master||{});return stateFromInput({...m,factory:p?.name||m.factory||'Factory',shift:{...(m.shift||{}),date:localDate()},energy:{...(m.energy||{})},orders:[],purchaseOrders:[]});}
  function inputFromState(p,state){
    const m=copy(p?.master||{});const next={...m,factory:p?.name||m.factory||'Factory',shift:{...(m.shift||{}),...(state?.shift||{}),date:state?.shift?.date||localDate()},energy:{...(m.energy||{}),...(state?.energy||{})},lines:copy(m.lines||[]),products:copy(m.products||[]),suppliers:copy(m.suppliers||[]),materials:copy(m.materials||[]),recipes:copy(m.recipes||[]),orders:copy(state?.orders||[]),purchaseOrders:copy(state?.purchaseOrders||[])};
    for(const pdt of next.products){const s=state?.productState?.[pdt.id];if(s){if(s.stock!==undefined)pdt.stock=s.stock;if(s.packaging!==undefined)pdt.packaging=s.packaging;}}
    for(const mat of next.materials){const s=state?.materialState?.[mat.id];if(s&&s.stock!==undefined)mat.stock=s.stock;}
    return next;
  }
  function setList(id,items){const all=stores();all[id]=items;write(STORE,all);}
  function setActive(id,wsId){const map=activeMap();map[id]=wsId;write(ACTIVE_WS,map);}
  function ensure(id=factoryId(),seed=input){
    if(!id)return null;let items=list(id);
    if(!items.length){const p=profile(id),id2=uid(),state=seed?stateFromInput(seed):freshState(p);items=[{id:id2,name:`Daily plan · ${state.shift?.date||localDate()}`,state,workflow:copy(workflow||{items:{},release:null}),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}];setList(id,items);setActive(id,id2);return items[0];}
    let a=activeId(id);if(!items.some(w=>w.id===a)){a=items[0].id;setActive(id,a);}return items.find(w=>w.id===a)||items[0];
  }
  function save(){
    if(restoring||!input)return;const id=factoryId();if(!id)return;const ws=ensure(id,input);if(!ws)return;const items=list(id),i=items.findIndex(w=>w.id===ws.id);if(i<0)return;items[i]={...items[i],state:stateFromInput(input),workflow:copy(workflow||{items:{},release:null}),updatedAt:new Date().toISOString()};setList(id,items);
  }
  function load(wsId,id=factoryId(),navigate=true,saveBefore=true){
    const p=profile(id),ws=list(id).find(w=>w.id===wsId);if(!p||!ws)return;if(saveBefore)save();setActive(id,wsId);restoring=true;input=inputFromState(p,ws.state);workflow=copy(ws.workflow||{items:{},release:null});input.suppliers||=[];input.materials||=[];input.recipes||=[];input.purchaseOrders||=[];input.orders||=[];result=null;restoring=false;recalc();window.BatchWattWorkspaceUI?.render();if(navigate)location.hash='#today';
  }
  function create(name,date,mode='fresh'){
    const id=factoryId(),p=profile(id);if(!id||!p)return null;save();let state,flow;if(mode==='duplicate'){state=stateFromInput(input);flow=copy(workflow||{items:{},release:null});}else{state=freshState(p);flow={items:{},release:null};}state.shift={...(state.shift||{}),date};const ws={id:uid(),name,state,workflow:flow,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};const items=list(id);items.push(ws);setList(id,items);load(ws.id,id,true,false);return ws;
  }
  function rename(wsId,name){const id=factoryId(),items=list(id),ws=items.find(w=>w.id===wsId);if(!ws||!name?.trim())return;ws.name=name.trim();ws.updatedAt=new Date().toISOString();setList(id,items);window.BatchWattWorkspaceUI?.render();}
  function duplicate(wsId){const id=factoryId(),items=list(id),src=items.find(w=>w.id===wsId);if(!src)return;save();const ws={...copy(src),id:uid(),name:`${src.name} copy`,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};items.push(ws);setList(id,items);load(ws.id,id,true,false);}
  function remove(wsId){
    const id=factoryId(),items=list(id);if(items.length<=1)return false;const wasActive=activeId(id)===wsId;const remaining=items.filter(w=>w.id!==wsId);setList(id,remaining);if(wasActive)load(remaining[0].id,id,true,false);else window.BatchWattWorkspaceUI?.render();return true;
  }
  function syncFactory(){const id=factoryId();if(!id)return;const ws=ensure(id,input);if(ws)load(ws.id,id,false,false);}

  const priorPersist=persist;persist=function(){const v=priorPersist.apply(this,arguments);save();return v;};
  const priorRecalc=recalc;recalc=function(){const v=priorRecalc.apply(this,arguments);window.BatchWattWorkspaceUI?.render();return v;};
  document.addEventListener('change',e=>{if(e.target?.id==='factory-profile-select'||e.target?.id==='fp-profile-select'){save();setTimeout(syncFactory,0);}},true);
  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{const id=factoryId();if(id){ensure(id,input);const a=activeId(id);if(a)load(a,id,false,false);}},0));
  window.BatchWattWorkspaces={list:()=>copy(list()),activeId:()=>activeId(),active:()=>copy(list().find(w=>w.id===activeId())||null),save,load,create,rename,duplicate,remove,ensure,syncFactory};
})();