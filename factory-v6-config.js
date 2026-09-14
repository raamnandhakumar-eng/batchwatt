/* V6 factory configuration overlay: eligible lines + line-specific product rates. */
'use strict';
(function(){
  const PROFILE_KEY='batchwatt_v5_factory_profiles';
  const ACTIVE_KEY='batchwatt_v5_active_factory_profile';
  const escV=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  let pending=null;

  function productOptions(p){
    if(Array.isArray(p.lineOptions)&&p.lineOptions.length)return p.lineOptions;
    if(Array.isArray(p.lineIds)&&p.lineIds.length)return p.lineIds.map(lineId=>({lineId,rate:Number(p.rate)}));
    return p.lineId?[{lineId:p.lineId,rate:Number(p.rate)}]:[];
  }

  function liveInput(){return typeof input!=='undefined'?input:null;}

  function render(){
    const box=document.getElementById('fp-products'),state=liveInput();
    if(!box||!state)return;
    box.querySelectorAll('.fp-product').forEach(row=>{
      if(row.querySelector('.v6-line-options'))return;
      const p=(state.products||[]).find(x=>x.id===row.dataset.id);if(!p)return;
      const selected=new Map(productOptions(p).map(x=>[x.lineId,Number(x.rate||p.rate||0)]));
      const wrap=document.createElement('div');wrap.className='v6-line-options';
      wrap.innerHTML=`<div class="v6-line-title"><strong>Eligible lines</strong><small>BatchWatt may choose any checked line. Set the production rate for this product on each line.</small></div><div class="v6-line-grid">${(state.lines||[]).map(l=>`<label class="v6-line-option"><input type="checkbox" data-v6-line="${escV(l.id)}" ${selected.has(l.id)?'checked':''}><span>${escV(l.name)}</span><input type="number" min="0.000001" step="any" data-v6-rate="${escV(l.id)}" value="${escV(selected.get(l.id)??p.rate??100)}" aria-label="${escV(p.name)} rate on ${escV(l.name)}"><small>units/hr</small></label>`).join('')}</div>`;
      row.appendChild(wrap);
    });
  }

  function capture(){
    pending={};
    document.querySelectorAll('#fp-products .fp-product').forEach(row=>{
      const opts=[];
      row.querySelectorAll('[data-v6-line]').forEach(cb=>{
        if(!cb.checked)return;
        const lineId=cb.dataset.v6Line,rateInput=[...row.querySelectorAll('[data-v6-rate]')].find(x=>x.dataset.v6Rate===lineId),rate=Number(rateInput?.value);
        if(Number.isFinite(rate)&&rate>0)opts.push({lineId,rate});
      });
      pending[row.dataset.id]=opts;
    });
  }

  function persistSnapshot(){
    const state=liveInput();
    if(!pending||!state)return;
    for(const p of state.products||[]){
      const opts=pending[p.id];if(!opts||!opts.length)continue;
      p.lineOptions=opts;
      p.lineIds=opts.map(x=>x.lineId);
      p.lineId=opts[0].lineId;
      p.rate=opts[0].rate;
    }
    try{
      const list=JSON.parse(localStorage.getItem(PROFILE_KEY)||'[]'),active=localStorage.getItem(ACTIVE_KEY),i=list.findIndex(x=>x.id===active);
      if(i>=0){list[i].master.products=JSON.parse(JSON.stringify(state.products||[]));list[i].updatedAt=new Date().toISOString();localStorage.setItem(PROFILE_KEY,JSON.stringify(list));}
    }catch{}
    pending=null;
    try{recalc();}catch{}
    render();
  }

  function hookSave(){
    const btn=document.getElementById('fp-save');if(!btn||btn.dataset.v6Lines)return;
    btn.dataset.v6Lines='true';
    btn.addEventListener('click',()=>capture(),true);
    btn.addEventListener('click',()=>setTimeout(persistSnapshot,0));
  }

  function apply(){render();hookSave();}
  const priorRecalc=typeof recalc==='function'?recalc:null;
  if(priorRecalc)recalc=function(){const v=priorRecalc.apply(this,arguments);setTimeout(apply,0);return v;};
  document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,0));
  window.addEventListener('hashchange',()=>setTimeout(apply,0));
})();
