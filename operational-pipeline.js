/* BatchWatt V4.4 simple planner: orders -> attention -> production -> energy. */
'use strict';
(function(){
  const escP=x=>typeof esc==='function'?esc(x):String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(Number(n||0));

  function orderStatusMap(){
    if(typeof orderRows!=='function')return new Map();
    return new Map(orderRows().map(r=>[r.id,r]));
  }

  function dueHours(order){
    const due=Date.parse(order?.due||'');
    const start=Date.parse(`${input?.shift?.date||''}T${input?.shift?.start||'00:00'}`);
    if(!Number.isFinite(due)||!Number.isFinite(start))return 999;
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

  function state(){
    const orders=input?.orders||[];
    const statuses=orderStatusMap();
    const scored=orders.map(o=>({order:o,row:statuses.get(o.id),score:riskScore(o,statuses.get(o.id))})).sort((a,b)=>b.score-a.score||String(a.order.due).localeCompare(String(b.order.due)));
    const attention=scored.filter(x=>x.score>=35||['Blocked','Late','Overdue','Needs plan'].includes(String(x.row?.status||'')));
    const unscheduled=result?.proposed?.unscheduled||[];
    const runs=result?.proposed?.jobs||[];
    const peak=Number(result?.proposed?.peakKw||0);
    const target=Number(input?.energy?.peakLimitKw||0);
    const kwh=Number(result?.proposed?.kwh||0);
    return {orders,scored,attention,unscheduled,runs,peak,target,kwh};
  }

  function mount(){
    const today=document.getElementById('today');
    const start=today?.querySelector('.simple-start');
    if(!today||!start)return;
    document.body.classList.add('pipeline-ui','simple-planner-ui');

    const nav=document.querySelector('[data-nav="today"]');
    if(nav)nav.textContent='Planner';
    const ctx=document.querySelector('.workspace-context');
    if(ctx&&(!location.hash||location.hash==='#today'))ctx.innerHTML='<strong>Planner</strong><span>Today’s production decisions</span>';

    if(!document.getElementById('pipeline-overview')){
      const wrap=document.createElement('div');
      wrap.id='pipeline-overview';
      wrap.innerHTML=`
        <section class="simple-planner-head">
          <div>
            <p class="eyebrow">TODAY</p>
            <h1>Plan the shift</h1>
            <p>Import orders, fix what is blocked, then run the recommended sequence.</p>
          </div>
          <div class="pipeline-actions">
            <button class="primary" data-simple-go="orders">Import orders</button>
            <button class="quiet" data-simple-go="add-order">+ Add order</button>
          </div>
        </section>

        <section class="quick-status" id="quick-status"></section>

        <section class="pipeline-panel attention-panel" id="risk-priority-panel" hidden>
          <div class="pipeline-panel-head">
            <div><p class="eyebrow">ATTENTION</p><h2>Fix these first</h2></div>
            <span id="risk-count" class="status-pill neutral">0</span>
          </div>
          <div id="risk-priority-list" class="risk-priority-list"></div>
        </section>

        <details class="pipeline-details">
          <summary>How BatchWatt builds the plan</summary>
          <div class="pipeline-flow" aria-label="BatchWatt processing pipeline">
            <article data-stage="input"><span>01</span><strong>Orders</strong><small id="pipe-input">Waiting</small></article>
            <i>→</i><article data-stage="validate"><span>02</span><strong>Validate + map</strong><small id="pipe-validate">Waiting</small></article>
            <i>→</i><article data-stage="model"><span>03</span><strong>Unified model</strong><small id="pipe-model">Waiting</small></article>
            <i>→</i><article data-stage="feasible"><span>04</span><strong>Feasibility</strong><small id="pipe-feasible">Waiting</small></article>
            <i>→</i><article data-stage="risk"><span>05</span><strong>Risk priority</strong><small id="pipe-risk">Waiting</small></article>
            <i>→</i><article data-stage="sequence"><span>06</span><strong>Sequence</strong><small id="pipe-sequence">Waiting</small></article>
            <i>→</i><article data-stage="dashboard"><span>07</span><strong>Planner</strong><small id="pipe-dashboard">Waiting</small></article>
          </div>
        </details>`;
      start.insertAdjacentElement('beforebegin',wrap);
    }

    start.hidden=true;
    const subnav=document.querySelector('.make-subnav');
    if(subnav)subnav.hidden=true;
    const decision=document.querySelector('.decision-strip');
    if(decision)decision.hidden=true;

    const plan=document.querySelector('.simple-plan');
    if(plan){
      const h=plan.querySelector('h2'); if(h)h.textContent='Production plan';
      const e=plan.querySelector('.eyebrow'); if(e)e.textContent='NEXT RUNS';
      const p=plan.querySelector('.panel-head .subtle'); if(p)p.textContent='What to make, where, and when.';
    }
    const energy=document.querySelector('.simple-energy');
    if(energy){
      const h=energy.querySelector('h2'); if(h)h.textContent='Energy check';
      const e=energy.querySelector('.eyebrow'); if(e)e.textContent='POWER';
      const p=energy.querySelector('.panel-head .subtle'); if(p)p.textContent='Peak, headroom and shift energy.';
    }
  }

  function setStage(id,text,stateName){
    const el=document.getElementById(id); if(el)el.textContent=text;
    const card=el?.closest('article'); if(card)card.dataset.state=stateName||'idle';
  }

  function renderStatus(s){
    const box=document.getElementById('quick-status');
    if(!box)return;
    const hasOrders=s.orders.length>0;
    const hasPlan=!!result;
    const headroom=s.target-s.peak;
    const urgent=s.attention.length;
    box.innerHTML=`
      <article class="quick-card ${hasOrders?'ready':'waiting'}">
        <span>ORDERS</span>
        <strong>${s.orders.length}</strong>
        <small>${hasOrders?(hasPlan?'Loaded & validated':'Needs setup'):'Import Excel, CSV or pasted orders'}</small>
      </article>
      <article class="quick-card ${urgent?'warn':hasPlan?'ready':'waiting'}">
        <span>ATTENTION</span>
        <strong>${urgent}</strong>
        <small>${urgent?`${s.unscheduled.length} blocked · review priorities`:hasPlan?'No urgent blockers':'Waiting for plan'}</small>
      </article>
      <article class="quick-card energy ${hasPlan&&headroom<0?'bad':hasPlan?'ready':'waiting'}">
        <span>ENERGY</span>
        <strong>${hasPlan?`${num(s.peak)} kW`:'—'}</strong>
        <small>${hasPlan?(headroom>=0?`${num(headroom)} kW headroom`:`${num(Math.abs(headroom))} kW over target`):'Calculated with the plan'}</small>
      </article>`;
  }

  function renderAttention(s){
    const panel=document.getElementById('risk-priority-panel');
    const list=document.getElementById('risk-priority-list');
    const badge=document.getElementById('risk-count');
    if(!panel||!list||!badge)return;
    const items=s.attention.slice(0,5);
    panel.hidden=!items.length;
    if(!items.length)return;
    badge.textContent=String(items.length);
    badge.className='status-pill warn';
    list.innerHTML=items.map((x,i)=>{
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

  function renderPipeline(){
    if(!document.getElementById('pipeline-overview'))return;
    const s=state();
    const hasOrders=s.orders.length>0;
    const hasPlan=!!result;
    renderStatus(s);
    renderAttention(s);

    setStage('pipe-input',hasOrders?`${s.orders.length} loaded`:'Import orders',hasOrders?'done':'active');
    setStage('pipe-validate',hasOrders?(hasPlan?'Validated':'Review setup'):'Waiting',hasPlan?'done':hasOrders?'warn':'idle');
    setStage('pipe-model',hasPlan?`${input.products?.length||0} products · ${input.lines?.length||0} lines`:'Waiting',hasPlan?'done':'idle');
    setStage('pipe-feasible',hasPlan?`${s.runs.length} run · ${s.unscheduled.length} blocked`:'Waiting',hasPlan?(s.unscheduled.length?'warn':'done'):'idle');
    setStage('pipe-risk',hasPlan?`${s.attention.length} need attention`:'Waiting',hasPlan?(s.attention.length?'warn':'done'):'idle');
    setStage('pipe-sequence',hasPlan?`${s.runs.length} recommended`:'Waiting',hasPlan?'done':'idle');
    setStage('pipe-dashboard',hasPlan?`${num(s.peak)} kW · ${num(s.kwh)} kWh`:'Waiting',hasPlan?'done':'idle');
  }

  function render(){mount();renderPipeline();}
  const priorRecalc=recalc;
  recalc=function(){const value=priorRecalc.apply(this,arguments);render();return value;};
  window.addEventListener('hashchange',render);
  document.addEventListener('DOMContentLoaded',render);
})();
