/* BatchWatt unified Today console: decisions + energy insights + production timing. */
'use strict';
(function(){
  const fmt=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(Number(n||0));

  function mount(){
    if(document.getElementById('unified-console')) return;
    const next=document.getElementById('next-action');
    if(!next) return;

    const wrap=document.createElement('div');
    wrap.id='unified-console';
    wrap.innerHTML=`
      <section class="panel decision-console-simple">
        <div class="panel-head">
          <div><p class="eyebrow">01 / ORDERS & STOCK</p><h2>Start with your orders</h2><p class="subtle">Add demand and check finished stock. Your production plan updates automatically.</p></div>
          <span id="simple-status" class="status-pill neutral">Waiting for plan</span>
        </div>
        <div id="simple-actions" class="simple-actions"></div>
      </section>

      <section class="panel energy-insights-simple">
        <div class="panel-head">
          <div><p class="eyebrow">03 / ENERGY</p><h2>Energy for this plan</h2><p class="subtle">Estimated electricity use and cost for the recommended schedule.</p></div>
          <span id="simple-energy-status" class="status-pill neutral">No plan</span>
        </div>
        <div id="simple-energy-kpis" class="simple-energy-kpis"></div>
        <div class="energy-chart-wrap"><svg id="simple-energy-chart" viewBox="0 0 920 280" role="img" aria-label="Planned power load by time"></svg></div>
        <p class="chart-legend"><span>━ Recommended load</span><span>┄ Baseline load</span><span>Shading: peak tariff hours</span></p><div id="simple-energy-insight" class="energy-insight-callout"></div>
        <div class="simple-energy-inputs">
          <h3>Adjust power and rates</h3>
          <div id="simple-energy-fields" class="today-energy-inputs"></div>
        </div>
      </section>

      <section class="panel simple-production-decisions">
        <div class="panel-head">
          <div><p class="eyebrow">02 / PRODUCTION</p><h2>What to make and when</h2><p class="subtle">Follow these runs in start-time order. Blocked work stays visible below.</p></div>
          <span id="simple-saving" class="status-pill neutral">Lowest feasible cost</span>
        </div>
        <div id="simple-decision-list" class="simple-decision-list"></div>
      </section>`;
    next.insertAdjacentElement('afterend',wrap);
    wrap.querySelector('.energy-insights-simple').before(wrap.querySelector('.simple-production-decisions'));
    next.hidden=true;

    // Hide the older duplicate run-plan panel; release and issues remain below as the final action step.
    const oldRun=wrap.nextElementSibling;
    if(oldRun?.classList.contains('panel') && oldRun.querySelector('#run-list')) oldRun.hidden=true;
  }

  function actionCard(title,detail,tone='neutral',button='',target=''){
    return `<article class="simple-action ${tone}"><div><span>${esc(title)}</span><strong>${esc(detail)}</strong></div>${button?`<button class="quiet" data-simple-go="${esc(target)}">${esc(button)}</button>`:''}</article>`;
  }

  function renderActions(){
    const box=document.getElementById('simple-actions');
    const status=document.getElementById('simple-status');
    if(!box||!status) return;

    if(!result){
      status.textContent=(input?.orders||[]).length?'Complete setup':'Add orders';
      status.className='status-pill neutral';
      box.innerHTML=actionCard('1. Orders','Add or import customer orders','neutral','Open Orders','orders');
      return;
    }

    const summary=ops();
    const rel=release();
    const buys=(result.procurement?.requirements||[]).filter(x=>Number(x.toBuy)>0);
    const first=result.decisions?.[0];
    const rows=orderRows();
    const risky=rows.filter(r=>['Blocked','Late','Overdue'].includes(r.status));

    let label='Ready to release',tone='good';
    if(summary.criticalCount||summary.blockedOrders||summary.peakBreach){label='Needs action';tone='bad';}
    else if(rel.isReleased){label='Released';}
    else if(rel.isStale){label='Changed after release';tone='warn';}
    status.textContent=label;status.className=`status-pill ${tone}`;

    box.innerHTML=[
      actionCard('Customer orders',`${rows.length} orders · ${risky.length} need attention`,risky.length?'warn':'neutral','Edit orders','orders'),
      actionCard('Finished stock','Check what is already available','neutral','Update stock','more'),
      actionCard('Production',`${result.decisions?.length||0} scheduled runs`,summary.blockedOrders?'warn':'good','Add order','add-order')
    ].join('');
  }

  function renderEnergyFields(){
    const box=document.getElementById('simple-energy-fields');
    if(!box||!input?.energy) return;
    const fields=[
      ['baseKw','Background load','kW'],['peakLimitKw','Peak target','kW'],
      ['rate','Off-peak rate','$/kWh'],['peakRate','Peak rate','$/kWh']
    ];
    box.innerHTML=fields.map(([key,label,unit])=>`<label>${esc(label)}<span>${esc(unit)}</span><input data-energy="${key}" type="number" min="0" step="any" required value="${esc(input.energy[key])}"></label>`).join('');
  }

  function mins(t){const [h,m]=String(t||'00:00').split(':').map(Number);return h*60+m;}

  function renderChart(){
    const svg=document.getElementById('simple-energy-chart');
    if(!svg) return;
    const profile=result?.proposed?.profile||[];
    if(!profile.length){svg.innerHTML='<text x="24" y="44" class="chart-empty">Add orders to generate the energy load chart.</text>';return;}

    const w=920,h=280,left=58,right=24,top=24,bottom=42;
    const baseline=result?.baseline?.profile||[];
    const maxKw=Math.max(Number(input.energy.peakLimitKw||0),...baseline.map(x=>Number(x.kw||0)),...profile.map(x=>Number(x.kw||0)),1)*1.15;
    const x=i=>left+(i/Math.max(profile.length-1,1))*(w-left-right);
    const y=v=>top+(1-v/maxKw)*(h-top-bottom);
    const points=profile.map((s,i)=>`${x(i)},${y(Number(s.kw||0))}`).join(' ');
    const target=Number(input.energy.peakLimitKw||0);
    const targetY=y(target);
    const start=mins(input.energy.peakStart),end=mins(input.energy.peakEnd);
    const inPeak=m=>start===end?false:start<end?(m>=start&&m<end):(m>=start||m<end);
    const slotWidth=(w-left-right)/Math.max(profile.length-1,1);
    const shade=profile.map((s,i)=>inPeak(Number(s.minute))?`<rect x="${x(i)}" y="${top}" width="${Math.min(slotWidth,w-right-x(i))}" height="${h-top-bottom}" class="peak-shade"/>`:'').join('');
    const baselinePoints=baseline.map((s,i)=>`${x(i)},${y(Number(s.kw||0))}`).join(' ');
    const ticks=[0,Math.floor((profile.length-1)/2),profile.length-1].map(i=>`<text x="${x(i)}" y="${h-14}" text-anchor="middle" class="chart-label">${esc(profile[i].time)}</text>`).join('');
    svg.innerHTML=`<title>Recommended and baseline power load</title>${shade}<polyline points="${baselinePoints}" class="baseline-line"/><line x1="${left}" y1="${targetY}" x2="${w-right}" y2="${targetY}" class="limit-line"/><text x="${w-right}" y="${Math.max(14,targetY-7)}" text-anchor="end" class="limit-label">Peak target ${fmt(target)} kW</text><polyline points="${points}" class="load-line"/><line x1="${left}" y1="${h-bottom}" x2="${w-right}" y2="${h-bottom}" class="axis"/><text x="8" y="${top+6}" class="chart-label">${fmt(maxKw)} kW</text><text x="22" y="${h-bottom+4}" class="chart-label">0</text>${ticks}`;
  }

  function renderEnergy(){
    const kpis=document.getElementById('simple-energy-kpis');
    const insight=document.getElementById('simple-energy-insight');
    const status=document.getElementById('simple-energy-status');
    if(!kpis||!insight||!status) return;
    renderEnergyFields();renderChart();

    if(!result){
      status.textContent='No plan';status.className='status-pill neutral';
      kpis.innerHTML='<div><span>Planned peak</span><strong>—</strong></div><div><span>Energy cost</span><strong>—</strong></div><div><span>Modeled saving</span><strong>—</strong></div><div><span>Jobs shifted</span><strong>—</strong></div>';
      insight.textContent='BatchWatt compares feasible production times after orders are loaded.';
      return;
    }

    const peak=Number(result.proposed.peakKw||0),target=Number(input.energy.peakLimitKw||0),headroom=target-peak;
    const saving=Number(result.comparison?.totalModeledOperatingSaving||0);
    const shifted=Number(result.comparison?.shiftedJobs||0);
    status.textContent=headroom>=0?'Inside peak target':'Peak target exceeded';
    status.className=`status-pill ${headroom>=0?'good':'bad'}`;
    kpis.innerHTML=`
      <div><span>Planned peak</span><strong>${fmt(peak)} kW</strong><small>${headroom>=0?'+':''}${fmt(headroom)} kW headroom</small></div>
      <div><span>Energy cost</span><strong>${money(result.proposed.usageCost)}</strong><small>shift estimate</small></div>
      <div><span>Modeled saving</span><strong>${money(saving)}</strong><small>energy + conditional demand</small></div>
      <div><span>Electricity use</span><strong>${fmt(result.proposed.kwh)} kWh</strong><small>${shifted} runs shifted for lower cost</small></div>`;

    if(headroom<0) insight.textContent=`Peak target is exceeded by ${fmt(Math.abs(headroom))} kW. Review overlapping high-load runs.`;
    else if(shifted>0&&saving>0) insight.textContent=`Shift ${shifted} production run${shifted===1?'':'s'} to lower-cost timing for ${money(saving)} modeled saving, without worse dispatch performance.`;
    else if(Number(result.comparison?.peakReductionKw||0)>0) insight.textContent=`Recommended sequencing lowers planned peak by ${fmt(result.comparison.peakReductionKw)} kW without dropping scheduled work.`;
    else insight.textContent='No lower-cost schedule was found by this planner while preserving dispatch performance.';
  }

  function renderDecisions(){
    const list=document.getElementById('simple-decision-list');
    const saving=document.getElementById('simple-saving');
    if(!list||!saving) return;

    const decisions=[...(result?.decisions||[])].sort((a,b)=>mins(a.recommendedStart)-mins(b.recommendedStart));
    const total=Number(result?.comparison?.totalModeledOperatingSaving||0);
    saving.textContent=total>0?`${money(total)} modeled saving`:'Delivery → peak load → energy cost';
    saving.className=`status-pill ${total>0?'good':'neutral'}`;

    if(!result){list.innerHTML='<div class="empty">Add orders to generate the production plan.</div>';return;}
    const blocked=result.proposed.unscheduled||[];
    const holds=blocked.map(j=>`<article class="production-hold"><strong>${esc(j.product)} · ${esc(j.customer)}</strong><p>${esc(j.reason)}</p><button class="quiet" data-simple-go="${String(j.reason).includes('Material shortage')?'buy':'more'}">Resolve blocker</button></article>`).join('');
    if(!decisions.length){list.innerHTML=holds||'<div class="empty">No production is required; current orders can be covered from finished stock.</div>';return;}

    list.innerHTML=decisions.map((d,i)=>{
      const moved=Number(d.shiftedMinutes||0)!==0;
      const job=result.proposed.jobs.find(j=>j.id===d.orderId);
      const runPeak=Math.max(0,...result.proposed.profile.filter(s=>s.minute>=job?.start&&s.minute<job?.end).map(s=>s.kw));
      return `<article class="simple-decision-row">
        <div class="decision-number">${i+1}</div>
        <div class="decision-product"><strong>${esc(d.product)}</strong><span>${fmt(d.quantity)} ${esc(d.unit)} · ${esc(d.line)}</span></div>
        <div class="decision-time"><span>Start → Finish</span><strong>${esc(d.recommendedStart)}–${esc(d.recommendedEnd)}</strong></div>
        <div class="decision-why"><span>Why</span><strong>${esc(d.reason)}</strong></div>
        <div class="decision-run-cost"><span>${fmt(job?.kw)} kW machine · ${fmt(job?.kwh)} kWh</span><strong>${money(d.proposedUsageCost||0)}</strong><small>Factory peak during run: ${fmt(runPeak)} kW</small>${moved?`<small>shifted ${Math.abs(Number(d.shiftedMinutes))} min</small>`:''}</div>
      </article>`;
    }).join('')+holds;
  }

  function render(){mount();renderActions();renderEnergy();renderDecisions();}

  const priorRecalc=recalc;
  recalc=function(){const v=priorRecalc.apply(this,arguments);render();return v;};
  document.addEventListener('click',e=>{const b=e.target.closest('[data-simple-go]');if(b){if(b.dataset.simpleGo==='add-order')openOrder();else goto(b.dataset.simpleGo);};});
  document.addEventListener('DOMContentLoaded',render);
})();
