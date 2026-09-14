/* Render live shared-model health and scheduling rationale. */
'use strict';
(function(){
  const fmt=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(Number(n||0));
  const escT=x=>typeof esc==='function'?esc(x):String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const moneyT=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:String(input?.energy?.currency||'USD'),maximumFractionDigits:2}).format(Number(n||0));

  function renderHealth(){
    const box=document.getElementById('integration-health');
    if(!box)return;
    const orders=input?.orders?.length||0, products=input?.products?.length||0, lines=input?.lines?.length||0, materials=input?.materials?.length||0;
    const energyReady=!!(input?.energy&&Number(input.energy.peakLimitKw)>0);
    const blockers=result?.proposed?.unscheduled?.length||0, warnings=result?.warnings?.length||0;
    box.innerHTML=`<div><span>ORDER DATA</span><strong>${orders}</strong><small>${orders?'Loaded':'Waiting for input'}</small></div><div><span>SHARED MODEL</span><strong>${products} products · ${lines} lines</strong><small>${materials} material records</small></div><div><span>ENERGY MODEL</span><strong>${energyReady?'Ready':'Needs setup'}</strong><small>${energyReady?`${fmt(input.energy.peakLimitKw)} kW peak target`:'Set target and rates'}</small></div><div class="${blockers||warnings?'trace-warn':'trace-good'}"><span>PLAN HEALTH</span><strong>${result?(blockers||warnings?'Review':'Ready'):'Waiting'}</strong><small>${result?`${blockers} blocked · ${warnings} warning${warnings===1?'':'s'}`:'Run after loading orders'}</small></div>`;
  }

  function renderSummary(){
    const box=document.getElementById('trace-summary');
    if(!box)return;
    if(!result){box.innerHTML='<div class="trace-empty"><strong>No plan yet.</strong><span>Load an order to run feasibility, capacity, peak and cost checks.</span></div>';return;}
    const basePeak=Number(result.baseline?.peakKw||0), planPeak=Number(result.proposed?.peakKw||0), target=Number(input?.energy?.peakLimitKw||0);
    const baseCost=Number(result.baseline?.usageCost||0)+Number(result.baseline?.demandExposure||0);
    const planCost=Number(result.proposed?.usageCost||0)+Number(result.proposed?.demandExposure||0);
    const shifted=Number(result.comparison?.shiftedJobs||0), late=Number(result.proposed?.lateOrders||0)+Number(result.proposed?.overdueStockOrders||0);
    box.innerHTML=`<div><span>PEAK</span><strong>${fmt(basePeak)} → ${fmt(planPeak)} kW</strong><small>Target ${fmt(target)} kW</small></div><div><span>MODELED COST</span><strong>${moneyT(baseCost)} → ${moneyT(planCost)}</strong><small>Energy + conditional demand exposure</small></div><div><span>SCHEDULE</span><strong>${shifted} shifted</strong><small>${late} late against supplied due times</small></div>`;
  }

  function renderRuns(){
    const box=document.getElementById('trace-runs');
    if(!box)return;
    if(!result){box.innerHTML='';return;}
    const jobs=new Map((result.proposed?.jobs||[]).map(j=>[j.id,j]));
    const rows=(result.decisions||[]).map((d,i)=>{
      const j=jobs.get(d.orderId), shifted=Number(d.shiftedMinutes||0);
      const timing=d.baselineStart&&d.baselineStart!==d.recommendedStart?`${escT(d.baselineStart)} → ${escT(d.recommendedStart)}`:escT(d.recommendedStart||'—');
      return `<div class="trace-row"><div><span class="trace-status">RUN ${i+1}</span><strong>${escT(d.product)}</strong><small>${escT(d.customer||d.orderId)} · due ${escT(String(d.due||'').replace('T',' '))}</small></div><div><span>TIME</span><strong>${timing}</strong><small>${shifted?`${Math.abs(shifted)} min ${shifted>0?'later':'earlier'}`:'Earliest feasible slot retained'}</small></div><div><span>POWER</span><strong>${fmt(j?.kw)} kW</strong><small>${fmt(j?.kwh)} kWh</small></div><div class="trace-reason"><span>WHY</span><strong>${escT(d.reason||'Scheduled under current constraints.')}</strong></div></div>`;
    }).join('');
    const blocked=(result.proposed?.unscheduled||[]).map(j=>`<div class="trace-row blocked"><div><span class="trace-status">BLOCKED</span><strong>${escT(j.product||j.id||'Order')}</strong><small>${escT(j.customer||j.id||'')}</small></div><div class="trace-reason"><span>CONSTRAINT</span><strong>${escT(j.reason||'Resolve the blocking input.')}</strong></div></div>`).join('');
    box.innerHTML=rows+blocked;
  }

  function render(){window.BatchWattDecisionTrace?.mountDecisionTrace();renderHealth();renderSummary();renderRuns();}
  const prior=recalc;
  recalc=function(){const value=prior.apply(this,arguments);render();return value;};
  document.addEventListener('DOMContentLoaded',render);
  window.addEventListener('hashchange',render);
})();
