/* Final product layer: simple input -> decision -> energy workflow. */
'use strict';
(function(){
  const fmtOutput=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(Number(n||0));
  let sampleSession=false;

  const priorPersist=persist;
  persist=function(){
    const sample=sampleSession||String(input?.factory||'').toLowerCase().includes('demo workspace');
    if(sample){
      const save=document.getElementById('save-state');
      if(save)save.textContent='Sample mode — changes are not saved';
      return;
    }
    return priorPersist.apply(this,arguments);
  };

  function buildSample(){
    const d=clone(window.BATCHWATT_DEMO);
    const date=localDate();
    d.factory='Demo workspace — synthetic';
    d.shift={...d.shift,date,start:'08:00',end:'18:00'};
    d.energy={...d.energy,baseKw:16,peakLimitKw:60,monthlyPeakKw:54,rate:0.13,peakRate:0.32,peakStart:'10:00',peakEnd:'13:00',demandRate:15};

    const productNames={ghee:'Product A',spice:'Product B',snack:'Product C',bulk:'Product D'};
    (d.products||[]).forEach(p=>{if(productNames[p.id])p.name=productNames[p.id];});
    const materialNames={'ghee-base':'Material A','spice-base':'Material B','snack-base':'Material C'};
    (d.materials||[]).forEach(m=>{if(materialNames[m.id])m.name=materialNames[m.id];});
    const supplier=d.suppliers?.[0];
    if(supplier){supplier.name='Primary supplier';supplier.contact='';}

    d.orders=[
      {id:'SAMPLE-001',customer:'Customer A',productId:'ghee',qty:300,due:`${date}T11:30`,priority:'Urgent'},
      {id:'SAMPLE-002',customer:'Customer B',productId:'spice',qty:220,due:`${date}T13:00`,priority:'High'},
      {id:'SAMPLE-003',customer:'Customer C',productId:'snack',qty:300,due:`${date}T15:00`,priority:'Standard'},
      {id:'SAMPLE-004',customer:'Customer D',productId:'bulk',qty:180,due:`${date}T17:00`,priority:'Standard'}
    ];
    const materialB=(d.materials||[]).find(m=>m.id==='spice-base');
    if(materialB)materialB.stock=36;
    d.purchaseOrders=[];
    return d;
  }

  function isSample(){return sampleSession||String(input?.factory||'').toLowerCase().includes('demo workspace');}

  function loadSample(){
    sampleSession=true;
    input=buildSample();
    workflow={items:{},release:null};
    location.hash='today';
    recalc();
  }

  function clearSample(){
    sampleSession=false;
    try{localStorage.removeItem(DRAFT_KEY);localStorage.removeItem(OPS_KEY);}catch{}
    location.hash='today';
    location.reload();
  }

  function mountHeader(){
    const head=document.querySelector('.simple-planner-head');
    if(!head)return;
    const eyebrow=head.querySelector('.eyebrow');
    const title=head.querySelector('h1');
    const copy=head.querySelector('p:not(.eyebrow)');
    if(eyebrow)eyebrow.textContent='START HERE';
    if(title)title.textContent='Plan production using your orders and energy data';
    if(copy)copy.textContent='BatchWatt is a production and energy planning tool. It combines customer orders, inventory, production capacity and energy data, then tells you what can be produced, what is blocked, what should run next, and how the plan affects peak load and modeled energy cost.';

    const actions=head.querySelector('.pipeline-actions');
    if(actions&&!document.getElementById('sample-plan-button')){
      const button=document.createElement('button');
      button.id='sample-plan-button';
      button.className='quiet sample-plan-button';
      button.type='button';
      button.textContent='Try sample';
      button.addEventListener('click',loadSample);
      actions.appendChild(button);
    }

    document.getElementById('model-line')?.remove();
    document.getElementById('integration-strip')?.remove();

    let explainer=document.getElementById('product-explainer');
    if(!explainer){
      explainer=document.createElement('section');
      explainer.id='product-explainer';
      explainer.className='product-explainer';
      head.insertAdjacentElement('afterend',explainer);
    }
    explainer.innerHTML=`
      <div class="product-explainer-intro">
        <span>WHAT BATCHWATT DOES</span>
        <strong>Turns raw operating data into a usable shift plan.</strong>
        <small>It connects demand, production constraints and energy instead of treating them as separate spreadsheets.</small>
      </div>
      <div class="product-step">
        <b>1</b><div><span>LOAD YOUR DATA</span><strong>Orders + energy Excel / CSV</strong><small>Import customer demand and an optional 15-minute facility load profile.</small></div>
      </div>
      <i>→</i>
      <div class="product-step">
        <b>2</b><div><span>BATCHWATT CHECKS IT</span><strong>Stock, materials, capacity, due times and peak</strong><small>Invalid inputs and operating blockers stay visible.</small></div>
      </div>
      <i>→</i>
      <div class="product-step">
        <b>3</b><div><span>USE THE PLAN</span><strong>What to run, when to run it, and why</strong><small>See the recommended sequence, blockers, load profile and modeled cost.</small></div>
      </div>`;
  }

  function mountSampleNotice(){
    const anchor=document.getElementById('product-explainer')||document.querySelector('.simple-planner-head');
    let notice=document.getElementById('sample-plan-notice');
    if(isSample()){
      if(!notice&&anchor){
        notice=document.createElement('div');
        notice.id='sample-plan-notice';
        notice.className='sample-plan-notice';
        notice.innerHTML='<div><strong>Synthetic sample</strong><span>Change an order or peak target to see the plan recalculate.</span></div><button class="quiet" type="button">Reset</button>';
        notice.querySelector('button').addEventListener('click',clearSample);
        anchor.insertAdjacentElement('afterend',notice);
      }
    }else if(notice){notice.remove();}
  }

  function mountLoadProfile(){
    const energy=document.querySelector('.simple-energy');
    const details=energy?.querySelector('.simple-details');
    const chart=details?.querySelector('.energy-chart-wrap')||document.querySelector('#load-profile-output .energy-chart-wrap');
    const legend=details?.querySelector('.chart-legend')||document.querySelector('#load-profile-output .chart-legend');
    const message=document.getElementById('simple-energy-message');
    if(!energy||!details||!chart||!message)return;

    let output=document.getElementById('load-profile-output');
    if(!output){
      output=document.createElement('section');
      output.id='load-profile-output';
      output.className='load-profile-output';
      output.innerHTML='<div class="load-profile-head"><div><p class="eyebrow">POWER PROFILE</p><h3>Baseline vs recommended load</h3></div><span class="load-profile-badge">MODELED</span></div><div id="load-profile-metrics" class="load-profile-metrics"></div>';
      message.insertAdjacentElement('afterend',output);
    }
    if(chart.parentElement!==output)output.appendChild(chart);
    if(legend&&legend.parentElement!==output)output.appendChild(legend);
    const summary=details.querySelector('summary');
    if(summary)summary.textContent='Energy assumptions';
  }

  function renderLoadProfileSummary(){
    const output=document.getElementById('load-profile-output');
    const box=document.getElementById('load-profile-metrics');
    if(!output||!box)return;
    output.hidden=!result;
    if(!result)return;

    const baseline=Number(result.baseline?.peakKw||0);
    const planned=Number(result.proposed?.peakKw||0);
    const target=Number(input?.energy?.peakLimitKw||0);
    const reduction=baseline-planned;
    box.innerHTML=`
      <div><span>Baseline</span><strong>${fmtOutput(baseline)} kW</strong></div>
      <div><span>Recommended</span><strong>${fmtOutput(planned)} kW</strong><small>Target ${fmtOutput(target)} kW</small></div>
      <div><span>Peak change</span><strong>${reduction>0?`${fmtOutput(reduction)} kW lower`:reduction<0?`${fmtOutput(Math.abs(reduction))} kW higher`:'No change'}</strong></div>`;
  }

  function simplifyLayout(){
    const details=document.querySelector('.pipeline-details');
    const release=document.querySelector('.release-card');
    const energy=document.querySelector('.simple-energy');
    const anchor=release||energy;
    if(details&&anchor&&details.previousElementSibling!==anchor)anchor.insertAdjacentElement('afterend',details);
    const summary=details?.querySelector('summary');
    if(summary)summary.textContent='How the plan is calculated';

    const context=document.querySelector('.workspace-context span');
    if(context&&(!location.hash||location.hash==='#today'))context.textContent='Orders + energy → production plan';
    const brand=document.querySelector('.workspace-brand small');
    if(brand)brand.textContent='Operations + energy';
  }

  function mount(){
    mountHeader();
    mountSampleNotice();
    mountLoadProfile();
    simplifyLayout();
  }

  const priorRecalc=recalc;
  recalc=function(){
    const value=priorRecalc.apply(this,arguments);
    mount();
    renderLoadProfileSummary();
    return value;
  };

  document.addEventListener('DOMContentLoaded',()=>{mount();renderLoadProfileSummary();});
  window.addEventListener('hashchange',()=>{mount();renderLoadProfileSummary();});
})();
