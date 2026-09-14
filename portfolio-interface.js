/* BatchWatt dairy interface bindings. Keeps V6 planning, workspaces, learning, and evidence intact. */
'use strict';
(function(){
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:1});
  const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:String(input?.energy?.currency||'USD'),maximumFractionDigits:2}).format(Number(n||0));
  let sampleReady=false;

  function route(){
    const allowed=['today','orders','energy','pilots','more'];
    const view=allowed.includes(location.hash.slice(1))?location.hash.slice(1):'today';
    document.querySelectorAll('[data-view]').forEach(x=>x.hidden=x.dataset.view!==view);
    document.querySelectorAll('[data-nav]').forEach(a=>a.dataset.nav===view?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current'));
    window.scrollTo(0,0);
  }

  function scheduleRows(){
    if(!result)return '<div class="dairy-empty">Try the ghee sample, then click Generate Plan.</div>';
    const rows=result.orderDecisions||[];
    if(!rows.length)return '<div class="dairy-empty">No new production is required for the loaded orders.</div>';
    return '<div class="plan-row plan-head"><span>Action</span><span>Product</span><span>Time</span><span>Line</span><span>Reason</span></div>'+
      rows.map(d=>{
        const action=String(d.action||'RUN').toUpperCase();
        const time=action==='HOLD'?'—':`${d.recommendedStart||'—'}–${d.recommendedEnd||'—'}`;
        let reason=String(d.reason||'Scheduled for the current shift.');
        reason=reason
          .replace(/whole-shift service\/energy objective/gi,'production and energy plan')
          .replace(/whole-shift sequence/gi,'production sequence')
          .replace(/beam[- ]search/gi,'planning')
          .replace(/heuristic/gi,'planning method')
          .replace(/candidate/gi,'alternative');
        return `<div class="plan-row"><span><b class="action-pill action-${action.toLowerCase()}">${esc(action)}</b></span><span><strong>${esc(d.product||d.orderId)}</strong></span><span>${esc(time)}</span><span>${esc(d.line||'—')}</span><span class="plan-reason">${esc(reason)}</span></div>`;
      }).join('');
  }

  function loadCurve(schedule){
    const p=schedule?.profile||[];
    if(!p.length)return '';
    const max=Math.max(1,...p.map(x=>Number(x.kw||0)));
    const w=820,h=130,pad=10;
    const d=p.map((x,i)=>`${i?'L':'M'}${pad+(w-pad*2)*(i/Math.max(1,p.length-1))},${h-pad-(h-pad*2)*(Number(x.kw||0)/max)}`).join(' ');
    return `<div class="load-curve"><svg viewBox="0 0 ${w} ${h}" aria-label="Recommended production load curve"><path d="${d}" fill="none" stroke="#2457d6" stroke-width="3" vector-effect="non-scaling-stroke"/><line x1="10" y1="${h-10}" x2="${w-10}" y2="${h-10}" stroke="#e4e7ec"/></svg><div><span>Shift start</span><span>Recommended load</span><span>Shift end</span></div></div>`;
  }

  function energyHtml(){
    if(!result)return '<div class="dairy-empty">Energy impact appears after Generate Plan.</div>';
    const b=result.baseline||{},p=result.proposed||{};
    const before=Number(b.usageCost||0)+Number(b.demandExposure||0);
    const after=Number(p.usageCost||0)+Number(p.demandExposure||0);
    return `<div class="energy-metrics">
      <div><span>Peak before → after</span><strong>${num(b.peakKw)} → ${num(p.peakKw)} kW</strong></div>
      <div><span>Cost before → after</span><strong>${money(before)} → ${money(after)}</strong></div>
      <div><span>kWh</span><strong>${num(p.kwh)}</strong></div>
      <div><span>Demand-charge exposure</span><strong>${Number(p.demandExposure||0)>0?money(p.demandExposure):'None modeled'}</strong></div>
    </div>
    ${loadCurve(p)}
    <details class="data-checks"><summary>View details</summary><p>Modeled usage cost: ${money(p.usageCost)}. Conditional demand-charge exposure: ${money(p.demandExposure)}. Peak target: ${num(input?.energy?.peakLimitKw)} kW.</p></details>`;
  }

  function render(){
    const orders=input?.orders?.length||0;
    const holds=result?.holds?.length||0;
    const shifted=result?.comparison?.shiftedJobs||0;
    const peak=result?.proposed?.peakKw;
    const k=document.getElementById('dairy-kpis');
    if(k)k.innerHTML=`
      <article class="kpi"><span>Orders</span><strong>${orders}</strong></article>
      <article class="kpi"><span>Holds</span><strong>${holds}</strong></article>
      <article class="kpi"><span>Shifted</span><strong>${shifted}</strong></article>
      <article class="kpi"><span>Peak kW</span><strong>${peak==null?'—':num(peak)}</strong></article>`;
    const s=document.getElementById('dairy-schedule');if(s)s.innerHTML=scheduleRows();
    const e=document.getElementById('dairy-energy-card');if(e)e.innerHTML=energyHtml();
    const ep=document.getElementById('dairy-energy-page');if(ep)ep.innerHTML=energyHtml();
    const checks=document.getElementById('dairy-data-checks');
    if(checks){
      if(result){
        const warnings=result.warnings||[];
        checks.textContent=warnings.length?warnings.join(' '):'Data checks passed for the current plan. Orders, finished stock, packaging/material feasibility, line capacity, and energy inputs were evaluated.';
      }else checks.textContent=sampleReady?'Ghee sample loaded. Click Generate Plan to validate and build the schedule.':'Load a sample or import plant data to run data checks.';
    }
    const g=document.getElementById('dairy-generate');if(g)g.textContent=result?'Recalculate Plan':'Generate Plan';
    const status=document.getElementById('plan-status');
    if(status){status.textContent=result?(holds?'Review holds':'Plan ready'):(sampleReady?'Sample ready':'Ready');status.className='status-pill '+(holds?'warn':result?'good':'neutral');}
  }

  function bind(){
    const sample=document.getElementById('dairy-sample');
    if(sample&&!sample.dataset.bound){sample.dataset.bound='1';sample.addEventListener('click',()=>{
      try{
        input=window.BATCHWATT_DEMOS?.rkg?.input?window.BATCHWATT_DEMOS.rkg.input():prepareDemo();
        workflow={items:{},release:null};result=null;sampleReady=true;
        try{persist();}catch{}
        sample.textContent='Sample Loaded';
        render();
      }catch(err){if(typeof fail==='function')fail(err.message);}
    });}
    const gen=document.getElementById('dairy-generate');
    if(gen&&!gen.dataset.bound){gen.dataset.bound='1';gen.addEventListener('click',()=>{if(typeof recalc==='function')recalc();render();});}
    const imp=document.getElementById('dairy-import');
    if(imp&&!imp.dataset.bound){imp.dataset.bound='1';imp.addEventListener('click',()=>{location.hash='orders';setTimeout(()=>document.getElementById('order-import-panel')?.scrollIntoView({behavior:'smooth'}),50);});}
  }

  function apply(){bind();render();route();}
  const prior=typeof recalc==='function'?recalc:null;
  if(prior)recalc=function(){const v=prior.apply(this,arguments);setTimeout(render,0);return v;};
  document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,0));
  window.addEventListener('hashchange',route);
})();