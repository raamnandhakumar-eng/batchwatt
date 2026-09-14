/* BatchWatt simple Today console: start -> plan -> energy -> release. */
'use strict';
(function(){
  const fmt = n => new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(Number(n||0));
  const safeMoney = n => typeof money === 'function' ? money(Number(n||0)) : `$${Number(n||0).toFixed(2)}`;
  const mins = t => { const [h,m] = String(t||'00:00').split(':').map(Number); return (h||0)*60+(m||0); };
  const escText = x => typeof esc === 'function' ? esc(x) : String(x ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function decisions(){
    return [...(result?.decisions||[])].sort((a,b)=>mins(a.recommendedStart)-mins(b.recommendedStart));
  }

  function state(){
    const summary = typeof ops === 'function' ? ops() : {};
    const rel = typeof release === 'function' ? release() : {};
    const rows = typeof orderRows === 'function' ? orderRows() : [];
    const risky = rows.filter(r=>['Blocked','Late','Overdue'].includes(r.status));
    let label='Ready', tone='good';
    if(summary.criticalCount||summary.blockedOrders||summary.peakBreach){ label='Needs attention'; tone='bad'; }
    else if(rel.isReleased){ label='Released'; }
    else if(rel.isStale){ label='Review again'; tone='warn'; }
    return {summary,rel,rows,risky,label,tone};
  }

  function mount(){
    if(document.getElementById('unified-console')) return;
    const next=document.getElementById('next-action');
    if(!next) return;

    const wrap=document.createElement('div');
    wrap.id='unified-console';
    wrap.innerHTML=`
      <section class="panel simple-start">
        <div class="simple-start-copy">
          <p class="eyebrow">BATCHWATT</p>
          <h2>Plan today’s production in a few clicks</h2>
          <p class="subtle">Add orders or open a demo. BatchWatt tells you what to make, when to run it, and whether the plan stays inside your peak target.</p>
        </div>
        <div class="simple-start-actions">
          <button class="primary big" data-simple-go="add-order">+ Add order</button>
          <button class="quiet" data-simple-demo="rkg">Try RKG demo</button>
          <button class="quiet" data-simple-demo="pr">Try PR demo</button>
        </div>
      </section>

      <section class="panel simple-plan">
        <div class="panel-head">
          <div>
            <p class="eyebrow">TODAY'S PLAN</p>
            <h2>What to make and when</h2>
          </div>
          <span id="simple-plan-status" class="status-pill neutral">Add orders</span>
        </div>
        <div id="simple-next-run" class="simple-next-run"></div>
        <div id="simple-timeline" class="simple-timeline"></div>
        <div id="simple-runs" class="simple-runs"></div>
      </section>

      <section class="panel simple-energy">
        <div class="panel-head">
          <div>
            <p class="eyebrow">ENERGY CHECK</p>
            <h2>Is this a good time to run it?</h2>
            <p class="subtle">See the peak, headroom and modeled shift cost. Open the chart only if you want more detail.</p>
          </div>
          <span id="simple-energy-status" class="status-pill neutral">No plan</span>
        </div>
        <div id="simple-energy-kpis" class="simple-energy-kpis"></div>
        <div id="simple-energy-message" class="simple-energy-message"></div>
        <details class="simple-details">
          <summary>Show load chart and energy assumptions</summary>
          <div class="energy-chart-wrap"><svg id="simple-energy-chart" viewBox="0 0 920 280" role="img" aria-label="Recommended and baseline facility power load"></svg></div>
          <p class="chart-legend"><span>Recommended load</span><span>Baseline load</span><span>Peak tariff hours shaded</span></p>
          <div id="simple-energy-fields" class="today-energy-inputs"></div>
        </details>
      </section>`;

    next.insertAdjacentElement('afterend',wrap);
    next.hidden=true;

    const oldRun=wrap.nextElementSibling;
    if(oldRun?.classList.contains('panel') && oldRun.querySelector('#run-list')) oldRun.hidden=true;
  }

  function renderNextRun(){
    const box=document.getElementById('simple-next-run');
    const status=document.getElementById('simple-plan-status');
    if(!box||!status) return;

    if(!result){
      status.textContent='Add orders'; status.className='status-pill neutral';
      box.innerHTML='<div class="simple-empty"><strong>No plan yet.</strong><span>Add one customer order or try a demo.</span></div>';
      return;
    }

    const s=state();
    status.textContent=s.label; status.className=`status-pill ${s.tone}`;
    const list=decisions();
    if(!list.length){
      const blocked=(result.proposed?.unscheduled||[]).length>0;
      box.innerHTML=`<div class="simple-empty"><strong>${blocked?'Production is blocked.':'No production is needed.'}</strong><span>${blocked?'Open the issue below and fix the blocker before release.':'Finished stock covers the loaded demand.'}</span></div>`;
      return;
    }

    const d=list[0];
    const job=result.proposed?.jobs?.find(j=>j.id===d.orderId);
    const next=list[1];
    box.innerHTML=`
      <div class="next-run-main">
        <div>
          <span class="next-run-label">DO THIS NEXT</span>
          <h3>${escText(d.product)}</h3>
          <p>${fmt(d.quantity)} ${escText(d.unit)} · ${escText(d.line)}</p>
        </div>
        <div class="next-run-time">
          <span>Run</span>
          <strong>${escText(d.recommendedStart)}–${escText(d.recommendedEnd)}</strong>
        </div>
      </div>
      <div class="next-run-why"><strong>Why:</strong> ${escText(d.reason||'Highest-priority feasible run under the current constraints.')}</div>
      <div class="next-run-meta">
        <span>${fmt(job?.kw)} kW machine</span>
        <span>${fmt(job?.kwh)} kWh</span>
        <span>${safeMoney(d.proposedUsageCost||0)} modeled run cost</span>
        ${next?`<span>Then ${escText(next.product)} at ${escText(next.recommendedStart)}</span>`:''}
      </div>`;
  }

  function renderTimeline(){
    const box=document.getElementById('simple-timeline');
    if(!box) return;
    const list=decisions();
    if(!result||!list.length){ box.innerHTML=''; return; }

    const start=mins(input?.shift?.start||list[0].recommendedStart);
    const end=mins(input?.shift?.end||list[list.length-1].recommendedEnd);
    const span=Math.max(1,end-start);
    const rows=list.map((d,i)=>{
      const a=mins(d.recommendedStart), b=mins(d.recommendedEnd);
      const left=Math.max(0,Math.min(100,((a-start)/span)*100));
      const width=Math.max(3,Math.min(100-left,((b-a)/span)*100));
      return `<div class="timeline-row">
        <span class="timeline-name">${i+1}. ${escText(d.product)}</span>
        <div class="timeline-track"><div class="timeline-bar" style="left:${left}%;width:${width}%">${escText(d.recommendedStart)}</div></div>
      </div>`;
    }).join('');
    box.innerHTML=rows;
  }

  function renderRuns(){
    const box=document.getElementById('simple-runs');
    if(!box) return;
    if(!result){ box.innerHTML=''; return; }
    const list=decisions();
    const blocked=result.proposed?.unscheduled||[];
    const runRows=list.slice(1).map((d,i)=>`
      <div class="run-row">
        <span class="run-order">${i+2}</span>
        <div><strong>${escText(d.product)}</strong><span>${fmt(d.quantity)} ${escText(d.unit)} · ${escText(d.line)}</span></div>
        <strong class="run-time">${escText(d.recommendedStart)}–${escText(d.recommendedEnd)}</strong>
      </div>`).join('');
    const holds=blocked.map(j=>`<div class="run-blocked"><strong>${escText(j.product||'Blocked run')}</strong><span>${escText(j.reason||'Resolve blocker')}</span><button class="quiet" data-simple-go="${String(j.reason||'').includes('Material shortage')?'buy':'more'}">Fix</button></div>`).join('');
    box.innerHTML=(runRows?`<details class="simple-details compact"><summary>Show the rest of today’s runs (${list.length-1})</summary>${runRows}</details>`:'')+holds;
  }

  function renderEnergyFields(){
    const box=document.getElementById('simple-energy-fields');
    if(!box||!input?.energy) return;
    const fields=[
      ['baseKw','Background load','kW'],
      ['peakLimitKw','Peak target','kW'],
      ['rate','Off-peak rate','$/kWh'],
      ['peakRate','Peak rate','$/kWh']
    ];
    box.innerHTML=fields.map(([key,label,unit])=>`<label>${escText(label)}<span>${escText(unit)}</span><input data-energy="${key}" type="number" min="0" step="any" required value="${escText(input.energy[key])}"></label>`).join('');
  }

  function renderChart(){
    const svg=document.getElementById('simple-energy-chart');
    if(!svg) return;
    const profile=result?.proposed?.profile||[];
    if(!profile.length){ svg.innerHTML='<text x="24" y="44" class="chart-empty">Add orders to generate the load chart.</text>'; return; }

    const baseline=result?.baseline?.profile||[];
    const w=920,h=280,left=58,right=24,top=24,bottom=42;
    const maxKw=Math.max(Number(input.energy.peakLimitKw||0),...baseline.map(x=>Number(x.kw||0)),...profile.map(x=>Number(x.kw||0)),1)*1.15;
    const x=i=>left+(i/Math.max(profile.length-1,1))*(w-left-right);
    const y=v=>top+(1-v/maxKw)*(h-top-bottom);
    const points=profile.map((s,i)=>`${x(i)},${y(Number(s.kw||0))}`).join(' ');
    const baselinePoints=baseline.map((s,i)=>`${x(i)},${y(Number(s.kw||0))}`).join(' ');
    const target=Number(input.energy.peakLimitKw||0), targetY=y(target);
    const peakStart=mins(input.energy.peakStart), peakEnd=mins(input.energy.peakEnd);
    const inPeak=m=>peakStart===peakEnd?false:peakStart<peakEnd?(m>=peakStart&&m<peakEnd):(m>=peakStart||m<peakEnd);
    const slotWidth=(w-left-right)/Math.max(profile.length-1,1);
    const shade=profile.map((s,i)=>inPeak(Number(s.minute))?`<rect x="${x(i)}" y="${top}" width="${Math.min(slotWidth,w-right-x(i))}" height="${h-top-bottom}" class="peak-shade"/>`:'').join('');
    const ticks=[0,Math.floor((profile.length-1)/2),profile.length-1].map(i=>`<text x="${x(i)}" y="${h-14}" text-anchor="middle" class="chart-label">${escText(profile[i].time)}</text>`).join('');
    svg.innerHTML=`<title>Recommended and baseline facility power load</title>${shade}<polyline points="${baselinePoints}" class="baseline-line"/><line x1="${left}" y1="${targetY}" x2="${w-right}" y2="${targetY}" class="limit-line"/><text x="${w-right}" y="${Math.max(14,targetY-7)}" text-anchor="end" class="limit-label">Target ${fmt(target)} kW</text><polyline points="${points}" class="load-line"/><line x1="${left}" y1="${h-bottom}" x2="${w-right}" y2="${h-bottom}" class="axis"/>${ticks}`;
  }

  function renderEnergy(){
    const kpis=document.getElementById('simple-energy-kpis');
    const status=document.getElementById('simple-energy-status');
    const message=document.getElementById('simple-energy-message');
    if(!kpis||!status||!message) return;
    renderEnergyFields(); renderChart();

    if(!result){
      status.textContent='No plan'; status.className='status-pill neutral';
      kpis.innerHTML='<div><span>Planned peak</span><strong>—</strong></div><div><span>Peak headroom</span><strong>—</strong></div><div><span>Shift cost</span><strong>—</strong></div>';
      message.innerHTML='<strong>Add orders to calculate energy impact.</strong>';
      return;
    }

    const peak=Number(result.proposed?.peakKw||0);
    const target=Number(input.energy.peakLimitKw||0);
    const headroom=target-peak;
    const saving=Number(result.comparison?.totalModeledOperatingSaving||0);
    const shifted=Number(result.comparison?.shiftedJobs||0);
    status.textContent=headroom>=0?'Inside peak target':'Peak target exceeded';
    status.className=`status-pill ${headroom>=0?'good':'bad'}`;
    kpis.innerHTML=`
      <div><span>Planned peak</span><strong>${fmt(peak)} kW</strong><small>Target ${fmt(target)} kW</small></div>
      <div><span>Peak headroom</span><strong>${headroom>=0?'+':''}${fmt(headroom)} kW</strong><small>${headroom>=0?'Available':'Over target'}</small></div>
      <div><span>Shift cost</span><strong>${safeMoney(result.proposed?.usageCost)}</strong><small>${fmt(result.proposed?.kwh)} kWh</small></div>`;

    if(headroom<0){
      message.innerHTML=`<strong>Action needed:</strong> planned peak is ${fmt(Math.abs(headroom))} kW above the target. Review overlapping runs before release.`;
    } else if(shifted>0 && saving>0){
      message.innerHTML=`<strong>Good to run:</strong> ${shifted} run${shifted===1?' was':'s were'} shifted for ${safeMoney(saving)} modeled operating savings while preserving the planner's due-time priority.`;
    } else {
      message.innerHTML='<strong>Good to run:</strong> the recommended plan is inside the configured peak target under the current assumptions.';
    }
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

  function render(){
    mount();
    renderNextRun();
    renderTimeline();
    renderRuns();
    renderEnergy();
  }

  const priorRecalc=recalc;
  recalc=function(){ const value=priorRecalc.apply(this,arguments); render(); return value; };

  document.addEventListener('click',e=>{
    const demo=e.target.closest('[data-simple-demo]');
    if(demo){ loadDemo(demo.dataset.simpleDemo); return; }
    const button=e.target.closest('[data-simple-go]');
    if(!button) return;
    if(button.dataset.simpleGo==='add-order') openOrder();
    else if(typeof goto==='function') goto(button.dataset.simpleGo);
  });

  document.addEventListener('DOMContentLoaded',render);
})();
