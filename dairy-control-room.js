/* Dairy-focused control-room presentation for BatchWatt. Keeps the scheduling engine unchanged. */
'use strict';
(function(){
  const q=id=>document.getElementById(id);
  const fmt=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(Number(n||0));
  const usd=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(Number(n||0));

  function loadSample(){
    input=prepareDemo();
    workflow={items:{},release:null};
    recalc();
    location.hash='today';
    const s=q('save-state'); if(s) s.textContent='Ghee dairy sample loaded';
  }
  function decisionRows(){
    if(!result) return [];
    const decisions=new Map((result.decisions||[]).map(d=>[d.orderId,d]));
    const rows=(result.proposed?.jobs||[]).slice().sort((a,b)=>a.start-b.start).map(j=>{
      const d=decisions.get(j.id)||{};
      const shifted=Math.abs(Number(d.shiftedMinutes||0))>0;
      return {action:shifted?'SHIFT':'RUN',product:j.product,time:`${j.startTime}–${j.endTime}`,line:j.line||'—',reason:d.reason||(shifted?'Moved to improve peak/cost profile':'Earliest feasible run')};
    });
    for(const h of result.proposed?.unscheduled||[]) rows.push({action:'HOLD',product:h.product||h.id,time:'—',line:h.line||'—',reason:h.reason||'Resolve production constraint'});
    return rows;
  }
  function renderControlPlan(){
    if(q('kpi-orders')) q('kpi-orders').textContent=String(input?.orders?.length||0);
    const rows=decisionRows();
    if(q('kpi-holds')) q('kpi-holds').textContent=String(rows.filter(x=>x.action==='HOLD').length);
    if(q('kpi-shifted')) q('kpi-shifted').textContent=String(rows.filter(x=>x.action==='SHIFT').length);
    if(q('kpi-peak')) q('kpi-peak').textContent=result?`${fmt(result.proposed?.peakKw)}`:'—';
    const list=q('run-list');
    if(list){
      list.className='plan-grid';
      list.innerHTML=rows.length?rows.map(r=>`<div class="plan-row"><span class="status-pill action-${r.action.toLowerCase()}">${r.action}</span><strong>${esc(r.product)}</strong><span>${esc(r.time)}</span><span>${esc(r.line)}</span><span class="plan-reason">${esc(r.reason)}</span></div>`).join(''):'<div class="empty">Load the ghee sample or import orders, then generate the plan.</div>';
    }
    renderEnergyImpact();
  }
  function renderEnergyImpact(){
    const box=q('energy-impact'); if(!box) return;
    if(!result){box.innerHTML='<div class="empty">Generate a plan to see peak and cost impact.</div>';return;}
    const b=result.baseline||{}, p=result.proposed||{};
    const beforeCost=Number(b.usageCost||0)+Number(b.demandExposure||0);
    const afterCost=Number(p.usageCost||0)+Number(p.demandExposure||0);
    box.innerHTML=`<div class="energy-metrics">
      <div><span>Peak</span><strong>${fmt(b.peakKw)} → ${fmt(p.peakKw)} kW</strong></div>
      <div><span>Cost</span><strong>${usd(beforeCost)} → ${usd(afterCost)}</strong></div>
      <div><span>Energy</span><strong>${fmt(p.kwh)} kWh</strong></div>
      <div><span>Demand exposure</span><strong>${usd(p.demandExposure||0)}</strong></div>
    </div>${loadChart(b.peakKw,p.peakKw,input?.energy?.peakLimitKw)}`;
  }
  function loadChart(before,after,target){
    const max=Math.max(Number(before||0),Number(after||0),Number(target||0),1);
    const bw=Math.max(8,Math.round(Number(before||0)/max*100));
    const aw=Math.max(8,Math.round(Number(after||0)/max*100));
    return `<div class="simple-load-chart" aria-label="Peak load comparison"><div><span>Before</span><i style="width:${bw}%"></i><b>${fmt(before)} kW</b></div><div><span>Plan</span><i style="width:${aw}%"></i><b>${fmt(after)} kW</b></div><small>Peak target: ${fmt(target)} kW</small></div>`;
  }
  function renderEnergyPage(){
    if(!q('energy-page-impact')) return;
    if(!result){q('energy-page-impact').innerHTML='<div class="empty">Generate a plan first.</div>';return;}
    const b=result.baseline||{},p=result.proposed||{};
    q('energy-page-impact').innerHTML=`<div class="energy-metrics">
      <div><span>Peak before</span><strong>${fmt(b.peakKw)} kW</strong></div><div><span>Peak after</span><strong>${fmt(p.peakKw)} kW</strong></div>
      <div><span>Shift kWh</span><strong>${fmt(p.kwh)} kWh</strong></div><div><span>Demand exposure</span><strong>${usd(p.demandExposure||0)}</strong></div>
    </div>${loadChart(b.peakKw,p.peakKw,input?.energy?.peakLimitKw)}`;
  }
  const oldAll=renderAll;
  renderAll=function(){oldAll.apply(this,arguments);renderControlPlan();renderEnergyPage();};
  showView=function(){
    const raw=location.hash.slice(1);
    const view=['today','orders','energy','pilot-results','more','buy'].includes(raw)?raw:'today';
    document.querySelectorAll('[data-view]').forEach(x=>x.hidden=x.dataset.view!==view);
    document.querySelectorAll('[data-nav]').forEach(a=>a.dataset.nav===view?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current'));
    window.scrollTo(0,0);
  };
  document.addEventListener('DOMContentLoaded',()=>{
    const sample=q('try-sample'); if(sample) sample.onclick=loadSample;
    const gen=q('generate-plan'); if(gen) gen.onclick=()=>{recalc(); renderControlPlan();};
    renderControlPlan();renderEnergyPage();showView();
  });
})();