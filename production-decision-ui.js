/* Explain what to produce, when to produce it, and why the schedule is cost-aware. */
'use strict';
(function(){
  const num=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(Number(n||0));

  function mount(){
    const dash=document.getElementById('dashboard');
    const kpis=document.getElementById('dashboard-kpis');
    if(!dash||!kpis||document.getElementById('production-decisions')) return;
    const section=document.createElement('section');
    section.id='production-decisions';
    section.className='panel production-decisions';
    section.innerHTML=`
      <div class="panel-head">
        <div><p class="eyebrow">PRODUCTION DECISIONS</p><h2>What to produce and when</h2><p class="subtle">Delivery first; then reduce peak-demand and tariff cost where feasible.</p></div>
        <span id="decision-saving" class="status-pill neutral">No modeled saving</span>
      </div>
      <div id="decision-objective" class="decision-objective"></div>
      <div id="decision-list" class="decision-list"></div>`;
    kpis.insertAdjacentElement('afterend',section);
  }

  function render(){
    mount();
    const list=document.getElementById('decision-list');
    const objective=document.getElementById('decision-objective');
    const saving=document.getElementById('decision-saving');
    if(!list||!objective||!saving) return;

    const decisions=result?.decisions||[];
    const comparison=result?.comparison||{};
    const total=Number(comparison.totalModeledOperatingSaving||0);
    saving.textContent=total>0?`${money(total)} modeled saving`:'Lowest feasible cost selected';
    saving.className='status-pill '+(total>0?'good':'neutral');

    objective.innerHTML=(result?.objective||[
      'Protect supplied order due times','Avoid peak-demand target breaches','Minimize modeled energy and demand cost'
    ]).slice(0,4).map((x,i)=>`<span><b>${i+1}</b>${esc(x)}</span>`).join('');

    if(!result){
      list.innerHTML='<div class="empty">Add orders and complete setup to generate production decisions.</div>';
      return;
    }
    if(!decisions.length){
      list.innerHTML='<div class="empty">No production is required; loaded orders may be covered from finished stock.</div>';
      return;
    }

    list.innerHTML=decisions.map(d=>{
      const moved=Number(d.shiftedMinutes||0)!==0;
      const saved=Number(d.modeledUsageSaving||0);
      return `<article class="decision-row">
        <div class="decision-when"><span>START</span><strong>${esc(d.recommendedStart)}</strong><small>to ${esc(d.recommendedEnd)}</small></div>
        <div class="decision-main">
          <div class="decision-title"><strong>${esc(d.product)}</strong><span>${num(d.quantity)} ${esc(d.unit)} · ${esc(d.line)}</span></div>
          <p>${esc(d.reason)}</p>
          <div class="decision-meta"><span>Customer: <b>${esc(d.customer)}</b></span><span>Due: <b>${esc(String(d.due).replace('T',' '))}</b></span><span>Priority: <b>${esc(d.priority)}</b></span>${d.changeoverMinutes?`<span>Changeover: <b>${num(d.changeoverMinutes)} min</b></span>`:''}</div>
        </div>
        <div class="decision-cost">
          ${moved?`<span class="shifted">Shifted ${Math.abs(Number(d.shiftedMinutes))} min ${Number(d.shiftedMinutes)>0?'later':'earlier'}</span>`:'<span>Earliest feasible</span>'}
          <strong>${money(d.proposedUsageCost||0)}</strong><small>modeled run energy</small>
          ${saved>0?`<em>${money(saved)} lower vs baseline</em>`:''}
        </div>
      </article>`;
    }).join('');

    const compare=document.createElement('div');
    compare.className='decision-comparison';
    compare.innerHTML=`
      <div><span>Usage-cost change</span><strong>${money(comparison.usageSaving||0)}</strong></div>
      <div><span>Conditional demand saving</span><strong>${money(comparison.conditionalDemandSaving||0)}</strong></div>
      <div><span>Peak reduction</span><strong>${num(comparison.peakReductionKw||0)} kW</strong></div>
      <div><span>Jobs shifted</span><strong>${num(comparison.shiftedJobs||0)}</strong></div>`;
    list.appendChild(compare);
  }

  const previousRecalc=recalc;
  recalc=function(){const value=previousRecalc.apply(this,arguments);render();return value;};
  const previousShow=showView;
  showView=function(){previousShow.apply(this,arguments);if(location.hash.slice(1)==='dashboard')render();};
  document.addEventListener('DOMContentLoaded',()=>{mount();render();});
})();
