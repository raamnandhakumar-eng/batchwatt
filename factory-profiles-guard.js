/* Small guard for profile deletion so one factory workspace cannot overwrite another. */
'use strict';
(function(){
  const PROFILE_KEY='batchwatt_v5_factory_profiles';
  const ACTIVE_KEY='batchwatt_v5_active_factory_profile';
  const WORKSPACE_KEY='batchwatt_v5_factory_workspaces';
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}};
  const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const copy=x=>JSON.parse(JSON.stringify(x));
  function fromMaster(profile){const m=copy(profile.master||{});return {...m,factory:profile.name,shift:{date:localDate(),start:m.shift?.start||'08:00',end:m.shift?.end||'17:00'},energy:{...(m.energy||{})},orders:[],purchaseOrders:[]};}
  document.addEventListener('click',e=>{
    const button=e.target.closest('#fp-delete');if(!button)return;
    e.preventDefault();e.stopImmediatePropagation();
    const list=read(PROFILE_KEY,[]),active=localStorage.getItem(ACTIVE_KEY)||'',current=list.find(p=>p.id===active);if(!current||list.length<=1)return;
    if(!confirm(`Delete the factory profile “${current.name}” and its saved workspace?`))return;
    const remaining=list.filter(p=>p.id!==active),next=remaining[0];write(PROFILE_KEY,remaining);
    const ws=read(WORKSPACE_KEY,{});delete ws[active];const target=ws[next.id];write(WORKSPACE_KEY,ws);localStorage.setItem(ACTIVE_KEY,next.id);
    input=target?.input?copy(target.input):fromMaster(next);workflow=target?.workflow?copy(target.workflow):{items:{},release:null};result=null;recalc();location.hash='#today';
  },true);
})();
