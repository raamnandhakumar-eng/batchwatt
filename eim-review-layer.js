/* Recruiter-facing presentation layer: emphasize integration without changing planner logic. */
'use strict';
(function(){
  function mount(){
    const head=document.querySelector('.simple-planner-head');
    if(head){
      const eyebrow=head.querySelector('.eyebrow');
      const title=head.querySelector('h1');
      const copy=head.querySelector('p:not(.eyebrow)');
      if(eyebrow)eyebrow.textContent='OPERATIONS + ENERGY INTEGRATION';
      if(title)title.textContent='Turn fragmented operating data into one decision-ready plan';
      if(copy)copy.textContent='BatchWatt unifies orders, inventory, production capacity and energy assumptions from spreadsheets, CSV files and pasted inputs into one shared operational model, then surfaces dispatch risk, recommended sequencing and peak-load impact.';

      if(!document.getElementById('integration-strip')){
        const strip=document.createElement('section');
        strip.id='integration-strip';
        strip.className='integration-strip';
        strip.innerHTML='<div><span>INPUTS</span><strong>Excel · CSV · pasted orders</strong></div><i>→</i><div><span>SHARED MODEL</span><strong>Demand · stock · lines · energy</strong></div><i>→</i><div><span>DECISIONS</span><strong>Risk · sequence · peak load</strong></div>';
        head.insertAdjacentElement('afterend',strip);
      }
    }

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
