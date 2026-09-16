/* BatchWatt V4.1 workspace shell inspired by modern manufacturing planning tools. */
'use strict';
(function(){
  const fmtKW=n=>`${new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(Number(n||0))} kW`;
  const escK=x=>typeof esc==='function'?esc(x):String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function sectionName(){
    const view=location.hash.slice(1)||'today';
    return ({today:['Make','Production schedule'],orders:['Orders','Customer demand'],energy:['Energy','Load, cost and delivery'],pilots:['Pilots','Historical evidence'],buy:['Buy','Materials & purchasing'],more:['Settings','Factory configuration'],'pilot-results':['Pilots','Historical results']})[view]||['Make','Production schedule'];
  }

  function mountShell(){
    document.body.classList.add('workspace-ui');
    const nav=document.querySelector('.tabs');
    const appbar=document.querySelector('.appbar');
    if(!nav||!appbar)return;

    if(!nav.querySelector('.workspace-brand')){
      const brand=document.createElement('div');
      brand.className='workspace-brand';
      brand.innerHTML='<span class="workspace-logo">BW</span><div><strong>BatchWatt</strong><small>Production + energy</small></div>';
      nav.prepend(brand);
      const label=document.createElement('div');
      label.className='nav-section-label'; label.textContent='OPERATIONS';
      brand.insertAdjacentElement('afterend',label);
    }

    const labels={today:'Make',orders:'Orders',energy:'Energy',pilots:'Pilots',buy:'Buy','pilot-results':'Pilots',more:'Settings'};
    nav.querySelectorAll('[data-nav]').forEach(a=>{
      const key=a.dataset.nav;
      if(labels[key])a.textContent=labels[key];
      a.dataset.icon=({today:'▦',orders:'≡',buy:'↓','pilot-results':'◫',more:'⚙'})[key]||'•';
    });

    if(!appbar.querySelector('.workspace-context')){
      const context=document.createElement('div');
      context.className='workspace-context';
      appbar.insertBefore(context,appbar.querySelector('.appbar-right'));
    }
    const [title,sub]=sectionName();
    appbar.querySelector('.workspace-context').innerHTML=`<strong>${escK(title)}</strong><span>${escK(sub)}</span>`;
  }

  function mountMakeHeader(){
    const start=document.querySelector('.simple-start');
    if(!start)return;
    const eyebrow=start.querySelector('.eyebrow');
    const title=start.querySelector('h2');
    const sub=start.querySelector('.subtle');
    if(eyebrow)eyebrow.textContent='MAKE';
    if(title)title.textContent='Production schedule';
    if(sub)sub.textContent='Prioritized from customer due times, available stock, materials, line capacity and your configured power constraints.';

    if(!document.querySelector('.make-subnav')){
      const subnav=document.createElement('div');
      subnav.className='make-subnav';
      subnav.innerHTML='<button class="active" type="button">Schedule</button><a href="#orders">Orders</a><a href="#buy">Material readiness</a><a href="#more">Energy settings</a>';
      start.insertAdjacentElement('beforebegin',subnav);
    }
  }

  function scheduleState(d){
    const job=result?.proposed?.jobs?.find(j=>j.id===d.orderId);
    if(!job)return {label:'Blocked',tone:'bad'};
    if(Number(job.lateMinutes)>0)return {label:'Late',tone:'bad'};
    return {label:'Scheduled',tone:'good'};
  }

  function renderScheduleTable(){
    const box=document.getElementById('simple-runs');
    if(!box)return;
    if(!result){box.innerHTML='';return;}
    const rows=[...(result.decisions||[])].sort((a,b)=>String(a.recommendedStart).localeCompare(String(b.recommendedStart)));
    const blocked=result.proposed?.unscheduled||[];
    if(!rows.length&&!blocked.length){
      box.innerHTML='<div class="schedule-empty">No production run is required. Available finished stock covers the loaded demand.</div>';
      return;
    }
    const table=rows.length?`<div class="production-table-wrap"><table class="production-table"><thead><tr><th>#</th><th>Product / customer</th><th>Qty</th><th>Line</th><th>Start</th><th>Finish</th><th>Power</th><th>Status</th></tr></thead><tbody>${rows.map((d,i)=>{
      const job=result.proposed.jobs.find(j=>j.id===d.orderId);
      const state=scheduleState(d);
      return `<tr><td class="priority-cell"><span class="drag-handle">⋮⋮</span>${i+1}</td><td><strong>${escK(d.product)}</strong><small>${escK(d.customer||d.orderId)}</small></td><td>${escK(d.quantity)} ${escK(d.unit)}</td><td>${escK(d.line)}</td><td><strong>${escK(d.recommendedStart)}</strong></td><td>${escK(d.recommendedEnd)}</td><td><strong>${fmtKW(job?.kw)}</strong><small>${Number(job?.kwh||0).toFixed(1)} kWh</small></td><td><span class="table-status ${state.tone}">${state.label}</span></td></tr>`;
    }).join('')}</tbody></table></div>`:'';
    const holds=blocked.length?`<div class="blocked-section"><div class="blocked-heading"><strong>Blocked production</strong><span>${blocked.length}</span></div>${blocked.map(j=>`<div class="blocked-row"><div><strong>${escK(j.product||j.id)}</strong><small>${escK(j.customer||j.id)}</small></div><p>${escK(j.reason||'Resolve the production blocker.')}</p><button class="quiet" data-simple-go="${String(j.reason||'').includes('Material shortage')?'buy':'more'}">Resolve</button></div>`).join('')}</div>`:'';
    box.innerHTML=table+holds;
  }

  function compactPlan(){
    const plan=document.querySelector('.simple-plan');
    if(!plan)return;
    plan.classList.add('schedule-panel');
    const logic=plan.querySelector('.decision-logic');
    if(logic&&!logic.closest('details')){
      const detail=document.createElement('details');
      detail.className='planning-logic-detail';
      detail.innerHTML='<summary>Scheduling logic</summary>';
      logic.replaceWith(detail);
      detail.appendChild(logic);
    }
    const next=document.getElementById('simple-next-run');
    if(next)next.classList.add('schedule-next');
  }

  function render(){
    mountShell();
    mountMakeHeader();
    compactPlan();
    renderScheduleTable();
  }

  const priorRecalc=recalc;
  recalc=function(){const value=priorRecalc.apply(this,arguments);render();return value;};
  window.addEventListener('hashchange',()=>{mountShell();});
  document.addEventListener('DOMContentLoaded',render);
})();