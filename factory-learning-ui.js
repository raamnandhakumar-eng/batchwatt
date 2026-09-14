/* V6.1 factory learning UI: persist and summarize order history per factory. */
'use strict';
(function(){
  const STORE='batchwatt_v61_factory_learning';
  const ACTIVE_FACTORY='batchwatt_v5_active_factory_profile';
  const read=()=>{try{return JSON.parse(localStorage.getItem(STORE)||'{}')||{};}catch{return {};}};
  const write=x=>localStorage.setItem(STORE,JSON.stringify(x));
  const escL=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const factoryId=()=>localStorage.getItem(ACTIVE_FACTORY)||String(input?.factory||'factory');
  const weekdayName=i=>['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][i]||'';

  function observe(){
    if(!window.BatchWattFactoryLearning||!input)return null;
    const id=factoryId(),all=read(),prior=all[id]||BatchWattFactoryLearning.empty(id);
    const merged=BatchWattFactoryLearning.merge(prior,input.orders||[],input.products||[]);
    if(merged.added||merged.updated){all[id]=merged.state;write(all);}
    return merged.state;
  }
  function state(){const id=factoryId(),all=read();return all[id]||BatchWattFactoryLearning.empty(id);}
  function summary(){return BatchWattFactoryLearning.summarize(state(),input?.shift?.date||'');}

  function mount(){
    const more=document.getElementById('more');if(!more||document.getElementById('factory-learning-panel'))return;
    const panel=document.createElement('section');panel.id='factory-learning-panel';panel.className='panel compact-panel factory-learning-panel';
    const anchor=document.getElementById('factory-profile-panel');
    if(anchor)anchor.insertAdjacentElement('afterend',panel);else more.appendChild(panel);
    panel.addEventListener('click',e=>{
      if(e.target?.id!=='factory-learning-reset')return;
      if(!confirm('Reset learned order history for this factory? This does not delete current orders or factory setup.'))return;
      const all=read();delete all[factoryId()];write(all);render();
    });
  }

  function render(){
    mount();const panel=document.getElementById('factory-learning-panel');if(!panel||!window.BatchWattFactoryLearning)return;
    const s=summary(),notes=BatchWattFactoryLearning.describe(s);
    if(!s.sampleCount){
      panel.innerHTML=`<div class="panel-head"><div><p class="eyebrow">FACTORY LEARNING</p><h2>Learns from every order</h2><p class="subtle">As you load orders, BatchWatt builds a separate demand profile for this factory.</p></div></div><div class="learning-empty">No learned orders yet. Import or add orders and this profile will begin building automatically.</div><p class="learning-boundary">Orders can teach demand mix, order size, customers, priority patterns and due-time patterns. Actual line speed, changeovers and energy performance require observed production outcomes.</p>`;
      return;
    }
    const products=s.productStats.slice(0,5);
    panel.innerHTML=`<div class="panel-head"><div><p class="eyebrow">FACTORY LEARNING</p><h2>What BatchWatt has learned</h2><p class="subtle">Factory-specific patterns accumulated from loaded orders. Hard scheduling constraints still take priority.</p></div><button id="factory-learning-reset" type="button" class="quiet">Reset learning</button></div>
      <div class="learning-kpis"><div><span>Orders learned</span><strong>${s.sampleCount}</strong></div><div><span>Confidence</span><strong>${escL(s.confidence)}</strong><small>${s.confidenceScore}% sample maturity</small></div><div><span>Customers</span><strong>${s.uniqueCustomers}</strong></div><div><span>Products</span><strong>${s.uniqueProducts}</strong></div></div>
      <div class="learning-grid"><section><h3>Learned patterns</h3>${notes.length?`<ul>${notes.map(x=>`<li>${escL(x)}</li>`).join('')}</ul>`:'<p class="subtle">More orders are needed before stable patterns appear.</p>'}${s.weekdaySignal?`<div class="learning-signal"><span>Typical ${weekdayName(s.weekdaySignal.weekday)}</span><strong>${s.weekdaySignal.avgOrders} orders · ${s.weekdaySignal.avgUnits} units</strong><small>Based on ${s.weekdaySignal.observedDates} observed due dates</small></div>`:''}</section>
      <section><h3>Top product signals</h3><div class="table-wrap"><table><thead><tr><th>Product</th><th>Observed units</th><th>Avg order</th><th>P75 daily demand</th></tr></thead><tbody>${products.map(p=>`<tr><td>${escL(p.name)}</td><td>${p.units}</td><td>${p.avgQty}</td><td>${p.p75DailyUnits}</td></tr>`).join('')}</tbody></table></div></section></div>
      <p class="learning-boundary">This is demand learning from order history, not proof of machine throughput or energy savings. BatchWatt will only learn those when actual production outcomes are captured.</p>`;
  }

  function refresh(){observe();render();}
  const priorRecalc=typeof recalc==='function'?recalc:null;
  if(priorRecalc)recalc=function(){const v=priorRecalc.apply(this,arguments);setTimeout(refresh,0);return v;};
  document.addEventListener('DOMContentLoaded',()=>setTimeout(refresh,0));
  window.addEventListener('hashchange',()=>setTimeout(render,0));
  document.addEventListener('change',e=>{if(e.target?.id==='factory-profile-select'||e.target?.id==='fp-profile-select')setTimeout(refresh,0);},true);
  window.BatchWattFactoryLearningStore={state:()=>JSON.parse(JSON.stringify(state())),summary:()=>summary(),refresh};
})();
