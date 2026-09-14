/* Product presentation layer: emphasize integration without changing planner logic. */
'use strict';
(function(){
  function buildSample(){
    const d=clone(window.BATCHWATT_DEMO);
    const date=localDate();
    d.factory='Demo workspace — synthetic';
    d.shift.date=date;
    d.shift.start='08:00';
    d.shift.end='18:00';
    d.energy={...d.energy,baseKw:16,peakLimitKw:60,monthlyPeakKw:54,rate:0.13,peakRate:0.25,peakStart:'16:00',peakEnd:'19:00',demandRate:15};

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

  function isSample(){return String(input?.factory||'').toLowerCase().includes('demo workspace');}

  function loadSample(){
    input=buildSample();
    workflow={items:{},release:null};
    location.hash='today';
    recalc();
    mount();
  }

  function clearSample(){
    try{localStorage.removeItem(DRAFT_KEY);localStorage.removeItem(OPS_KEY);}catch{}
    location.hash='today';
    location.reload();
  }

  function mount(){
    const head=document.querySelector('.simple-planner-head');
    if(head){
      const eyebrow=head.querySelector('.eyebrow');
      const title=head.querySelector('h1');
      const copy=head.querySelector('p:not(.eyebrow)');
      if(eyebrow)eyebrow.textContent='OPERATIONS + ENERGY INTEGRATION';
      if(title)title.textContent='Turn fragmented operating data into one decision-ready plan';
      if(copy)copy.textContent='BatchWatt unifies orders, inventory, production capacity and energy assumptions from spreadsheets, CSV files and pasted inputs into one shared operational model, then surfaces dispatch risk, recommended sequencing and peak-load impact.';

      const actions=head.querySelector('.pipeline-actions');
      if(actions&&!document.getElementById('sample-plan-button')){
        const button=document.createElement('button');
        button.id='sample-plan-button';
        button.className='quiet sample-plan-button';
        button.type='button';
        button.textContent='Try sample plan';
        button.addEventListener('click',loadSample);
        actions.appendChild(button);
      }

      if(!document.getElementById('integration-strip')){
        const strip=document.createElement('section');
        strip.id='integration-strip';
        strip.className='integration-strip';
        strip.innerHTML='<div><span>INPUTS</span><strong>Excel · CSV · pasted orders</strong></div><i>→</i><div><span>SHARED MODEL</span><strong>Demand · stock · lines · energy</strong></div><i>→</i><div><span>DECISIONS</span><strong>Risk · sequence · peak load</strong></div>';
        head.insertAdjacentElement('afterend',strip);
      }
    }

    const strip=document.getElementById('integration-strip');
    let notice=document.getElementById('sample-plan-notice');
    if(isSample()){
      if(!notice&&strip){
        notice=document.createElement('div');
        notice.id='sample-plan-notice';
        notice.className='sample-plan-notice';
        notice.innerHTML='<div><strong>Synthetic sample scenario</strong><span>Explore the model, change an order or peak target, and BatchWatt will recalculate the plan.</span></div><button class="quiet" type="button">Reset workspace</button>';
        notice.querySelector('button').addEventListener('click',clearSample);
        strip.insertAdjacentElement('afterend',notice);
      }
    }else if(notice){notice.remove();}

    const details=document.querySelector('.pipeline-details > summary');
    if(details)details.textContent='Data integration + planning logic';

    const context=document.querySelector('.workspace-context span');
    if(context&&(!location.hash||location.hash==='#today'))context.textContent='Operations + energy integration';

    const brand=document.querySelector('.workspace-brand small');
    if(brand)brand.textContent='Operations + energy';
  }

  document.addEventListener('DOMContentLoaded',mount);
  window.addEventListener('hashchange',mount);
})();
