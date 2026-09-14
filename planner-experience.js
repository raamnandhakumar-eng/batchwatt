/* End-to-end planner workflow: inputs -> data health -> actions -> scenario -> export. */
'use strict';
(function(){
  const escX=x=>typeof esc==='function'?esc(x):String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmtX=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(Number(n||0));
  const moneyX=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:String(input?.energy?.currency||'USD'),maximumFractionDigits:2}).format(Number(n||0));
  const csvCell=value=>{const text=String(value??'');return /[",\n]/.test(text)?`"${text.replace(/"/g,'""')}"`:text;};

  function minutes(text){const m=String(text||'').match(/^(\d{2}):(\d{2})$/);return m?Number(m[1])*60+Number(m[2]):NaN;}
  function clock(n){return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}
  function productName(id){return input?.products?.find(p=>p.id===id)?.name||id||'Order';}
  function downloadText(filename,text,type='text/csv;charset=utf-8'){
    const blob=new Blob([text],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),0);
  }

  function orderTemplate(){
    const product=input?.products?.[0]?.name||'Product A';
    const date=input?.shift?.date||new Date().toISOString().slice(0,10);
    const rows=[['Customer','Product','Quantity','Due','Priority','Order Reference'],['Customer A',product,100,`${date} 15:00`,'High','PO-001']];
    downloadText('BatchWatt_Orders_Template.csv',rows.map(r=>r.map(csvCell).join(',')).join('\n'));
  }

  function energyTemplate(){
    const start=minutes(input?.shift?.start),end=minutes(input?.shift?.end);const rows=[['Time','Facility kW','Tariff rate (optional)']];
    if(Number.isFinite(start)&&Number.isFinite(end)&&end>start){for(let m=start;m<end;m+=15)rows.push([clock(m),'','']);}
    else rows.push(['08:00','',''],['08:15','',''],['08:30','','']);
    downloadText('BatchWatt_Energy_15min_Template.csv',rows.map(r=>r.map(csvCell).join(',')).join('\n'));
  }

  function exportPlan(){
    if(!result)return;
    const jobs=new Map((result.proposed?.jobs||[]).map(j=>[j.id,j]));
    const header=['Status','Order','Customer','Product','Line','Due','Recommended start','Recommended end','Baseline start','Shift minutes','Power kW','Energy kWh','Reason'];
    const rows=[header];
    for(const d of result.decisions||[]){const j=jobs.get(d.orderId)||{};rows.push(['Scheduled',d.orderId,d.customer,d.product,d.line,d.due,d.recommendedStart,d.recommendedEnd,d.baselineStart||'',d.shiftedMinutes||0,j.kw??'',j.kwh??'',d.reason||'']);}
    for(const u of result.proposed?.unscheduled||[])rows.push(['Blocked',u.id,u.customer||'',u.product||productName(u.productId),u.line||'',u.due||'','','','','','','',u.reason||'']);
    const date=input?.shift?.date||'shift';downloadText(`BatchWatt_Shift_Plan_${date}.csv`,rows.map(r=>r.map(csvCell).join(',')).join('\n'));
  }

  function clickExisting(id,fallback){const el=document.getElementById(id);if(el)el.click();else if(typeof fallback==='function')fallback();}

  function mountShell(){
    const explainer=document.getElementById('product-explainer');
    if(!explainer)return;
    let shell=document.getElementById('planner-workflow');
    if(!shell){
      shell=document.createElement('section');shell.id='planner-workflow';shell.className='planner-workflow';
      shell.innerHTML=`
        <div class="workflow-title"><div><p class="eyebrow">START WITH DATA</p><h2>Build the shared operating model</h2><p>Load demand and energy inputs. BatchWatt validates them before making scheduling decisions.</p></div><div class="workflow-tools"><button type="button" id="orders-template" class="quiet">Orders template</button><button type="button" id="energy-template" class="quiet">Energy template</button><button type="button" id="export-shift-plan" class="quiet" disabled>Export shift plan</button></div></div>
        <div class="input-source-grid">
          <article class="input-source-card" id="orders-source-card"><div><span>ORDERS DATA</span><strong id="orders-source-title">Not loaded</strong><small id="orders-source-detail">Excel, CSV, pasted rows or manual entry</small></div><button type="button" class="primary" id="workflow-load-orders">Load orders</button></article>
          <article class="input-source-card energy" id="energy-source-card"><div><span>ENERGY DATA</span><strong id="energy-source-title">Settings fallback</strong><small id="energy-source-detail">Add a 15-minute facility load profile for stronger scheduling</small></div><button type="button" class="primary" id="workflow-load-energy">Load energy</button></article>
        </div>
        <div class="data-health-wrap"><div class="section-mini-head"><span>DATA HEALTH</span><strong id="data-health-summary">Waiting for input</strong></div><div id="data-health-strip" class="data-health-strip"></div></div>
        <section class="recommended-actions" id="recommended-actions"><div class="section-mini-head"><span>RECOMMENDED ACTIONS</span><strong>What to do next</strong></div><div id="recommended-actions-list" class="recommended-actions-list"></div></section>
        <section class="scenario-compare" id="scenario-compare" hidden><div class="section-mini-head"><span>SCENARIO COMPARISON</span><strong>Earliest feasible vs recommended</strong></div><div id="scenario-compare-grid" class="scenario-compare-grid"></div></section>`;
      explainer.insertAdjacentElement('afterend',shell);
      document.getElementById('workflow-load-orders').addEventListener('click',()=>clickExisting('open-import',()=>typeof goto==='function'&&goto('orders')));
      document.getElementById('workflow-load-energy').addEventListener('click',()=>clickExisting('open-energy-import-top',()=>typeof goto==='function'&&goto('more')));
      document.getElementById('orders-template').addEventListener('click',orderTemplate);
      document.getElementById('energy-template').addEventListener('click',energyTemplate);
      document.getElementById('export-shift-plan').addEventListener('click',exportPlan);
    }
  }

  function renderSources(){
    const orders=input?.orders?.length||0,intervals=input?.energy?.intervalLoad?.length||0;
    const used=Number(result?.energyInput?.intervalsUsed||0),shiftIntervals=Number(result?.energyInput?.shiftIntervals||0);
    const orderTitle=document.getElementById('orders-source-title'),orderDetail=document.getElementById('orders-source-detail');
    const energyTitle=document.getElementById('energy-source-title'),energyDetail=document.getElementById('energy-source-detail');
    if(orderTitle)orderTitle.textContent=orders?`${orders} order${orders===1?'':'s'} loaded`:'Not loaded';
    if(orderDetail)orderDetail.textContent=orders?'Validated into the shared model':'Excel, CSV, pasted rows or manual entry';
    if(energyTitle)energyTitle.textContent=intervals?`${intervals} intervals loaded`:'Settings fallback';
    if(energyDetail)energyDetail.textContent=intervals?(shiftIntervals?`${used}/${shiftIntervals} shift intervals used by the planner`:'15-minute profile loaded'):'Optional: add a 15-minute facility load profile';
    document.getElementById('orders-source-card')?.classList.toggle('loaded',orders>0);
    document.getElementById('energy-source-card')?.classList.toggle('loaded',intervals>0);
    const exportBtn=document.getElementById('export-shift-plan');if(exportBtn)exportBtn.disabled=!result;
  }

  function healthItem(label,state,detail,tone='ok'){return `<div class="health-item ${tone}"><span>${escX(label)}</span><strong>${escX(state)}</strong><small>${escX(detail)}</small></div>`;}
  function renderHealth(){
    const box=document.getElementById('data-health-strip'),summary=document.getElementById('data-health-summary');if(!box||!summary)return;
    const orders=input?.orders?.length||0,products=input?.products?.length||0,lines=input?.lines?.length||0,materials=input?.materials?.length||0;
    const blockers=result?.proposed?.unscheduled||[];const materialBlocks=blockers.filter(x=>/material|packaging|recipe/i.test(String(x.reason||''))).length;
    const intervals=input?.energy?.intervalLoad?.length||0,used=Number(result?.energyInput?.intervalsUsed||0),shiftIntervals=Number(result?.energyInput?.shiftIntervals||0),missing=Math.max(0,shiftIntervals-used);
    const orderTone=orders?'ok':'neutral',modelTone=products&&lines?'ok':'warn',materialTone=materialBlocks?'warn':materials?'ok':'neutral',energyTone=intervals?(missing?'warn':'ok'):'neutral';
    box.innerHTML=[
      healthItem('Orders',orders?`${orders} ready`:'Waiting',orders?'Validated in model':'Load demand data',orderTone),
      healthItem('Inventory',products?`${products} products`:'Missing',products?'Finished stock available to planner':'Configure products',products?'ok':'warn'),
      healthItem('Materials',materials?`${materials} records`:'Not configured',materialBlocks?`${materialBlocks} production blocker${materialBlocks===1?'':'s'}`:'No material blocker in current plan',materialTone),
      healthItem('Lines',lines?`${lines} configured`:'Missing',lines?'Capacity and kW ratings available':'Configure production lines',modelTone),
      healthItem('Energy',intervals?(missing?`${used}/${shiftIntervals} intervals`:`${used||intervals}/${shiftIntervals||intervals} intervals`):'Settings fallback',intervals?(missing?`${missing} shift intervals use fallback settings`:'Full shift interval coverage'):'Import interval data when available',energyTone)
    ].join('');
    const issues=(orders?0:1)+(products&&lines?0:1)+materialBlocks+(intervals&&missing?1:0);
    summary.textContent=issues?`${issues} item${issues===1?'':'s'} need attention`:'Inputs ready for planning';
  }

  function actionRow(type,title,detail,tone='normal'){return `<article class="action-row ${tone}"><span>${escX(type)}</span><div><strong>${escX(title)}</strong><small>${escX(detail)}</small></div></article>`;}
  function renderActions(){
    const box=document.getElementById('recommended-actions-list');if(!box)return;
    const actions=[];const orders=input?.orders?.length||0,intervals=input?.energy?.intervalLoad?.length||0;
    if(!orders){actions.push(actionRow('START','Load customer orders','Import Excel/CSV, paste rows, or add an order manually.','primary'));box.innerHTML=actions.join('');return;}
    if(!result){actions.push(actionRow('CHECK','Complete setup required by the planner','Review products, lines, materials and energy settings.','warn'));box.innerHTML=actions.join('');return;}
    for(const u of result.proposed?.unscheduled||[]){if(actions.length>=3)break;actions.push(actionRow('HOLD',`${productName(u.productId||u.id)} — blocked`,u.reason||'Resolve the blocking input.','bad'));}
    const jobs=new Map((result.proposed?.jobs||[]).map(j=>[j.id,j]));
    for(const d of result.decisions||[]){if(actions.length>=4)break;const j=jobs.get(d.orderId)||{};const shifted=Number(d.shiftedMinutes||0);const type=shifted?'SHIFT':'RUN';const title=`${d.product} · ${d.recommendedStart||'—'}–${d.recommendedEnd||'—'}${d.line?` · ${d.line}`:''}`;actions.push(actionRow(type,title,d.reason||'Scheduled under current constraints.',shifted?'energy':'normal'));}
    if(!intervals&&actions.length<4)actions.push(actionRow('IMPROVE','Load a 15-minute energy profile','The current plan uses configured base-load and tariff settings.','info'));
    if(!actions.length)actions.push(actionRow('READY','No immediate intervention','The current plan has no blocked production orders.','good'));
    box.innerHTML=actions.join('');
  }

  function renderScenario(){
    const wrap=document.getElementById('scenario-compare'),grid=document.getElementById('scenario-compare-grid');if(!wrap||!grid)return;
    wrap.hidden=!result;if(!result)return;
    const basePeak=Number(result.baseline?.peakKw||0),planPeak=Number(result.proposed?.peakKw||0),target=Number(input?.energy?.peakLimitKw||0);
    const baseCost=Number(result.baseline?.usageCost||0)+Number(result.baseline?.demandExposure||0),planCost=Number(result.proposed?.usageCost||0)+Number(result.proposed?.demandExposure||0);
    const baseLate=Number(result.baseline?.lateOrders||0)+Number(result.baseline?.overdueStockOrders||0),planLate=Number(result.proposed?.lateOrders||0)+Number(result.proposed?.overdueStockOrders||0);
    const shifted=Number(result.comparison?.shiftedJobs||0),peakDelta=basePeak-planPeak,costDelta=baseCost-planCost;
    grid.innerHTML=`
      <div><span>PEAK LOAD</span><strong>${fmtX(basePeak)} → ${fmtX(planPeak)} kW</strong><small>Target ${fmtX(target)} kW${peakDelta>0?` · ${fmtX(peakDelta)} kW lower`:''}</small></div>
      <div><span>MODELED OPERATING COST</span><strong>${moneyX(baseCost)} → ${moneyX(planCost)}</strong><small>${costDelta>0?`${moneyX(costDelta)} lower`:costDelta<0?`${moneyX(Math.abs(costDelta))} higher`:'No modeled change'}</small></div>
      <div><span>DELIVERY</span><strong>${baseLate} → ${planLate} late</strong><small>Recommended schedule may not worsen supplied due-time performance</small></div>
      <div><span>SEQUENCE</span><strong>${shifted} run${shifted===1?'':'s'} shifted</strong><small>${result.proposed?.jobs?.length||0} scheduled · ${result.proposed?.unscheduled?.length||0} blocked</small></div>`;
  }

  function compactOnboarding(){
    const explainer=document.getElementById('product-explainer');if(!explainer)return;
    const active=(input?.orders?.length||0)>0||(input?.energy?.intervalLoad?.length||0)>0;
    explainer.classList.toggle('compact',active);
  }

  function simplifyExisting(){
    document.body.classList.add('workflow-v5');
    const trace=document.getElementById('decision-trace-panel');
    if(trace){const eyebrow=trace.querySelector('.trace-head .eyebrow'),h=trace.querySelector('.trace-head h2'),p=trace.querySelector('.trace-head p');if(eyebrow)eyebrow.textContent='DECISION LOGIC';if(h)h.textContent='Why each run is scheduled here';if(p)p.textContent='Due times first, then materials and capacity, then peak and modeled cost.';}
  }

  function render(){mountShell();renderSources();renderHealth();renderActions();renderScenario();compactOnboarding();simplifyExisting();}
  const prior=recalc;
  recalc=function(){const value=prior.apply(this,arguments);render();return value;};
  document.addEventListener('DOMContentLoaded',render);
  window.addEventListener('hashchange',render);
})();
