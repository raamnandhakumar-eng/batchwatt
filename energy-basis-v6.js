/* V6 energy-import guard: require background-load basis before interval data enters the scheduling model. */
'use strict';
(function(){
  function intervalMode(){return document.querySelector('[data-energy-mode="interval"]')?.classList.contains('active');}
  function mount(){
    const hint=document.getElementById('energy-format-hint');
    if(!hint||document.getElementById('v6-energy-basis'))return;
    const box=document.createElement('section');box.id='v6-energy-basis';box.className='v6-energy-basis';
    box.innerHTML=`<div><strong>What does Facility kW represent?</strong><small>BatchWatt adds scheduled machine load to these values.</small></div><label><input type="radio" name="v6-energy-basis" value="background" checked> Background / baseline load before the schedulable production lines</label><label><input type="radio" name="v6-energy-basis" value="total"> Total meter load including production machines</label><p id="v6-energy-basis-warning" hidden>Total meter load already contains production demand. Import a background/baseline series instead, otherwise machine power would be counted twice.</p>`;
    hint.insertAdjacentElement('afterend',box);
    box.querySelectorAll('input').forEach(x=>x.addEventListener('change',sync));
    sync();
  }
  function sync(){
    const box=document.getElementById('v6-energy-basis'),confirm=document.getElementById('confirm-energy-import');if(!box||!confirm)return;
    const visible=intervalMode();box.hidden=!visible;if(!visible)return;
    const basis=box.querySelector('input[name="v6-energy-basis"]:checked')?.value||'background';
    const warning=document.getElementById('v6-energy-basis-warning');if(warning)warning.hidden=basis!=='total';
    if(basis==='total'){
      if(!confirm.disabled)confirm.dataset.v6WasEnabled='true';
      confirm.disabled=true;confirm.title='Use background/baseline facility load to avoid double counting production power.';
    }else{
      if(confirm.dataset.v6WasEnabled==='true'){confirm.disabled=false;delete confirm.dataset.v6WasEnabled;}
      confirm.title='';
    }
  }
  document.addEventListener('click',e=>{
    if(e.target?.matches('[data-energy-mode],#parse-energy-paste'))setTimeout(sync,0);
    if(e.target?.id==='confirm-energy-import'&&intervalMode()){
      const basis=document.querySelector('input[name="v6-energy-basis"]:checked')?.value||'background';
      if(basis==='total'){e.preventDefault();e.stopImmediatePropagation();return;}
      if(window.input?.energy)input.energy.intervalLoadBasis='background';
    }
  },true);
  document.addEventListener('change',e=>{if(e.target?.matches('[data-energy-map],#energy-import-file'))setTimeout(sync,0);},true);
  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{mount();sync();},0));
})();
