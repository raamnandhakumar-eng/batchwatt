/* Final terminology layer: one BatchWatt decision standard everywhere. */
'use strict';
(function(){
  const stages=['Data','Validate','Feasibility','Prioritize','Baseline','Energy','Action'];

  function standardizeHeader(){
    const head=document.querySelector('.simple-planner-head');
    if(head){
      const eyebrow=head.querySelector('.eyebrow');
      const title=head.querySelector('h1');
      const copy=head.querySelector('p:not(.eyebrow)');
      if(eyebrow)eyebrow.textContent='BATCHWATT DECISION STANDARD';
      if(title)title.textContent='From operating data to RUN, SHIFT, or HOLD';
      if(copy)copy.textContent='BatchWatt validates inputs, checks feasibility, protects delivery, builds an earliest-feasible baseline, then improves peak and modeled cost without worsening due-time performance.';
    }

    const explainer=document.getElementById('product-explainer');
    if(explainer&&!explainer.dataset.standardized){
      explainer.dataset.standardized='true';
      explainer.innerHTML=`
        <div class="product-explainer-intro"><span>ONE STANDARD FLOW</span><strong>DATA → CHECK → PLAN → ENERGY → ACTION</strong><small>Every order follows the same decision path.</small></div>
        <div class="product-step"><b>1</b><div><span>DATA</span><strong>Orders + inventory + materials + lines + energy</strong><small>Bring the operating inputs into one shared model.</small></div></div>
        <i>→</i>
        <div class="product-step"><b>2</b><div><span>CHECK + PLAN</span><strong>Validate → feasibility → priority → baseline</strong><small>Use stock first, protect due times, and build the earliest feasible plan.</small></div></div>
        <i>→</i>
        <div class="product-step"><b>3</b><div><span>ENERGY + ACTION</span><strong>Peak → modeled cost → RUN / SHIFT / HOLD</strong><small>Only shift work when delivery is not made worse.</small></div></div>`;
    }

    const context=document.querySelector('.workspace-context span');
    if(context&&(!location.hash||location.hash==='#today'))context.textContent='DATA → CHECK → PLAN → ENERGY → ACTION';
  }

  function standardizeTrace(){
    const trace=document.getElementById('decision-trace-panel');
    if(!trace)return;
    const eyebrow=trace.querySelector('.trace-head .eyebrow');
    const title=trace.querySelector('.trace-head h2');
    const copy=trace.querySelector('.trace-head p');
    if(eyebrow)eyebrow.textContent='STANDARD DECISION LOGIC';
    if(title)title.textContent='Why each order is RUN, SHIFT, or HOLD';
    if(copy)copy.textContent='Delivery first. Feasibility second. Peak third. Cost fourth.';

    const rulebar=trace.querySelector('.trace-rulebar');
    if(rulebar)rulebar.innerHTML=stages.map((stage,i)=>`${i?'<i>→</i>':''}<span><b>${i+1}</b> ${stage}</span>`).join('');

    trace.querySelectorAll('.trace-row').forEach(row=>{
      const badge=row.querySelector('.trace-status');
      if(!badge)return;
      if(row.classList.contains('blocked')){badge.textContent='HOLD';return;}
      const timing=row.children?.[1]?.querySelector('small')?.textContent||'';
      badge.textContent=/\bmin\s+(later|earlier)\b/i.test(timing)?'SHIFT':'RUN';
    });
  }

  function standardizeScenario(){
    const wrap=document.getElementById('scenario-compare');
    const heading=wrap?.querySelector('.section-mini-head span');
    const detail=wrap?.querySelector('.section-mini-head strong');
    if(heading)heading.textContent='5–6 · BASELINE + ENERGY OPTIMIZE';
    if(detail)detail.textContent='Delivery first → peak → cost';
  }

  function apply(){standardizeHeader();standardizeTrace();standardizeScenario();}
  const prior=recalc;
  recalc=function(){const value=prior.apply(this,arguments);apply();return value;};
  document.addEventListener('DOMContentLoaded',apply);
  window.addEventListener('hashchange',apply);
})();
