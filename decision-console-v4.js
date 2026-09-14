/* BatchWatt V4 presentation layer: what -> when -> energy -> release. */
'use strict';
(function(){
  const fmt=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(Number(n||0));
  const mins=t=>{const [h,m]=String(t||'00:00').split(':').map(Number);return (h||0)*60+(m||0);};
  const e=x=>typeof esc==='function'?esc(x):String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const moneySafe=n=>typeof money==='function'?money(Number(n||0)):`$${Number(n||0).toFixed(2)}`;
  const decisions=()=>[...(result?.decisions||[])].sort((a,b)=>mins(a.recommendedStart)-mins(b.recommendedStart));
  const jobFor=id=>result?.proposed?.jobs?.find(j=>j.id===id);

  function mount(){
    const start=document.querySelector('.simple-start');
    const plan=document.querySelector('.simple-plan');
    const energy=document.querySelector('.simple-energy');
    if(!start||!plan||!energy)return;

    start.innerHTML=`
      <div class="simple-start-copy">
        <p class="eyebrow">DAILY DECISION FLOW</p>
        <h2>Orders in. Production plan out.</h2>
        <p class="subtle">BatchWatt protects due times first, checks peak demand second, then chooses the lower modeled energy and demand-cost schedule.</p>
      </div>
      <div class="simple-start-actions">
        <button class="primary big" data-simple-go="add-order">+ Add order</button>
        <button class="quiet" data-simple-go="orders">Paste / import orders</button>
        <button class="quiet" data-simple-demo="rkg">Load sample plan</button>
      </div>
      <div class="workflow-steps" aria-label="BatchWatt workflow">
        <span><b>1</b> Orders</span><i>→</i><span><b>2</b> Sequence</span><i>→</i><span><b>3</b> Energy</span><i>→</i><span><b>4</b> Release</span>
      </div>`;

    if(!document.getElementById('decision-strip-v4')){
      const strip=document.createElement('section');
      strip.id='decision-strip-v4';
      strip.className='decision-strip';
      strip.setAttribute('aria-label','Current production decision');
      plan.insertAdjacentElement('beforebegin',strip);
    }

    const planEyebrow=plan.querySelector('.eyebrow');
    const planTitle=plan.querySelector('h2');
    const planSub=plan.querySelector('.panel-head .subtle');
    if(planEyebrow)planEyebrow.textContent='PRODUCTION PLAN';
    if(planTitle)planTitle.textContent='What to produce, at what time';
    if(planSub)planSub.textContent='One sequence built from due times, stock, material readiness, line capacity, peak target and tariff timing.';

    if(!plan.querySelector('.decision-logic')){
      const logic=document.createElement('div');
      logic.className='decision-logic';
      logic.innerHTML='<strong>Decision order:</strong><span>1. Protect dispatch</span><span>2. Respect peak target</span><span>3. Minimize modeled energy + demand cost</span>';
      plan.appendChild(logic);
    }

    const energyTitle=energy.querySelector('h2');
    const energySub=energy.querySelector('.panel-head .subtle');
    if(energyTitle)energyTitle.textContent='Does the production plan fit the power constraint?';
    if(energySub)energySub.textContent='Check planned peak, headroom and shift energy. Open the load chart only when you need the detail.';
    const energySummary=energy.querySelector('details summary');
    if(energySummary)energySummary.textContent='Show baseline vs recommended load';
  }

  function renderStrip(){
    const box=document.getElementById('decision-strip-v4');
    if(!box)return;
    if(!result){
      box.innerHTML=`
        <article><span>WHAT</span><strong>Add an order</strong><small>Demand drives the plan.</small></article>
        <article><span>WHEN</span><strong>Calculated automatically</strong><small>Due time and capacity come first.</small></article>
        <article><span>ENERGY</span><strong>Checked before release</strong><small>Peak and tariff exposure stay visible.</small></article>`;
      return;
    }
    const list=decisions();
    const first=list[0];
    const blocked=(result.proposed?.unscheduled||[]).length;
    const peak=Number(result.proposed?.peakKw||0);
    const target=Number(input?.energy?.peakLimitKw||0);
    box.innerHTML=`
      <article><span>WHAT</span><strong>${first?`${e(first.product)} · ${fmt(first.quantity)} ${e(first.unit)}`:(blocked?'Resolve blocked production':'Stock covers demand')}</strong><small>${list.length} scheduled run${list.length===1?'':'s'}${blocked?` · ${blocked} blocked`:''}</small></article>
      <article><span>WHEN</span><strong>${first?`${e(first.recommendedStart)}–${e(first.recommendedEnd)}`:'No new run needed'}</strong><small>${first?e(first.line):'Check orders and stock'}</small></article>
      <article class="${peak>target?'decision-alert':''}"><span>ENERGY</span><strong>${fmt(peak)} kW peak</strong><small>${peak<=target?`${fmt(target-peak)} kW headroom`:`${fmt(peak-target)} kW above ${fmt(target)} kW target`}</small></article>`;
  }

  function renderSchedule(){
    const box=document.getElementById('simple-runs');
    if(!box||!result)return;
    const list=decisions();
    const blocked=result.proposed?.unscheduled||[];
    const rows=list.map((d,i)=>{
      const job=jobFor(d.orderId);
      return `<div class="schedule-row">
        <span class="run-order">${i+1}</span>
        <div class="schedule-product"><strong>${e(d.product)}</strong><small>${fmt(d.quantity)} ${e(d.unit)} · ${e(d.line)}</small></div>
        <div><span class="schedule-label">TIME</span><strong>${e(d.recommendedStart)}–${e(d.recommendedEnd)}</strong></div>
        <div><span class="schedule-label">ENERGY</span><strong>${fmt(job?.kw)} kW</strong><small>${fmt(job?.kwh)} kWh · ${moneySafe(d.proposedUsageCost||0)}</small></div>
        <div class="schedule-reason"><span class="schedule-label">WHY</span><small>${e(d.reason||'Scheduled under current constraints.')}</small></div>
      </div>`;
    }).join('');
    const holds=blocked.map(j=>`<div class="run-blocked v4-blocked"><div><strong>${e(j.product||'Blocked run')}</strong><span>${e(j.reason||'Resolve blocker')}</span></div><button class="quiet" data-simple-go="${String(j.reason||'').includes('Material shortage')?'buy':'more'}">Fix blocker</button></div>`).join('');
    box.innerHTML=(rows?`<div class="schedule-list">${rows}</div>`:'')+holds;
  }

  function relabelEnergy(){
    const kpis=document.getElementById('simple-energy-kpis');
    if(!kpis||!result)return;
    const cards=kpis.children;
    if(cards[2]){
      const span=cards[2].querySelector('span');
      const strong=cards[2].querySelector('strong');
      const small=cards[2].querySelector('small');
      if(span)span.textContent='Shift energy';
      if(strong)strong.textContent=`${fmt(result.proposed?.kwh)} kWh`;
      if(small)small.textContent=`${moneySafe(result.proposed?.usageCost)} modeled energy charge`;
    }
  }

  function render(){mount();renderStrip();renderSchedule();relabelEnergy();}
  const previous=recalc;
  recalc=function(){const value=previous.apply(this,arguments);render();return value;};
  document.addEventListener('DOMContentLoaded',render);
})();