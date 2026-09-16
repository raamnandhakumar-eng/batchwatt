/* BatchWatt dairy interface bindings. Keeps V6 planning, workspaces, learning, and evidence intact. */
'use strict';
(function(){
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:1});
  const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:String(input?.energy?.currency||'USD'),maximumFractionDigits:2}).format(Number(n||0));
  let sampleReady=false;

  function route(){
    const allowed=['today','orders','energy','pilots','buy','more'];
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

  function loadCurve(){
    const p=result?.proposed?.profile||[],b=result?.baseline?.profile||[];
    if(!p.length)return '';
    const target=Number(input.energy.peakLimitKw||0),max=Math.max(1,target,...p.map(x=>x.kw),...b.map(x=>x.kw))*1.12;
    const left=55,right=805,top=20,bottom=200;
    const x=i=>left+(right-left)*i/p.length,y=v=>bottom-(bottom-top)*v/max;
    const path=rows=>rows.map((r,i)=>`${i?'L':'M'}${x(i)},${y(r.kw)} L${x(i+1)},${y(r.kw)}`).join(' ');
    const mins=t=>Number(String(t).slice(0,2))*60+Number(String(t).slice(3));
    const ps=mins(input.energy.peakStart),pe=mins(input.energy.peakEnd);
    const isPeak=m=>ps!==pe&&(ps<pe?m>=ps&&m<pe:m>=ps||m<pe);
    const shade=p.map((r,i)=>isPeak(r.minute)?`<rect x="${x(i)}" y="${top}" width="${x(i+1)-x(i)}" height="${bottom-top}" fill="#fff3dc"/>`:'').join('');
    const ticks=[0,max/2,max].map(v=>`<line x1="${left}" x2="${right}" y1="${y(v)}" y2="${y(v)}" stroke="#e4e7ec"/><text x="47" y="${y(v)+4}" text-anchor="end">${num(v)}</text>`).join('');
    return `<div class="energy-load-chart"><svg viewBox="0 0 830 240" role="img" aria-label="Baseline and recommended facility load in kW across the shift"><title>Baseline and recommended facility load, 15-minute intervals</title>${shade}${ticks}<text x="8" y="14">kW</text><path d="${path(b)}" fill="none" stroke="#68778d" stroke-width="2" stroke-dasharray="6 4"/><path d="${path(p)}" fill="none" stroke="#2457d6" stroke-width="3"/><line x1="${left}" x2="${right}" y1="${y(target)}" y2="${y(target)}" stroke="#ad5418" stroke-dasharray="3 3"/><text x="${left}" y="226">${esc(input.shift.start)}</text><text x="430" y="226" text-anchor="middle">Shift time</text><text x="${right}" y="226" text-anchor="end">${esc(input.shift.end)}</text></svg><p class="energy-legend"><span>Blue: recommended</span><span>Dashed gray: baseline</span><span>Amber line: ${num(target)} kW target</span><span>Shading: configured peak tariff hours</span></p></div>`;
  }

  function assumptionsHtml(){
    const e=input?.energy||{};
    return `<details class="data-checks energy-assumptions"><summary>Tariff and calculation assumptions</summary><dl class="energy-assumption-grid">
      <div><dt>Off-peak / peak rate</dt><dd>${money(e.rate)} / ${money(e.peakRate)} per kWh</dd></div>
      <div><dt>Peak window</dt><dd>${esc(e.peakStart)} to ${esc(e.peakEnd)} (plant time)</dd></div>
      <div><dt>Monthly demand rate</dt><dd>${money(e.demandRate)} per kW</dd></div>
      <div><dt>Month peak so far</dt><dd>${num(e.monthlyPeakKw)} kW</dd></div>
      <div><dt>Background load fallback</dt><dd>${num(e.baseKw)} kW</dd></div>
      <div><dt>Currency</dt><dd>${esc(e.currency||'USD')}</dd></div></dl>
      <p>Usage cost = sum of interval kW × 0.25 hours × interval rate. Imported rates override configured rates at matching times.</p>
      <p>Incremental demand exposure = max(0, planned peak − month peak so far) × demand rate. Any reduction is conditional on the final monthly peak. Do not multiply it by working days.</p>
      <p>Moving a run in time alone does not reduce kWh. Different lines or changeovers can change consumption. Ratchets, coincident peaks, minimum billed demand, taxes and power-factor penalties are excluded.</p>
      <a href="#more">Edit tariff and plant settings</a></details>`;
  }

  function qualityHtml(){
    const r=BatchWattEnergyReview.review(input||{},result);
    return `<div class="energy-quality">${r.checks.map(c=>`<article><strong>${esc(c.label)}</strong><span>${esc(c.status)}</span><p>${esc(c.detail)}</p></article>`).join('')}</div><p class="subtle">Input validation checks format and feasibility; it does not certify source accuracy.</p><a href="#more">Review inputs and stock-count date</a>`;
  }

  function energyHtml(detailed=false){
    if(!result)return '<div class="dairy-empty">Generate a plan to compare energy, cost and delivery.</div>'+(detailed?assumptionsHtml()+qualityHtml():'');
    const b=result.baseline,p=result.proposed,r=BatchWattEnergyReview.review(input,result);
    const rows=[
      ['Peak demand',num(b.peakKw)+' kW',num(p.peakKw)+' kW'],
      ['Consumption',num(b.kwh)+' kWh',num(p.kwh)+' kWh'],
      ['Usage cost',money(b.usageCost),money(p.usageCost)],
      ['Conditional demand exposure',money(b.demandExposure),money(p.demandExposure)],
      ['On-time orders',r.beforeOnTime+' / '+input.orders.length,r.afterOnTime+' / '+input.orders.length],
      ['Orders on hold',b.unscheduled.length,p.unscheduled.length],
      ['Late production orders',b.lateOrders,p.lateOrders]
    ];
    const difference=r.usageSaving;
    return `<p class="energy-model-label">Modeled comparison · ${esc(result.baselineLabel||'Earliest-feasible baseline')} vs recommended plan</p>
      <div class="energy-metrics"><div><span>Peak before → after</span><strong>${num(b.peakKw)} → ${num(p.peakKw)} kW</strong></div><div><span>Usage cost ${difference>=0?'reduction':'increase'}</span><strong>${money(Math.abs(difference))}</strong></div><div><span>On-time orders</span><strong>${r.beforeOnTime} → ${r.afterOnTime} / ${input.orders.length}</strong></div><div><span>Conditional demand ${r.demandSaving>=0?'reduction':'increase'}</span><strong>${money(Math.abs(r.demandSaving))}</strong></div></div>
      <p class="energy-tradeoff ${r.deliveryWarning?'needs-review':''}"><strong>${r.deliveryWarning?'Delivery needs review.':'Delivery comparison checked.'}</strong> ${esc(r.tradeoff)} ${p.unscheduled.length||p.lateOrders||p.overdueStockOrders?'Holds or late orders remain; review the schedule before release.':'All loaded orders are planned on time.'}</p>
      ${detailed?`<div class="table-wrap"><table class="energy-comparison"><caption>Same shift and input assumptions. On-time includes available finished stock; it does not prove dispatch.</caption><thead><tr><th scope="col">Measure</th><th scope="col">Before</th><th scope="col">Recommended</th></tr></thead><tbody>${rows.map(row=>`<tr>${row.map((v,i)=>i?`<td>${esc(v)}</td>`:`<th scope="row">${esc(v)}</th>`).join('')}</tr>`).join('')}</tbody></table></div>${loadCurve()}${assumptionsHtml()}<h2 class="energy-quality-title">Data quality and confidence</h2>${qualityHtml()}`:'<a class="energy-detail-link" href="#energy">Compare load curves, tariffs and data quality →</a>'}`;
  }

  function render(){
    const orders=input?.orders?.length||0;
    const holds=result?.holds?.length||0;
    const shifted=result?.comparison?.shiftedJobs||0;
    const peak=result?.proposed?.peakKw;
    const k=document.getElementById('dairy-kpis');
    if(k)k.innerHTML=`
      <article class="kpi"><span>Orders</span><strong>${orders}</strong></article>
      <article class="kpi"><span>Orders on hold</span><strong>${holds}</strong></article>
      <article class="kpi"><span>Runs shifted</span><strong>${shifted}</strong></article>
      <article class="kpi"><span>Peak kW</span><strong>${peak==null?'—':num(peak)}</strong></article>`;
    const s=document.getElementById('dairy-schedule');if(s)s.innerHTML=scheduleRows();
    const e=document.getElementById('dairy-energy-card');if(e)e.innerHTML=energyHtml();
    const ep=document.getElementById('dairy-energy-page');if(ep)ep.innerHTML=energyHtml(true);
    const checks=document.getElementById('dairy-data-checks');
    if(checks){
      if(result){
        const warnings=result.warnings||[];
        checks.innerHTML=(warnings.length?'<p>'+warnings.map(esc).join(' ')+'</p>':'<p>Planner input validation completed.</p>')+qualityHtml();
      }else checks.textContent=sampleReady?'Ghee sample loaded. Click Generate Plan to validate and build the schedule.':'Load a sample or import plant data to run data checks.';
    }
    const countDate=document.getElementById('inventory-counted-at');if(countDate)countDate.value=input?.inventoryCountedAt||'';
    const g=document.getElementById('dairy-generate');if(g)g.textContent=result?'Recalculate Plan':'Generate Plan';
    const status=document.getElementById('plan-status');
    if(status){status.textContent=result?(holds?'Review holds':'Plan ready'):(sampleReady?'Sample ready':'Ready');status.className='status-pill '+(holds?'warn':result?'good':'neutral');}
  }

  function bind(){
    const countDate=document.getElementById('inventory-counted-at');
    if(countDate&&!countDate.dataset.bound){countDate.dataset.bound='1';countDate.addEventListener('change',()=>{input.inventoryCountedAt=countDate.value;recalc();});}
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