/* BatchWatt V4.3 operational pipeline: input -> validation -> model -> feasibility -> risk -> sequence -> planner. */
'use strict';
(function(){
  const escP=x=>typeof esc==='function'?esc(x):String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(Number(n||0));
  const moneyP=n=>typeof money==='function'?money(Number(n||0)):`$${Number(n||0).toFixed(2)}`;

  function orderStatusMap(){
    if(typeof orderRows!=='function')return new Map();
    return new Map(orderRows().map(r=>[r.id,r]));
  }

  function dueHours(order){
    const due=Date.parse(order?.due||'');
    if(!Number.isFinite(due))return 999;
    const start=Date.parse(`${input?.shift?.date||''}T${input?.shift?.start||'00:00'}`);
    if(!Number.isFinite(start))return 999;
    return (due-start)/36e5;
  }

  function riskScore(order,statusRow){
    let score=0;
    const status=String(statusRow?.status||'');
    const priority=String(order?.priority||'Standard');
    const detail=String(statusRow?.detail||'');
    if(status==='Blocked')score+=45;
    if(status==='Late'||status==='Overdue')score+=40;
    if(status==='Needs plan')score+=25;
    if(priority==='Urgent')score+=25;
    else if(priority==='High')score+=15;
    const h=dueHours(order);
    if(h<=2)score+=20; else if(h<=4)score+=12; else if(h<=8)score+=6;
    if(/material shortage|packaging|recipe/i.test(detail))score+=15;
    return Math.min(100,score);
  }

  function riskTone(score){return score>=65?'critical':score>=35?'watch':'normal';}

  function pipelineState(){
    const orders=input?.orders||[];
    const statuses=orderStatusMap();
    const scored=orders.map(o=>({order:o,row:statuses.get(o.id),score:riskScore(o,statuses.get(o.id))})).sort((a,b)=>b.score-a.score||String(a.order.due).localeCompare(String(b.order.due)));
    const blocked=scored.filter(x=>['Blocked','Late','Overdue','Needs plan'].includes(String(x.row?.status||'')));
    const materialShort=(result?.proposed?.unscheduled||[]).filter(x=>/material shortage|packaging|recipe/i.test(String(x.reason||'')));
    const runs=result?.proposed?.jobs||[];
    const peak=Number(result?.proposed?.peakKw||0);
    const target=Number(input?.energy?.peakLimitKw||0);
    const kwh=Number(result?.proposed?.kwh||0);
    return {orders,scored,blocked,materialShort,runs,peak,target,kwh};
  }

  function mount(){
    const today=document.getElementById('today');
    const start=today?.querySelector('.simple-start');
    if(!today||!start)return;
    document.body.classList.add('pipeline-ui');

    const nav=document.querySelector('[data-nav="today"]');
    if(nav)nav.textContent='Planner';
    const ctx=document.querySelector('.workspace-context');
    if(ctx&&location.hash.slice(1)!=='orders'&&location.hash.slice(1)!=='buy'&&location.hash.slice(1)!=='more'&&location.hash.slice(1)!=='pilot-results')ctx.innerHTML='<strong>Planner</strong><span>Operational decision pipeline</span>';

    if(!document.getElementById('pipeline-overview')){
      const wrap=document.createElement('div');
      wrap.id='pipeline-overview';
      wrap.innerHTML=`
        <section class="pipeline-hero">
          <div>
            <p class="eyebrow">OPERATIONAL DECISION PIPELINE</p>
            <h1>From incoming orders to an executable factory plan</h1>
            <p>BatchWatt validates incoming demand, maps it into one operational model, checks inventory and capacity, prioritizes risk, recommends a sequence, and surfaces the final plan with energy and peak-load impact.</p>
          </div>
          <div class="pipeline-actions">
            <button class="primary" data-simple-go="orders">Import orders</button>
            <button class="quiet" data-simple-go="add-order">+ Add order</button>
          </div>
        </section>
        <section class="pipeline-flow" aria-label="BatchWatt processing pipeline">
          <article data-stage="input"><span>01</span><strong>Excel / CSV / pasted orders</strong><small id="pipe-input">Waiting for orders</small></article>
          <i>→</i>
          <article data-stage="validate"><span>02</span><strong>Validation + field mapping</strong><small id="pipe-validate">Not started</small></article>
          <i>→</i>
          <article data-stage="model"><span>03</span><strong>Unified operational data model</strong><small id="pipe-model">Not started</small></article>
          <i>→</i>
          <article data-stage="feasible"><span>04</span><strong>Inventory feasibility + capacity scheduling</strong><small id="pipe-feasible">Not started</small></article>
          <i>→</i>
          <article data-stage="risk"><span>05</span><strong>Risk scoring + prioritization</strong><small id="pipe-risk">Not started</small></article>
          <i>→</i>
          <article data-stage="sequence"><span>06</span><strong>Sequence recommendations</strong><small id="pipe-sequence">Not started</small></article>
          <i>→</i>
          <article data-stage="dashboard"><span>07</span><strong>Planner dashboard</strong><small id="pipe-dashboard">Waiting for plan</small></article>
        </section>
        <section class="planner-kpis" id="planner-kpis"></section>
        <section class="pipeline-panel" id="risk-priority-panel">
          <div class="pipeline-panel-head"><div><p class="eyebrow">RISK + PRIORITY</p><h2>Orders needing attention first</h2></div><span id="risk-count" class="status-pill neutral">0 risks</span></div>
          <div id="risk-priority-list" class="risk-priority-list"></div>
        </section>`;
      start.insertAdjacentElement('beforebegin',wrap);
    }

    start.hidden=true;
    const subnav=document.querySelector('.make-subnav');
    if(subnav)subnav.hidden=true;
    const decision=document.querySelector('.decision-strip');
    if(decision)decision.hidden=true;

    const plan=document.querySelector('.simple-plan');
    if(plan){
      const h=plan.querySelector('h2'); if(h)h.textContent='Recommended production sequence';
      const e=plan.querySelector('.eyebrow'); if(e)e.textContent='SEQUENCE RECOMMENDATIONS';
    }
    const energy=document.querySelector('.simple-energy');
    if(energy){
      const h=energy.querySelector('h2'); if(h)h.textContent='Energy and peak-load impact';
      const e=energy.querySelector('.eyebrow'); if(e)e.textContent='PLANNER DASHBOARD';
    }
  }

  function setStage(id,text,state){
    const el=document.getElementById(id); if(el)el.textContent=text;
    const card=el?.closest('article'); if(card){card.dataset.state=state||'idle';}
  }

  function renderPipeline(){
    if(!document.getElementById('pipeline-overview'))return;
    const s=pipelineState();
    const hasOrders=s.orders.length>0;
    const valid=hasOrders&&!!result;
    const scheduled=s.runs.length;
    const blocked=s.blocked.length;

    setStage('pipe-input',hasOrders?`${s.orders.length} order${s.orders.length===1?'':'s'} loaded`:'Import or add orders',hasOrders?'done':'active');
    setStage('pipe-validate',hasOrders?(result?'Fields validated and mapped':'Review missing / invalid setup'):'Not started',result?'done':hasOrders?'warn':'idle');
    setStage('pipe-model',result?`${input.products?.length||0} products · ${input.lines?.length||0} lines · ${input.materials?.length||0} materials`:'Not started',result?'done':'idle');
    setStage('pipe-feasible',result?`${scheduled} scheduled · ${result.proposed?.unscheduled?.length||0} blocked`:'Not started',result?(result.proposed?.unscheduled?.length?'warn':'done'):'idle');
    setStage('pipe-risk',result?`${blocked} attention item${blocked===1?'':'s'} · scored 0–100`:'Not started',result?(blocked?'warn':'done'):'idle');
    setStage('pipe-sequence',result?`${scheduled} recommended run${scheduled===1?'':'s'}`:'Not started',result?'done':'idle');
    setStage('pipe-dashboard',result?`${num(s.peak)} kW peak · ${num(s.kwh)} kWh`:'Waiting for valid plan',result?'done':'idle');

    const kpis=document.getElementById('planner-kpis');
    if(kpis){
      const headroom=s.target-s.peak;
      kpis.innerHTML=`
        <article class="kpi-risk"><span>Dispatch risks</span><strong>${blocked}</strong><small>${blocked?'Review priority queue':'No current dispatch risk'}</small></article>
        <article class="kpi-shortage"><span>Shortages / blockers</span><strong>${result?.proposed?.unscheduled?.length||0}</strong><small>${s.materialShort.length} material-related</small></article>
        <article><span>Scheduled runs</span><strong>${scheduled}</strong><small>${s.orders.length} loaded orders</small></article>
        <article class="kpi-energy"><span>Shift energy</span><strong>${num(s.kwh)} kWh</strong><small>${moneyP(result?.proposed?.usageCost||0)} modeled charge</small></article>
        <article class="kpi-peak ${headroom<0?'bad':''}"><span>Peak load</span><strong>${num(s.peak)} kW</strong><small>${headroom>=0?`${num(headroom)} kW headroom`:`${num(Math.abs(headroom))} kW over target`}</small></article>`;
    }

    const list=document.getElementById('risk-priority-list');
    const badge=document.getElementById('risk-count');
    if(badge){badge.textContent=`${blocked} risk${blocked===1?'':'s'}`;badge.className=`status-pill ${blocked?'warn':'good'}`;}
    if(list){
      if(!hasOrders){list.innerHTML='<div class="pipeline-empty">Import Excel/CSV, paste orders, or add an order to begin the pipeline.</div>';}
      else if(!s.scored.length){list.innerHTML='<div class="pipeline-empty">No orders available for prioritization.</div>';}
      else {
        list.innerHTML=s.scored.slice(0,8).map((x,i)=>{
          const p=input.products?.find(p=>p.id===x.order.productId);
          const tone=riskTone(x.score);
          const status=x.row?.status||'Needs plan';
          return `<div class="risk-row ${tone}">
            <span class="risk-rank">${i+1}</span>
            <div class="risk-main"><strong>${escP(p?.name||x.order.productId)}</strong><small>${escP(x.order.customer||x.order.id)} · due ${escP(String(x.order.due||'').replace('T',' '))}</small></div>
            <div class="risk-status"><span>${escP(status)}</span><small>${escP(x.order.priority||'Standard')}</small></div>
            <div class="risk-score"><strong>${x.score}</strong><span>/100</span></div>
          </div>`;
        }).join('');
      }
    }
  }

  function render(){mount();renderPipeline();}
  const priorRecalc=recalc;
  recalc=function(){const value=priorRecalc.apply(this,arguments);render();return value;};
  window.addEventListener('hashchange',render);
  document.addEventListener('DOMContentLoaded',render);
})();
