/* BatchWatt recruiter-first Today console: production timing + energy impact + decision rationale. */
'use strict';
(function(){
  const fmt=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(Number(n||0));
  const safeMoney=n=>typeof money==='function'?money(Number(n||0)):`$${Number(n||0).toFixed(2)}`;
  const mins=t=>{const [h,m]=String(t||'00:00').split(':').map(Number);return (h||0)*60+(m||0);};

  function mount(){
    if(document.getElementById('unified-console')) return;
    const next=document.getElementById('next-action');
    if(!next) return;

    const wrap=document.createElement('div');
    wrap.id='unified-console';
    wrap.innerHTML=`
      <section class="panel recruiter-hero">
        <div class="recruiter-hero-head">
          <div>
            <p class="eyebrow">ENERGY-AWARE PRODUCTION PLANNING</p>
            <h2>What should we produce next?</h2>
            <p class="subtle">BatchWatt connects orders, stock, production constraints and electricity assumptions into one release decision.</p>
          </div>
          <div class="demo-actions" aria-label="Illustrative demos">
            <button class="quiet" data-simple-demo="rkg">Try RKG demo</button>
            <button class="quiet" data-simple-demo="pr">Try PR demo</button>
          </div>
        </div>
        <div id="today-recommendation" class="today-recommendation"></div>
      </section>

      <section class="panel simple-production-decisions">
        <div class="panel-head">
          <div><p class="eyebrow">01 / PRODUCTION</p><h2>What to make and when</h2><p class="subtle">Runs are ordered by recommended start time. BatchWatt protects due times first, then peak exposure, then modeled electricity cost.</p></div>
          <span id="simple-saving" class="status-pill neutral">Waiting for plan</span>
        </div>
        <div id="production-timeline" class="production-timeline"></div>
        <div id="simple-decision-list" class="simple-decision-list"></div>
      </section>

      <section class="panel energy-insights-simple">
        <div class="panel-head">
          <div><p class="eyebrow">02 / ENERGY IMPACT</p><h2>What the schedule does to facility load</h2><p class="subtle">Compare the recommended load profile with the baseline schedule and configured peak target.</p></div>
          <span id="simple-energy-status" class="status-pill neutral">No plan</span>
        </div>
        <div id="simple-energy-kpis" class="simple-energy-kpis"></div>
        <div class="energy-chart-wrap"><svg id="simple-energy-chart" viewBox="0 0 920 280" role="img" aria-label="Recommended and baseline facility power load by time"></svg></div>
        <p class="chart-legend"><span>━ Recommended load</span><span>┄ Baseline load</span><span>Shading: peak tariff hours</span></p>
        <div id="simple-energy-insight" class="energy-insight-callout"></div>
        <details class="simple-energy-inputs">
          <summary>Energy assumptions</summary>
          <p class="subtle">Change background load, peak target and tariffs to recalculate the same production plan.</p>
          <div id="simple-energy-fields" class="today-energy-inputs"></div>
        </details>
      </section>

      <section class="panel decision-impact-panel">
        <div class="panel-head">
          <div><p class="eyebrow">03 / WHY THIS SCHEDULE</p><h2>Decision impact</h2><p class="subtle">A concise explanation of the trade-off BatchWatt is making.</p></div>
          <span id="decision-impact-status" class="status-pill neutral">No comparison</span>
        </div>
        <div id="decision-impact" class="decision-impact"></div>
      </section>

      <section class="panel decision-console-simple">
        <div class="panel-head">
          <div><p class="eyebrow">04 / READY TO RUN?</p><h2>Orders, exceptions and release readiness</h2><p class="subtle">Resolve blockers, review the plan, then release the shift.</p></div>
          <span id="simple-status" class="status-pill neutral">Waiting for plan</span>
        </div>
        <div id="simple-actions" class="simple-actions"></div>
      </section>

      <section class="panel integration-strip-panel">
        <div class="panel-head">
          <div><p class="eyebrow">INTEGRATION MODEL</p><h2>One decision layer across operations and energy</h2></div>
        </div>
        <div class="integration-strip" aria-label="BatchWatt integration model">
          <div><span>Inputs</span><strong>Orders · stock · lines · machine kW · tariffs · peak target</strong></div>
          <b aria-hidden="true">→</b>
          <div><span>Decision layer</span><strong>Dispatch risk · sequencing · peak constraint · cost comparison</strong></div>
          <b aria-hidden="true">→</b>
          <div><span>Outputs</span><strong>Production timing · load profile · exceptions · shift release</strong></div>
        </div>
      </section>`;

    next.insertAdjacentElement('afterend',wrap);
    next.hidden=true;

    const oldRun=wrap.nextElementSibling;
    if(oldRun?.classList.contains('panel') && oldRun.querySelector('#run-list')) oldRun.hidden=true;
  }

  function actionCard(title,detail,tone='neutral',button='',target=''){
    return `<article class="simple-action ${tone}"><div><span>${esc(title)}</span><strong>${esc(detail)}</strong></div>${button?`<button class="quiet" data-simple-go="${esc(target)}">${esc(button)}</button>`:''}</article>`;
  }

  function sortedDecisions(){
    return [...(result?.decisions||[])].sort((a,b)=>mins(a.recommendedStart)-mins(b.recommendedStart));
  }

  function summaryState(){
    const summary=typeof ops==='function'?ops():{};
    const rel=typeof release==='function'?release():{};
    const rows=typeof orderRows==='function'?orderRows():[];
    const risky=rows.filter(r=>['Blocked','Late','Overdue'].includes(r.status));
    let label='Ready to release',tone='good';
    if(summary.criticalCount||summary.blockedOrders||summary.peakBreach){label='Needs action';tone='bad';}
    else if(rel.isReleased){label='Released';}
    else if(rel.isStale){label='Changed after release';tone='warn';}
    return {summary,rel,rows,risky,label,tone};
  }

  function renderHero(){
    const box=document.getElementById('today-recommendation');
    if(!box) return;
    const decisions=sortedDecisions();
    if(!result){
      box.innerHTML=`<div class="recommendation-empty"><strong>Add orders or load a demo.</strong><span>BatchWatt will return the next production run, recommended timing, facility peak and energy impact.</span><button class="primary" data-simple-go="add-order">Add customer order</button></div>`;
      return;
    }
    const state=summaryState();
    if(!decisions.length){
      const covered=(result.proposed?.unscheduled||[]).length===0;
      box.innerHTML=`<div class="recommendation-main"><div><span class="rec-label">TODAY'S DECISION</span><h3>${covered?'No production required':'Production blocked'}</h3><p>${covered?'Current finished stock covers the loaded production requirement.':'Resolve the blockers below before releasing the shift.'}</p></div><span class="status-pill ${covered?'good':'bad'}">${covered?'Stock covers demand':'Action required'}</span></div>`;
      return;
    }
    const d=decisions[0];
    const job=result.proposed?.jobs?.find(j=>j.id===d.orderId);
    const profile=result.proposed?.profile||[];
    const runPeak=Math.max(0,...profile.filter(s=>s.minute>=job?.start&&s.minute<job?.end).map(s=>Number(s.kw||0)));
    const nextRun=decisions[1];
    const moved=Number(d.shiftedMinutes||0);
    box.innerHTML=`
      <div class="recommendation-main">
        <div>
          <span class="rec-label">TODAY'S DECISION</span>
          <h3>Produce ${esc(d.product)} next</h3>
          <p><strong>${fmt(d.quantity)} ${esc(d.unit)}</strong> on ${esc(d.line)} · <strong>${esc(d.recommendedStart)}–${esc(d.recommendedEnd)}</strong></p>
        </div>
        <span class="status-pill ${state.tone}">${esc(state.label)}</span>
      </div>
      <div class="recommendation-reasons">
        <div><span>Why this timing</span><strong>${esc(d.reason||'Highest-priority feasible run')}</strong></div>
        <div><span>Machine load</span><strong>${fmt(job?.kw)} kW · ${fmt(job?.kwh)} kWh</strong></div>
        <div><span>Facility peak during run</span><strong>${fmt(runPeak)} kW</strong></div>
        <div><span>Schedule movement</span><strong>${moved?`${Math.abs(moved)} min ${moved>0?'later':'earlier'}`:'Baseline timing retained'}</strong></div>
      </div>
      ${nextRun?`<p class="next-run-note"><strong>Then:</strong> ${esc(nextRun.product)} at ${esc(nextRun.recommendedStart)}.</p>`:''}`;
  }

  function renderActions(){
    const box=document.getElementById('simple-actions');
    const status=document.getElementById('simple-status');
    if(!box||!status) return;

    if(!result){
      status.textContent=(input?.orders||[]).length?'Complete setup':'Add orders';
      status.className='status-pill neutral';
      box.innerHTML=actionCard('Customer orders','Add or import customer orders','neutral','Open Orders','orders');
      return;
    }

    const state=summaryState();
    status.textContent=state.label;
    status.className=`status-pill ${state.tone}`;
    const blocked=Number(state.summary.blockedOrders||0);
    const peakBreach=Boolean(state.summary.peakBreach);
    box.innerHTML=[
      actionCard('Customer orders',`${state.rows.length} loaded · ${state.risky.length} need attention`,state.risky.length?'warn':'good','Edit orders','orders'),
      actionCard('Production',`${result.decisions?.length||0} scheduled · ${blocked} blocked`,blocked?'bad':'good','Add order','add-order'),
      actionCard('Peak check',peakBreach?'Configured peak target is exceeded':'Plan is inside configured peak target',peakBreach?'bad':'good','Edit energy settings','more')
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

  function renderTimeline(){
    const box=document.getElementById('production-timeline');
    if(!box) return;
    const decisions=sortedDecisions();
    if(!result||!decisions.length){box.innerHTML='';return;}
    const shiftStart=mins(input?.shift?.start||decisions[0].recommendedStart);
    const shiftEnd=mins(input?.shift?.end||decisions[decisions.length-1].recommendedEnd);
    const span=Math.max(1,shiftEnd-shiftStart);
    const ticks=[0,.25,.5,.75,1].map(p=>{
      const t=shiftStart+span*p, h=Math.floor(t/60)%24, m=Math.round(t%60);
      const mm=String(m).padStart(2,'0');
      return `<span style="left:${p*100}%">${String(h).padStart(2,'0')}:${mm}</span>`;
    }).join('');
    const rows=decisions.map((d,i)=>{
      const start=mins(d.recommendedStart),end=mins(d.recommendedEnd);
      const left=Math.max(0,Math.min(100,((start-shiftStart)/span)*100));
      const width=Math.max(2,Math.min(100-left,((end-start)/span)*100));
      return `<div class="timeline-row"><span class="timeline-label">${i+1}. ${esc(d.product)}</span><div class="timeline-track"><div class="timeline-bar" style="left:${left}%;width:${width}%"><span>${esc(d.recommendedStart)}–${esc(d.recommendedEnd)}</span></div></div></div>`;
    }).join('');
    box.innerHTML=`<div class="timeline-axis">${ticks}</div>${rows}`;
  }

  function renderChart(){
    const svg=document.getElementById('simple-energy-chart');
    if(!svg) return;
    const profile=result?.proposed?.profile||[];
    if(!profile.length){svg.innerHTML='<text x="24" y="44" class="chart-empty">Add orders to generate the facility load chart.</text>';return;}

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
    svg.innerHTML=`<title>Recommended and baseline facility power load</title>${shade}<polyline points="${baselinePoints}" class="baseline-line"/><line x1="${left}" y1="${targetY}" x2="${w-right}" y2="${targetY}" class="limit-line"/><text x="${w-right}" y="${Math.max(14,targetY-7)}" text-anchor="end" class="limit-label">Peak target ${fmt(target)} kW</text><polyline points="${points}" class="load-line"/><line x1="${left}" y1="${h-bottom}" x2="${w-right}" y2="${h-bottom}" class="axis"/><text x="8" y="${top+6}" class="chart-label">${fmt(maxKw)} kW</text><text x="22" y="${h-bottom+4}" class="chart-label">0</text>${ticks}`;
  }

  function renderEnergy(){
    const kpis=document.getElementById('simple-energy-kpis');
    const insight=document.getElementById('simple-energy-insight');
    const status=document.getElementById('simple-energy-status');
    if(!kpis||!insight||!status) return;
    renderEnergyFields();renderChart();

    if(!result){
      status.textContent='No plan';status.className='status-pill neutral';
      kpis.innerHTML='<div><span>Planned peak</span><strong>—</strong></div><div><span>Peak headroom</span><strong>—</strong></div><div><span>Energy cost</span><strong>—</strong></div><div><span>Modeled saving</span><strong>—</strong></div>';
      insight.textContent='BatchWatt compares feasible production times after orders are loaded.';
      return;
    }

    const peak=Number(result.proposed?.peakKw||0),target=Number(input.energy.peakLimitKw||0),headroom=target-peak;
    const saving=Number(result.comparison?.totalModeledOperatingSaving||0);
    const shifted=Number(result.comparison?.shiftedJobs||0);
    status.textContent=headroom>=0?'Inside peak target':'Peak target exceeded';
    status.className=`status-pill ${headroom>=0?'good':'bad'}`;
    kpis.innerHTML=`
      <div><span>Planned peak</span><strong>${fmt(peak)} kW</strong><small>Target ${fmt(target)} kW</small></div>
      <div><span>Peak headroom</span><strong>${headroom>=0?'+':''}${fmt(headroom)} kW</strong><small>${headroom>=0?'Available':'Over target'}</small></div>
      <div><span>Energy cost</span><strong>${safeMoney(result.proposed?.usageCost)}</strong><small>${fmt(result.proposed?.kwh)} kWh this shift</small></div>
      <div><span>Modeled saving</span><strong>${safeMoney(saving)}</strong><small>${shifted} run${shifted===1?'':'s'} shifted</small></div>`;

    if(headroom<0) insight.textContent=`Peak target is exceeded by ${fmt(Math.abs(headroom))} kW. Review overlapping high-load runs before release.`;
    else if(shifted>0&&saving>0) insight.textContent=`The recommended sequence shifts ${shifted} run${shifted===1?'':'s'} to lower modeled cost while keeping the planner's due-time priority ahead of energy optimization.`;
    else if(Number(result.comparison?.peakReductionKw||0)>0) insight.textContent=`Recommended sequencing lowers planned peak by ${fmt(result.comparison.peakReductionKw)} kW versus the baseline sequence.`;
    else insight.textContent='No lower-cost feasible sequence was found by this heuristic under the current assumptions.';
  }

  function renderDecisions(){
    const list=document.getElementById('simple-decision-list');
    const saving=document.getElementById('simple-saving');
    if(!list||!saving) return;

    const decisions=sortedDecisions();
    const total=Number(result?.comparison?.totalModeledOperatingSaving||0);
    saving.textContent=result?(total>0?`${safeMoney(total)} modeled saving`:'Delivery → peak → cost'):'Waiting for plan';
    saving.className=`status-pill ${total>0?'good':'neutral'}`;

    if(!result){list.innerHTML='<div class="empty">Add orders to generate the production plan.</div>';return;}
    const blocked=result.proposed?.unscheduled||[];
    const holds=blocked.map(j=>`<article class="production-hold"><strong>${esc(j.product)} · ${esc(j.customer)}</strong><p>${esc(j.reason)}</p><button class="quiet" data-simple-go="${String(j.reason).includes('Material shortage')?'buy':'more'}">Resolve blocker</button></article>`).join('');
    if(!decisions.length){list.innerHTML=holds||'<div class="empty">No production is required; current demand can be covered without a new run.</div>';return;}

    list.innerHTML=decisions.map((d,i)=>{
      const moved=Number(d.shiftedMinutes||0);
      const job=result.proposed?.jobs?.find(j=>j.id===d.orderId);
      const runPeak=Math.max(0,...(result.proposed?.profile||[]).filter(s=>s.minute>=job?.start&&s.minute<job?.end).map(s=>Number(s.kw||0)));
      const chips=[
        `<span class="reason-chip">Due-time priority</span>`,
        moved?`<span class="reason-chip accent">Shifted ${Math.abs(moved)} min</span>`:'',
        `<span class="reason-chip">Peak ${fmt(runPeak)} kW</span>`
      ].filter(Boolean).join('');
      return `<article class="simple-decision-row">
        <div class="decision-number">${i+1}</div>
        <div class="decision-product"><strong>${esc(d.product)}</strong><span>${fmt(d.quantity)} ${esc(d.unit)} · ${esc(d.line)}</span><div class="reason-chips">${chips}</div></div>
        <div class="decision-time"><span>Start → Finish</span><strong>${esc(d.recommendedStart)}–${esc(d.recommendedEnd)}</strong></div>
        <div class="decision-why"><span>Why</span><strong>${esc(d.reason||'Feasible sequence under current constraints')}</strong></div>
        <div class="decision-run-cost"><span>${fmt(job?.kw)} kW machine · ${fmt(job?.kwh)} kWh</span><strong>${safeMoney(d.proposedUsageCost||0)}</strong><small>Modeled run-energy cost</small></div>
      </article>`;
    }).join('')+holds;
  }

  function renderImpact(){
    const box=document.getElementById('decision-impact');
    const status=document.getElementById('decision-impact-status');
    if(!box||!status) return;
    if(!result){
      status.textContent='No comparison';status.className='status-pill neutral';
      box.innerHTML='<div class="impact-empty">Load a demo or add orders to compare the recommended sequence with the baseline.</div>';
      return;
    }
    const proposedPeak=Number(result.proposed?.peakKw||0);
    const baselinePeak=Number(result.baseline?.peakKw||0);
    const peakDelta=baselinePeak-proposedPeak;
    const proposedKwh=Number(result.proposed?.kwh||0);
    const baselineKwh=Number(result.baseline?.kwh||0);
    const energyDelta=baselineKwh-proposedKwh;
    const saving=Number(result.comparison?.totalModeledOperatingSaving||0);
    const shifted=Number(result.comparison?.shiftedJobs||0);
    status.textContent=(peakDelta>0||saving>0)?'Schedule changed with measurable impact':'Baseline retained';
    status.className=`status-pill ${(peakDelta>0||saving>0)?'good':'neutral'}`;
    box.innerHTML=`
      <div class="impact-metrics">
        <div><span>Peak</span><strong>${fmt(baselinePeak)} → ${fmt(proposedPeak)} kW</strong><small>${peakDelta>0?`${fmt(peakDelta)} kW lower`:peakDelta<0?`${fmt(Math.abs(peakDelta))} kW higher`:'No change'}</small></div>
        <div><span>Shift energy</span><strong>${fmt(baselineKwh)} → ${fmt(proposedKwh)} kWh</strong><small>${energyDelta>0?`${fmt(energyDelta)} kWh lower`:energyDelta<0?`${fmt(Math.abs(energyDelta))} kWh higher`:'No change'}</small></div>
        <div><span>Modeled operating saving</span><strong>${safeMoney(saving)}</strong><small>${shifted} production run${shifted===1?'':'s'} moved</small></div>
      </div>
      <div class="impact-explanation">
        <strong>Decision rule</strong>
        <p>1. Protect customer due times. 2. Avoid configured peak-target breaches where feasible. 3. Choose the lower modeled electricity and conditional demand-cost sequence.</p>
        <p class="subtle">This is a sequential scheduling heuristic, not a guarantee of a globally optimal schedule.</p>
      </div>`;
  }

  function loadDemo(key){
    const scenario=window.BATCHWATT_DEMOS?.[key];
    if(!scenario) return;
    input=scenario.input();
    workflow={items:{},release:null};
    recalc();
    if(typeof goto==='function') goto('today');
    const save=document.getElementById('save-state');
    if(save) save.textContent=`${scenario.title} demo loaded`;
  }

  function render(){mount();renderHero();renderTimeline();renderDecisions();renderEnergy();renderImpact();renderActions();}

  const priorRecalc=recalc;
  recalc=function(){const v=priorRecalc.apply(this,arguments);render();return v;};
  document.addEventListener('click',e=>{
    const demo=e.target.closest('[data-simple-demo]');
    if(demo){loadDemo(demo.dataset.simpleDemo);return;}
    const b=e.target.closest('[data-simple-go]');
    if(b){if(b.dataset.simpleGo==='add-order')openOrder();else goto(b.dataset.simpleGo);}
  });
  document.addEventListener('DOMContentLoaded',render);
})();