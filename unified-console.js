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
          <div><p class="eyebrow">DECISION CONSOLE</p><h2>What should we do today?</h2><p class="subtle">Orders first. Then production timing, buying, energy, and release.</p></div>
          <span id="simple-status" class="status-pill neutral">Waiting for plan</span>
        </div>
        <div id="simple-actions" class="simple-actions"></div>
      </section>

      <section class="panel energy-insights-simple">
        <div class="panel-head">
          <div><p class="eyebrow">ENERGY INSIGHTS</p><h2>When should we run?</h2><p class="subtle">Planned 15-minute load profile with tariff-aware timing and a peak target.</p></div>
          <span id="simple-energy-status" class="status-pill neutral">No plan</span>
        </div>
        <div id="simple-energy-kpis" class="simple-energy-kpis"></div>
        <div class="energy-chart-wrap"><svg id="simple-energy-chart" viewBox="0 0 920 280" role="img" aria-label="Planned power load by time"></svg></div>
        <div id="simple-energy-insight" class="energy-insight-callout"></div>
        <details class="simple-energy-inputs">
          <summary>Change energy assumptions</summary>
          <div id="simple-energy-fields" class="today-energy-inputs"></div>
        </details>
      </section>

      <section class="panel simple-production-decisions">
        <div class="panel-head">
          <div><p class="eyebrow">PRODUCTION PLAN</p><h2>What to make and when</h2><p class="subtle">Delivery first, then the lowest modeled operating cost that keeps the work feasible.</p></div>
          <span id="simple-saving" class="status-pill neutral">Lowest feasible cost</span>
        </div>
        <div id="simple-decision-list" class="simple-decision-list"></div>
      </section>`;
    next.insertAdjacentElement('afterend',wrap);

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
      actionCard('1. Orders',risky.length?`${risky.length} need attention`:`${rows.length} covered or scheduled`,risky.length?'bad':'good','Open','orders'),
      actionCard('2. Produce',first?`${first.product} at ${first.recommendedStart}`:'No production required',first?'good':'neutral'),
      actionCard('3. Buy',buys.length?`${buys.length} material action${buys.length===1?'':'s'}`:'Nothing to buy',buys.length?'warn':'good','Open','buy'),
      actionCard('4. Release',rel.isReleased?'Plan released':summary.releasable?'Ready for supervisor release':'Resolve blockers first',summary.releasable||rel.isReleased?'good':'warn')
    ].join('');
  }

  function renderEnergyFields(){
    const box=document.getElementById('simple-energy-fields');
    if(!box||!input?.energy) return;
    const fields=[
      ['baseKw','Background load','kW'],['peakLimitKw','Peak target','kW'],['monthlyPeakKw','Month peak','kW'],
      ['rate','Off-peak rate','$/kWh'],['peakRate','Peak rate','$/kWh'],['demandRate','Demand charge','$/kW']
    ];
    box.innerHTML=fields.map(([key,label,unit])=>`<label>${esc(label)}<span>${esc(unit)}</span><input data-energy="${key}" type="number" min="0" step="any" value="${esc(input.energy[key])}"></label>`).join('')+
      `<label>Peak starts<span>time</span><input data-energy="peakStart" type="time" step="900" value="${esc(input.energy.peakStart||'')}"></label><label>Peak ends<span>time</span><input data-energy="peakEnd" type="time" step="900" value="${esc(input.energy.peakEnd||'')}"></label>`;
  }

  function mins(t){const [h,m]=String(t||'00:00').split(':').map(Number);return h*60+m;}

  function renderChart(){
    const svg=document.getElementById('simple-energy-chart');
    if(!svg) return;
    const profile=result?.proposed?.profile||[];
    if(!profile.length){svg.innerHTML='<text x="24" y="44" class="chart-empty">Add orders to generate the energy load chart.</text>';return;}

    const w=920,h=280,left=58,right=24,top=24,bottom=42;
    const maxKw=Math.max(Number(input.energy.peakLimitKw||0),...profile.map(x=>Number(x.kw||0)),1)*1.15;
    const x=i=>left+(i/Math.max(profile.length-1,1))*(w-left-right);
    const y=v=>top+(1-v/maxKw)*(h-top-bottom);
    const points=profile.map((s,i)=>`${x(i)},${y(Number(s.kw||0))}`).join(' ');
    const target=Number(input.energy.peakLimitKw||0);
    const targetY=y(target);
    const start=mins(input.energy.peakStart),end=mins(input.energy.peakEnd);
    const inPeak=m=>start===end?false:start<end?(m>=start&&m<end):(m>=start||m<end);
    const peakIndexes=profile.map((s,i)=>inPeak(Number(s.minute))?i:-1).filter(i=>i>=0);
    let shade='';
    if(peakIndexes.length){
      const a=x(Math.min(...peakIndexes)),b=x(Math.max(...peakIndexes));
      shade=`<rect x="${a}" y="${top}" width="${Math.max(4,b-a)}" height="${h-top-bottom}" class="peak-shade"/>`;
    }
    const ticks=[0,Math.floor((profile.length-1)/2),profile.length-1].map(i=>`<text x="${x(i)}" y="${h-14}" text-anchor="middle" class="chart-label">${esc(profile[i].time)}</text>`).join('');
    svg.innerHTML=`${shade}<line x1="${left}" y1="${targetY}" x2="${w-right}" y2="${targetY}" class="limit-line"/><text x="${w-right}" y="${Math.max(14,targetY-7)}" text-anchor="end" class="limit-label">Peak target ${fmt(target)} kW</text><polyline points="${points}" class="load-line"/><line x1="${left}" y1="${h-bottom}" x2="${w-right}" y2="${h-bottom}" class="axis"/><text x="8" y="${top+6}" class="chart-label">${fmt(maxKw)} kW</text><text x="22" y="${h-bottom+4}" class="chart-label">0</text>${ticks}`;
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
      <div><span>Jobs shifted</span><strong>${shifted}</strong><small>for lower modeled cost</small></div>`;

    if(headroom<0) insight.textContent=`Peak target is exceeded by ${fmt(Math.abs(headroom))} kW. Review overlapping high-load runs.`;
    else if(shifted>0&&saving>0) insight.textContent=`Shift ${shifted} production run${shifted===1?'':'s'} to lower-cost timing for ${money(saving)} modeled saving, without worse dispatch performance.`;
    else if(Number(result.comparison?.peakReductionKw||0)>0) insight.textContent=`Recommended sequencing lowers planned peak by ${fmt(result.comparison.peakReductionKw)} kW without dropping scheduled work.`;
    else insight.textContent='Current timing is already the lowest modeled cost that preserves dispatch performance.';
  }

  function renderDecisions(){
    const list=document.getElementById('simple-decision-list');
    const saving=document.getElementById('simple-saving');
    if(!list||!saving) return;

    const decisions=result?.decisions||[];
    const total=Number(result?.comparison?.totalModeledOperatingSaving||0);
    saving.textContent=total>0?`${money(total)} modeled saving`:'Lowest feasible cost';
    saving.className=`status-pill ${total>0?'good':'neutral'}`;

    if(!result){list.innerHTML='<div class="empty">Add orders to generate the production plan.</div>';return;}
    if(!decisions.length){list.innerHTML='<div class="empty">No production is required; current orders can be covered from finished stock.</div>';return;}

    list.innerHTML=decisions.map((d,i)=>{
      const moved=Number(d.shiftedMinutes||0)!==0;
      return `<article class="simple-decision-row">
        <div class="decision-number">${i+1}</div>
        <div class="decision-product"><strong>${esc(d.product)}</strong><span>${fmt(d.quantity)} ${esc(d.unit)} · ${esc(d.line)}</span></div>
        <div class="decision-time"><span>Run</span><strong>${esc(d.recommendedStart)}–${esc(d.recommendedEnd)}</strong></div>
        <div class="decision-why"><span>Why</span><strong>${esc(d.reason)}</strong></div>
        <div class="decision-run-cost"><span>Run energy</span><strong>${money(d.proposedUsageCost||0)}</strong>${moved?`<small>shifted ${Math.abs(Number(d.shiftedMinutes))} min</small>`:''}</div>
      </article>`;
    }).join('');
  }

  function render(){mount();renderActions();renderEnergy();renderDecisions();}

  const priorRecalc=recalc;
  recalc=function(){const v=priorRecalc.apply(this,arguments);render();return v;};
  document.addEventListener('click',e=>{const b=e.target.closest('[data-simple-go]');if(b)goto(b.dataset.simpleGo);});
  document.addEventListener('DOMContentLoaded',render);
})();
