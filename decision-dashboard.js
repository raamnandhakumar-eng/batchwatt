/* BatchWatt decision dashboard: one management view over orders, production, procurement, energy, and release status. */
'use strict';
(function(){
  const riskStatuses = new Set(['Blocked','Late','Overdue']);
  const fmt = n => new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(Number(n||0));

  function dashboardStatus(){
    if(!result) return {label:(input?.orders||[]).length?'Needs setup':'No plan yet',tone:'neutral'};
    const s=ops();
    const r=release();
    if(s.criticalCount>0 || s.blockedOrders>0 || s.peakBreach) return {label:'Needs action',tone:'bad'};
    if(r.isReleased) return {label:'Released',tone:'good'};
    if(r.isStale) return {label:'Changed after release',tone:'warn'};
    return {label:'Ready to release',tone:'good'};
  }

  function mount(){
    if(document.getElementById('dashboard')) return;
    const tabs=document.querySelector('.tabs');
    const main=document.querySelector('main.shell');
    if(!tabs||!main) return;

    const more=tabs.querySelector('[data-nav="more"]');
    const nav=document.createElement('a');
    nav.href='#dashboard'; nav.dataset.nav='dashboard'; nav.textContent='Dashboard';
    tabs.insertBefore(nav,more||null);

    const section=document.createElement('section');
    section.className='view'; section.dataset.view='dashboard'; section.id='dashboard'; section.hidden=true;
    section.innerHTML=`
      <div class="page-head dashboard-head">
        <div><p class="eyebrow">DECISION DASHBOARD</p><h1>Factory health</h1><p class="subtle">Orders, production, procurement and energy in one operating view.</p></div>
        <div class="dashboard-head-actions"><span id="dashboard-status" class="status-pill neutral">No plan yet</span><button id="dashboard-export" class="quiet">Export dashboard</button></div>
      </div>

      <section id="dashboard-kpis" class="dashboard-kpis"></section>

      <div class="dashboard-grid">
        <section class="panel dashboard-card" id="dashboard-order-health"></section>
        <section class="panel dashboard-card" id="dashboard-energy-health"></section>
      </div>

      <div class="dashboard-grid">
        <section class="panel dashboard-card" id="dashboard-execution"></section>
        <section class="panel dashboard-card" id="dashboard-procurement"></section>
      </div>

      <section class="panel dashboard-card">
        <div class="panel-head"><div><p class="eyebrow">INTEGRATED INPUTS</p><h2>Source coverage</h2><p class="subtle">The current dashboard is generated from the active BatchWatt workspace.</p></div><span id="dashboard-freshness" class="status-pill neutral">Local workspace</span></div>
        <div id="dashboard-sources" class="source-grid"></div>
      </section>

      <section class="panel dashboard-card">
        <div class="panel-head"><div><p class="eyebrow">ATTENTION</p><h2>Top operating risks</h2></div><button class="quiet" data-dashboard-go="today">Open Today</button></div>
        <div id="dashboard-risks" class="dashboard-risks"></div>
      </section>`;
    main.appendChild(section);

    document.getElementById('dashboard-export')?.addEventListener('click',exportDashboard);
  }

  function kpi(label,value,detail,tone=''){
    return `<article class="dashboard-kpi ${tone}"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(detail)}</small></article>`;
  }

  function source(label,value,detail,ok=true){
    return `<div class="source-item"><span class="source-dot ${ok?'ok':'empty'}"></span><div><strong>${esc(label)}</strong><span>${esc(value)}</span><small>${esc(detail)}</small></div></div>`;
  }

  function render(){
    mount();
    if(!document.getElementById('dashboard')) return;

    const status=dashboardStatus();
    const statusEl=document.getElementById('dashboard-status');
    statusEl.textContent=status.label; statusEl.className=`status-pill ${status.tone}`;

    const rows=result?orderRows():[];
    const orders=input?.orders||[];
    const atRisk=rows.filter(r=>riskStatuses.has(r.status));
    const ready=rows.filter(r=>r.status==='Ready from stock');
    const scheduled=rows.filter(r=>r.status==='Scheduled');
    const jobs=result?.proposed?.jobs||[];
    const summary=result?ops():null;
    const rel=release();
    const buys=result?(result.procurement?.requirements||[]).filter(x=>Number(x.toBuy)>0):[];
    const spend=buys.reduce((s,x)=>s+Number(x.estimatedCost||0),0);
    const peak=Number(result?.proposed?.peakKw||0);
    const limit=Number(input?.energy?.peakLimitKw||0);
    const headroom=limit-peak;
    const peakPct=limit>0?Math.min(120,Math.max(0,(peak/limit)*100)):0;
    const safePct=Math.min(100,peakPct);

    document.getElementById('dashboard-kpis').innerHTML=[
      kpi('Orders',String(orders.length),`${atRisk.length} at risk`,atRisk.length?'risk':'good'),
      kpi('Production runs',String(jobs.length),`${scheduled.length} scheduled`),
      kpi('Buy actions',String(buys.length),`${money(spend)} estimated`),
      kpi('Planned peak',result?`${fmt(peak)} kW`:'—',result?`${headroom>=0?'+':''}${fmt(headroom)} kW headroom`:`Target ${fmt(limit)} kW`,headroom<0?'risk':'good'),
      kpi('Shift energy',result?`${fmt(result.proposed.kwh)} kWh`:'—',result?`${money(result.proposed.usageCost)} estimated cost`:'Waiting for plan'),
      kpi('Release',status.label,rel.isReleased?'Current plan approved':summary?.releasable?'No hard blockers':'Review blockers',status.tone==='bad'?'risk':status.tone==='good'?'good':'')
    ].join('');

    const healthTotal=Math.max(orders.length,1);
    const healthy=Math.max(0,orders.length-atRisk.length);
    const healthyPct=Math.round((healthy/healthTotal)*100);
    document.getElementById('dashboard-order-health').innerHTML=`
      <div class="panel-head"><div><p class="eyebrow">ORDER HEALTH</p><h2>Dispatch readiness</h2></div><strong class="dashboard-big">${healthyPct}%</strong></div>
      <div class="health-bar"><i style="width:${healthyPct}%"></i></div>
      <div class="dashboard-breakdown"><span><b>${ready.length}</b> from stock</span><span><b>${scheduled.length}</b> scheduled</span><span class="risk-text"><b>${atRisk.length}</b> at risk</span></div>`;

    document.getElementById('dashboard-energy-health').innerHTML=`
      <div class="panel-head"><div><p class="eyebrow">ENERGY HEALTH</p><h2>Peak-demand position</h2></div><strong class="dashboard-big ${headroom<0?'risk-text':''}">${result?`${fmt(peak)} / ${fmt(limit)} kW`:'—'}</strong></div>
      <div class="peak-track"><i class="${headroom<0?'breach':''}" style="width:${safePct}%"></i>${headroom<0?'<em>LIMIT EXCEEDED</em>':''}</div>
      <div class="dashboard-breakdown"><span><b>${fmt(input?.energy?.monthlyPeakKw)} kW</b> month peak</span><span><b>${money(input?.energy?.peakRate)}/kWh</b> peak rate</span><span><b>${money(input?.energy?.demandRate)}/kW</b> demand</span></div>`;

    const openItems=summary?.items?.filter(i=>i.state.status!=='Resolved')||[];
    document.getElementById('dashboard-execution').innerHTML=`
      <div class="panel-head"><div><p class="eyebrow">EXECUTION</p><h2>Operating cadence</h2></div><span class="status-pill ${status.tone}">${esc(status.label)}</span></div>
      <div class="execution-list">
        <div><span>Open issues</span><strong>${openItems.length}</strong></div>
        <div><span>Critical issues</span><strong>${summary?.criticalCount||0}</strong></div>
        <div><span>Blocked orders</span><strong>${summary?.blockedOrders||0}</strong></div>
        <div><span>Plan fingerprint</span><code>${esc(rel.currentFingerprint||'—')}</code></div>
      </div>`;

    document.getElementById('dashboard-procurement').innerHTML=`
      <div class="panel-head"><div><p class="eyebrow">PROCUREMENT</p><h2>Material position</h2></div><button class="quiet" data-dashboard-go="buy">Open Buying</button></div>
      ${buys.length?`<div class="dashboard-buy-list">${buys.slice(0,4).map(x=>`<div><span>${esc(x.name)}</span><strong>${fmt(x.toBuy)} ${esc(x.unit)}</strong><small>${money(x.estimatedCost)}</small></div>`).join('')}</div>`:'<div class="empty">No material purchase action is recommended.</div>'}`;

    document.getElementById('dashboard-sources').innerHTML=[
      source('Customer demand',`${orders.length} orders`,'Manual, pasted, Excel or CSV',orders.length>0),
      source('Inventory',`${(input?.materials||[]).length} materials`,'Stock and reorder positions',(input?.materials||[]).length>0),
      source('Production',`${(input?.lines||[]).length} lines · ${(input?.products||[]).length} products`,'Capacity, rate and sequence',(input?.lines||[]).length>0),
      source('Energy',`${fmt(input?.energy?.peakLimitKw)} kW target`,'Tariff, background load and demand charge',Boolean(input?.energy)),
      source('Purchasing',`${(input?.purchaseOrders||[]).length} POs`,'Supplier and receipt status',true)
    ].join('');

    document.getElementById('dashboard-risks').innerHTML=openItems.length?openItems.slice(0,6).map(i=>`
      <div class="dashboard-risk-row"><span class="risk-level ${esc(i.severity)}">${esc(i.severity)}</span><div><strong>${esc(i.title)}</strong><p>${esc(i.detail)}</p></div><button class="quiet" data-dashboard-go="${esc(route(i.action))}">Fix</button></div>`).join(''):'<div class="dashboard-clear"><strong>No active operating risks</strong><span>The current plan has no unresolved BatchWatt exception.</span></div>';
  }

  function exportDashboard(){
    const rows=result?orderRows():[];
    const summary=result?ops():null;
    const payload={
      generatedAt:new Date().toISOString(),
      factory:input?.factory||'',shift:input?.shift||{},
      status:dashboardStatus().label,
      kpis:{orders:(input?.orders||[]).length,atRiskOrders:rows.filter(r=>riskStatuses.has(r.status)).length,productionRuns:(result?.proposed?.jobs||[]).length,openIssues:summary?.openCount||0,criticalIssues:summary?.criticalCount||0,blockedOrders:summary?.blockedOrders||0},
      energy:{plannedPeakKw:result?.proposed?.peakKw??null,peakTargetKw:input?.energy?.peakLimitKw??null,peakHeadroomKw:summary?.peakHeadroomKw??null,shiftKwh:result?.proposed?.kwh??null,usageCost:result?.proposed?.usageCost??null},
      procurement:(result?.procurement?.requirements||[]).filter(x=>Number(x.toBuy)>0),
      risks:summary?.items?.filter(i=>i.state.status!=='Resolved')||[]
    };
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`batchwatt-dashboard-${input?.shift?.date||localDate()}.json`; a.click(); URL.revokeObjectURL(a.href);
  }

  const previousShowView=showView;
  showView=function(){
    const view=['today','dashboard','orders','buy','more'].includes(location.hash.slice(1))?location.hash.slice(1):'today';
    document.querySelectorAll('[data-view]').forEach(x=>x.hidden=x.dataset.view!==view);
    document.querySelectorAll('[data-nav]').forEach(a=>a.toggleAttribute('aria-current',a.dataset.nav===view));
    if(view==='dashboard') render();
    window.scrollTo(0,0);
  };

  const previousRecalc=recalc;
  recalc=function(){const value=previousRecalc.apply(this,arguments);render();return value;};

  document.addEventListener('click',e=>{const b=e.target.closest('[data-dashboard-go]');if(b)goto(b.dataset.dashboardGo);});
  document.addEventListener('DOMContentLoaded',()=>{mount();render();showView();});
})();
