/* BatchWatt dairy operations interface. Presentation-only layer over the existing V6 planner. */
'use strict';
(function(){
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:String(input?.energy?.currency||'USD'),maximumFractionDigits:2}).format(Number(n||0));
  const num=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:1});
  let sampleReady=false;

  function style(){
    if(document.getElementById('dairy-interface-style'))return;
    const s=document.createElement('style');s.id='dairy-interface-style';s.textContent=`
      :root{--bw-blue:#2457d6;--bw-text:#172033;--bw-muted:#667085;--bw-line:#e4e7ec;--bw-green:#26734d;--bw-green-bg:#eef8f1;--bw-amber:#8a5b13;--bw-amber-bg:#fff6e7;--bw-red:#b42318;--bw-red-bg:#fff0ee}
      body{background:#fff!important;color:var(--bw-text)!important}
      .appbar{background:#fff!important;color:var(--bw-text)!important;border-bottom:1px solid var(--bw-line)!important}
      .brand{color:var(--bw-text)!important}.brand small{color:var(--bw-muted)!important}.brand-mark{background:var(--bw-blue)!important}
      .tabs{background:#fff!important;border-bottom:1px solid var(--bw-line)!important}.tabs a{font-size:14px!important}.tabs a[aria-current="page"]{background:#f2f4f7!important;color:var(--bw-text)!important}
      .shell{max-width:1180px!important;padding-top:36px!important}.today-head{margin-bottom:10px!important}.today-head h1{font-size:44px!important;margin-bottom:8px!important}
      .dairy-positioning{font-size:15px;color:var(--bw-muted);margin:0 0 8px;max-width:900px}.dairy-core{font-size:13px;color:var(--bw-text);font-weight:700;margin:0}
      .dairy-toolbar{display:flex;justify-content:space-between;align-items:center;gap:16px;margin:22px 0 10px}.dairy-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
      .dairy-primary,.dairy-secondary{border-radius:9px;padding:11px 16px;font-weight:800;border:1px solid var(--bw-line);cursor:pointer}.dairy-primary{background:var(--bw-blue);border-color:var(--bw-blue);color:#fff}.dairy-secondary{background:#fff;color:var(--bw-text)}
      .dairy-menu{position:relative}.dairy-menu summary{list-style:none}.dairy-menu summary::-webkit-details-marker{display:none}.dairy-menu[open] .dairy-menu-pop{display:grid}.dairy-menu-pop{display:none;position:absolute;right:0;top:44px;z-index:30;min-width:190px;padding:8px;border:1px solid var(--bw-line);border-radius:10px;background:#fff;box-shadow:0 14px 36px rgba(16,24,40,.12)}.dairy-menu-pop a,.dairy-menu-pop button{padding:9px 10px;background:#fff;border:0;text-align:left;text-decoration:none;color:var(--bw-text);font-size:13px}
      .dairy-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0 30px}.dairy-kpi{padding:16px 18px;border:1px solid var(--bw-line);border-radius:11px;background:#fff}.dairy-kpi span{display:block;font-size:12px;color:var(--bw-muted)}.dairy-kpi strong{display:block;margin-top:6px;font-size:30px;letter-spacing:-.03em}
      .dairy-section{margin:0 0 30px}.dairy-section-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-end;margin-bottom:10px}.dairy-section h2{font-size:25px;margin:0}.dairy-section-head p{font-size:13px;color:var(--bw-muted);margin:5px 0 0}
      .dairy-schedule{border-top:1px solid var(--bw-line)}.dairy-row{display:grid;grid-template-columns:86px minmax(150px,1.1fr) 120px 135px minmax(220px,1.7fr);gap:16px;align-items:center;padding:15px 4px;border-bottom:1px solid var(--bw-line);font-size:13px}.dairy-row.head{padding:9px 4px;color:var(--bw-muted);font-size:11px;font-weight:800;text-transform:uppercase}.dairy-action{display:inline-flex;width:max-content;border-radius:999px;padding:5px 9px;font-weight:900;font-size:11px}.dairy-action.run{color:var(--bw-green);background:var(--bw-green-bg)}.dairy-action.shift{color:var(--bw-amber);background:var(--bw-amber-bg)}.dairy-action.hold{color:var(--bw-red);background:var(--bw-red-bg)}.dairy-reason{color:var(--bw-muted)}.dairy-empty{padding:24px 4px;color:var(--bw-muted);border-bottom:1px solid var(--bw-line)}
      .dairy-energy{border:1px solid var(--bw-line);border-radius:12px;padding:20px}.dairy-energy-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:0}.dairy-energy-grid>div{padding:4px 16px;border-left:1px solid var(--bw-line)}.dairy-energy-grid>div:first-child{border-left:0}.dairy-energy-grid span{display:block;color:var(--bw-muted);font-size:11px}.dairy-energy-grid strong{display:block;margin-top:5px;font-size:17px}.dairy-chart{margin-top:20px;padding-top:16px;border-top:1px solid var(--bw-line)}.dairy-chart svg{width:100%;height:150px;display:block}.dairy-chart-labels{display:flex;justify-content:space-between;color:var(--bw-muted);font-size:10px}
      .dairy-details{margin-top:14px}.dairy-details summary{cursor:pointer;color:var(--bw-muted);font-size:12px;font-weight:800}.dairy-details p{font-size:12px;color:var(--bw-muted);line-height:1.6}
      .dairy-page-head h1{font-size:36px;margin-bottom:8px}.dairy-page-head p{max-width:760px;color:var(--bw-muted)}
      .pilot-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:22px 0}.pilot-stat{border:1px solid var(--bw-line);border-radius:11px;padding:16px}.pilot-stat span{display:block;color:var(--bw-muted);font-size:11px}.pilot-stat strong{display:block;margin-top:5px;font-size:22px}.pilot-note{font-size:13px;line-height:1.6;color:var(--bw-muted);max-width:900px}
      .dairy-footer{max-width:1180px;margin:0 auto;padding:20px 24px 36px;border-top:1px solid var(--bw-line);font-size:12px;color:var(--bw-muted)}
      #today>.next-card,#today>.release-card,#today>.issues-panel,#today .learning-peek,#today .integration-story,#today .planner-workflow,#today #decision-trace-panel{display:none!important}
      #more .factory-learning-panel{display:block!important}
      .appbar-right #open-order{display:none!important}
      @media(max-width:800px){.today-head h1{font-size:34px!important}.dairy-kpis,.dairy-energy-grid,.pilot-grid{grid-template-columns:repeat(2,1fr)}.dairy-row{grid-template-columns:72px 1fr}.dairy-row.head{display:none}.dairy-row>span:nth-child(n+3){grid-column:2}.dairy-toolbar{align-items:flex-start;flex-direction:column}.dairy-actions{width:100%}.dairy-primary,.dairy-secondary{flex:1}.dairy-energy-grid>div:nth-child(3){border-left:0;margin-top:12px}.dairy-energy-grid>div:nth-child(4){margin-top:12px}}
    `;document.head.appendChild(s);
  }

  function nav(){
    const n=document.querySelector('.tabs');if(!n)return;
    n.innerHTML=`<a href="#today" data-nav="today">Plan</a><a href="#orders" data-nav="orders">Orders</a><a href="#energy" data-nav="energy">Energy</a><a href="#pilots" data-nav="pilots">Pilots</a><a href="#more" data-nav="more">Settings</a>`;
    const brand=document.querySelector('.brand small');if(brand)brand.textContent='Dairy production planning';
  }

  function ensureViews(){
    const main=document.querySelector('main.shell');if(!main)return;
    if(!document.getElementById('energy')){
      const e=document.createElement('section');e.className='view';e.dataset.view='energy';e.id='energy';e.hidden=true;
      e.innerHTML=`<div class="dairy-page-head"><p class="eyebrow">ENERGY</p><h1>Energy impact</h1><p>Review peak load, modeled electricity cost, kWh, and demand-charge exposure for the current dairy production plan.</p></div><div id="dairy-energy-page"></div>`;
      const more=document.getElementById('more');main.insertBefore(e,more||null);
    }
    if(!document.getElementById('pilots')){
      const p=document.createElement('section');p.className='view';p.dataset.view='pilots';p.id='pilots';p.hidden=true;
      p.innerHTML=`<div class="dairy-page-head"><p class="eyebrow">PILOTS</p><h1>Ghee-factory pilot evidence</h1><p>Historical results from supplied operational records and pilot workbooks. These figures are not independently audited and are not retroactively attributed to newer product features.</p></div><div class="pilot-grid">
        <div class="pilot-stat"><span>Pilots</span><strong>2</strong></div><div class="pilot-stat"><span>Planning cycles</span><strong>19</strong></div><div class="pilot-stat"><span>Orders</span><strong>73</strong></div><div class="pilot-stat"><span>Risks found</span><strong>16</strong></div>
        <div class="pilot-stat"><span>Sequencing changes</span><strong>14</strong></div><div class="pilot-stat"><span>Planning-time reduction</span><strong>62–64%</strong></div><div class="pilot-stat"><span>Estimated energy reduction</span><strong>6.7–8.8%</strong></div><div class="pilot-stat"><span>Peak-load reduction</span><strong>9.0–11.7%</strong></div>
      </div><p class="pilot-note">Source boundary: supplied ghee-factory operational records / pilot workbooks. The preserved historical evidence remains separate from synthetic demos and from capabilities added after the pilots.</p>`;
      const more=document.getElementById('more');main.insertBefore(p,more||null);
    }
  }

  function customizeSettings(){
    const more=document.getElementById('more');if(!more)return;
    const head=more.querySelector('.page-head');if(head)head.innerHTML='<div><p class="eyebrow">SETTINGS</p><h1>Dairy plant settings</h1><p class="subtle">Finished stock, packaging and raw materials, line capacity, tariffs, changeovers, and factory assumptions.</p></div>';
  }

  function mountToday(){
    const view=document.getElementById('today');if(!view)return;
    const head=view.querySelector('.today-head');
    if(head&&!document.getElementById('dairy-positioning')){
      head.innerHTML=`<div><p class="eyebrow">TODAY'S PRODUCTION PLAN</p><h1>What should we produce today?</h1><p id="dairy-positioning" class="dairy-positioning">BatchWatt — Energy-aware production planning for dairy manufacturers, starting with ghee production.</p><p class="dairy-core">Orders + inventory + production capacity + energy → best production plan.</p></div><span id="plan-status" class="status-pill neutral">Ready</span>`;
    }
    if(!document.getElementById('dairy-controls')){
      const controls=document.createElement('div');controls.id='dairy-controls';
      controls.innerHTML=`<div class="dairy-toolbar"><div><strong>What should we produce? When should we produce it? What happens to peak load and cost?</strong></div><div class="dairy-actions"><button id="dairy-sample" class="dairy-secondary" type="button">Try Sample</button><button id="dairy-import" class="dairy-secondary" type="button">Import Data</button><details class="dairy-menu"><summary class="dairy-secondary">More</summary><div class="dairy-menu-pop"><a href="#orders">Orders & imports</a><a href="#energy">Energy view</a><a href="#more">Templates & settings</a></div></details><button id="dairy-generate" class="dairy-primary" type="button">Generate Plan</button></div></div><div id="dairy-kpis" class="dairy-kpis"></div><section class="dairy-section"><div class="dairy-section-head"><div><h2>Production schedule</h2><p>One decision per production requirement: RUN, SHIFT, or HOLD.</p></div></div><div id="dairy-schedule" class="dairy-schedule"></div></section><section class="dairy-section"><div class="dairy-section-head"><div><h2>Energy Impact</h2><p>Peak load and modeled energy cost for the recommended schedule.</p></div></div><div id="dairy-energy-card" class="dairy-energy"></div></section><details class="dairy-details"><summary>Data checks</summary><p id="dairy-data-checks">Load a sample or import production data to validate orders, finished stock, packaging, materials, production lines, and energy inputs.</p></details>`;
      const old=view.querySelector('.next-card');(old||head)?.insertAdjacentElement('afterend',controls);
    }
    const sample=document.getElementById('dairy-sample');
    if(sample&&!sample.dataset.bound){sample.dataset.bound='1';sample.addEventListener('click',()=>{
      try{
        input=window.BATCHWATT_DEMOS?.rkg?.input?window.BATCHWATT_DEMOS.rkg.input():prepareDemo();
        workflow={items:{},release:null};result=null;sampleReady=true;
        try{persist();}catch{}
        renderDairy();
        sample.textContent='Sample Loaded';
      }catch(err){if(typeof fail==='function')fail(err.message);}
    });}
    const gen=document.getElementById('dairy-generate');
    if(gen&&!gen.dataset.bound){gen.dataset.bound='1';gen.addEventListener('click',()=>{
      if(typeof recalc==='function')recalc();
      gen.textContent=result?'Recalculate Plan':'Generate Plan';
    });}
    const imp=document.getElementById('dairy-import');
    if(imp&&!imp.dataset.bound){imp.dataset.bound='1';imp.addEventListener('click',()=>{location.hash='orders';setTimeout(()=>document.getElementById('order-import-panel')?.scrollIntoView({behavior:'smooth'}),0);});}
  }

  function curve(schedule){
    const prof=schedule?.profile||[];if(!prof.length)return '';
    const pts=prof.map((p,i)=>[i,Number(p.kw||0)]);const max=Math.max(1,...pts.map(x=>x[1]));const w=760,h=120,pad=8;
    const path=pts.map(([i,v],idx)=>`${idx?'L':'M'}${pad+(w-pad*2)*(i/Math.max(1,pts.length-1))},${h-pad-(h-pad*2)*(v/max)}`).join(' ');
    return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Recommended load curve"><path d="${path}" fill="none" stroke="#2457d6" stroke-width="3" vector-effect="non-scaling-stroke"/><line x1="8" y1="${h-8}" x2="${w-8}" y2="${h-8}" stroke="#e4e7ec"/></svg><div class="dairy-chart-labels"><span>Shift start</span><span>Recommended load curve</span><span>Shift end</span></div>`;
  }

  function scheduleRows(){
    if(!result)return '<div class="dairy-empty">Load the dairy/ghee sample, then click Generate Plan.</div>';
    const rows=(result.orderDecisions||[]);
    if(!rows.length)return '<div class="dairy-empty">No production run is required for the loaded orders.</div>';
    return '<div class="dairy-row head"><span>Action</span><span>Product</span><span>Time</span><span>Line</span><span>Reason</span></div>'+rows.map(d=>{
      const a=String(d.action||'RUN').toUpperCase();const cls=a.toLowerCase();const time=a==='HOLD'?'—':`${d.recommendedStart||'—'}–${d.recommendedEnd||'—'}`;
      const reason=a==='HOLD'?String(d.reason||'Resolve production constraint'):String(d.reason||'Scheduled for the current shift').replace(/whole-shift|beam-search|heuristic|candidate/gi,'production');
      return `<div class="dairy-row"><span><b class="dairy-action ${cls}">${esc(a)}</b></span><span><strong>${esc(d.product||d.orderId)}</strong></span><span>${esc(time)}</span><span>${esc(d.line||'—')}</span><span class="dairy-reason">${esc(reason)}</span></div>`;
    }).join('');
  }

  function energyHtml(){
    if(!result)return '<div class="dairy-empty">Energy impact appears after Generate Plan.</div>';
    const b=result.baseline||{},p=result.proposed||{};const bc=Number(b.usageCost||0)+Number(b.demandExposure||0),pc=Number(p.usageCost||0)+Number(p.demandExposure||0);
    const exposure=Number(p.demandExposure||0)>0?money(p.demandExposure):'None modeled';
    return `<div class="dairy-energy-grid"><div><span>Peak before → after</span><strong>${num(b.peakKw)} → ${num(p.peakKw)} kW</strong></div><div><span>Cost before → after</span><strong>${money(bc)} → ${money(pc)}</strong></div><div><span>kWh</span><strong>${num(p.kwh)}</strong></div><div><span>Demand-charge exposure</span><strong>${esc(exposure)}</strong></div></div><div class="dairy-chart">${curve(p)}</div><details class="dairy-details"><summary>View details</summary><p>Modeled usage cost: ${money(p.usageCost)}. Conditional demand-charge exposure: ${money(p.demandExposure)}. Peak target: ${num(input?.energy?.peakLimitKw)} kW. Energy outputs are modeled from supplied configuration and operating data.</p></details>`;
  }

  function renderDairy(){
    mountToday();
    const orders=input?.orders?.length||0,holds=result?.holds?.length||0,shifted=result?.comparison?.shiftedJobs||0,peak=result?.proposed?.peakKw;
    const k=document.getElementById('dairy-kpis');if(k)k.innerHTML=`<div class="dairy-kpi"><span>Orders</span><strong>${orders}</strong></div><div class="dairy-kpi"><span>Holds</span><strong>${holds}</strong></div><div class="dairy-kpi"><span>Shifted</span><strong>${shifted}</strong></div><div class="dairy-kpi"><span>Peak kW</span><strong>${peak==null?'—':num(peak)}</strong></div>`;
    const sched=document.getElementById('dairy-schedule');if(sched)sched.innerHTML=scheduleRows();
    const en=document.getElementById('dairy-energy-card');if(en)en.innerHTML=energyHtml();
    const ep=document.getElementById('dairy-energy-page');if(ep)ep.innerHTML=`<section class="dairy-section"><div class="dairy-energy">${energyHtml()}</div></section>`;
    const checks=document.getElementById('dairy-data-checks');if(checks){
      const warnings=result?.warnings||[];
      checks.textContent=result?(warnings.length?warnings.join(' '):'Data checks passed for the current plan. Orders, finished stock, packaging/material feasibility, line capacity, and energy inputs were evaluated.'):(sampleReady?'Ghee sample loaded. Click Generate Plan to run validation and planning.':'Load a sample or import production data to run data checks.');
    }
    const gen=document.getElementById('dairy-generate');if(gen)gen.textContent=result?'Recalculate Plan':'Generate Plan';
    const status=document.getElementById('plan-status');if(status){status.textContent=result?(holds?'Review holds':'Plan ready'):(sampleReady?'Sample ready':'Ready');status.className='status-pill '+(holds?'warn':result?'good':'neutral');}
  }

  function footer(){
    let f=document.querySelector('.dairy-footer');if(!f){f=document.createElement('footer');f.className='dairy-footer';document.body.appendChild(f);}f.textContent='Decision-support tool. Supervisor review required before release.';
  }

  function route(){
    const allowed=['today','orders','energy','pilots','more'];const v=allowed.includes(location.hash.slice(1))?location.hash.slice(1):'today';
    document.querySelectorAll('[data-view]').forEach(x=>x.hidden=x.dataset.view!==v);
    document.querySelectorAll('[data-nav]').forEach(a=>a.dataset.nav===v?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current'));
    window.scrollTo(0,0);
  }

  function apply(){style();nav();ensureViews();customizeSettings();mountToday();footer();renderDairy();route();}
  const prior=typeof recalc==='function'?recalc:null;
  if(prior)recalc=function(){const v=prior.apply(this,arguments);setTimeout(renderDairy,0);return v;};
  document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,0));
  window.addEventListener('hashchange',()=>setTimeout(route,0));
})();