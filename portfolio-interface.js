/* V6.2 interface layer: simple integrated decision workflow + first-class factory learning. */
'use strict';
(function(){
  const escI=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function mountNavigation(){
    const nav=document.querySelector('.tabs');
    if(!nav)return;
    const labels={today:'Plan',orders:'Orders',buy:'Materials',more:'Setup'};
    nav.querySelectorAll('[data-nav]').forEach(a=>{if(labels[a.dataset.nav])a.textContent=labels[a.dataset.nav];});
    if(!nav.querySelector('[data-nav="learning"]')){
      const link=document.createElement('a');
      link.href='#learning';link.dataset.nav='learning';link.textContent='Learning';
      const setup=nav.querySelector('[data-nav="more"]');
      if(setup)nav.insertBefore(link,setup);else nav.appendChild(link);
    }
    const brand=document.querySelector('.brand small');if(brand)brand.textContent='Integrated operations';
  }

  function mountLearningView(){
    const main=document.querySelector('main.shell');
    if(!main||document.getElementById('learning'))return;
    const section=document.createElement('section');
    section.className='view portfolio-learning-view';section.dataset.view='learning';section.id='learning';section.hidden=true;
    section.innerHTML=`<div class="page-head learning-page-head"><div><p class="eyebrow">FACTORY LEARNING</p><h1>What this factory is teaching BatchWatt</h1><p class="subtle">Demand patterns accumulate separately for each factory as more orders are loaded. Planning constraints remain explicit and always take priority.</p></div></div><div id="learning-page-content"></div>`;
    const setup=document.getElementById('more');
    if(setup)main.insertBefore(section,setup);else main.appendChild(section);
  }

  function moveLearningPanel(){
    const target=document.getElementById('learning-page-content'),panel=document.getElementById('factory-learning-panel');
    if(target&&panel&&panel.parentElement!==target)target.appendChild(panel);
  }

  function mountLearningPeek(){
    const head=document.querySelector('#today .today-head');
    if(!head||document.getElementById('learning-peek'))return;
    const card=document.createElement('a');
    card.id='learning-peek';card.className='learning-peek';card.href='#learning';
    card.innerHTML='<div><span class="learning-peek-label">FACTORY MEMORY</span><strong id="learning-peek-title">Learning from orders</strong><small id="learning-peek-detail">Load more orders to build a stronger factory profile.</small></div><span class="learning-peek-arrow">View learning →</span>';
    head.insertAdjacentElement('afterend',card);
  }

  function mountDecisionStory(){
    const peek=document.getElementById('learning-peek');
    if(!peek||document.getElementById('integration-story'))return;
    const strip=document.createElement('section');strip.id='integration-story';strip.className='integration-story';
    strip.innerHTML=`<div><span>1</span><p><strong>Integrate</strong><small>Orders · inventory · lines · energy</small></p></div><i>→</i><div><span>2</span><p><strong>Decide</strong><small>RUN · SHIFT · HOLD</small></p></div><i>→</i><div><span>3</span><p><strong>Measure</strong><small>Delivery · peak · modeled cost</small></p></div>`;
    peek.insertAdjacentElement('afterend',strip);
  }

  function refreshLearningPeek(){
    mountLearningPeek();mountDecisionStory();moveLearningPanel();
    const title=document.getElementById('learning-peek-title'),detail=document.getElementById('learning-peek-detail');
    if(!title||!detail)return;
    let s=null;try{s=window.BatchWattFactoryLearningStore?.summary?.();}catch{}
    if(!s||!s.sampleCount){title.textContent='Learning starts with your orders';detail.textContent='Demand mix, order size, customers and due-time patterns will accumulate here.';return;}
    title.textContent=`${s.sampleCount} order${s.sampleCount===1?'':'s'} learned · ${s.confidence} confidence`;
    const signals=[];
    if(s.topProduct)signals.push(`${s.topProduct.name}: ${s.topProduct.unitShare}% of observed units`);
    if(s.rushShare>0)signals.push(`${s.rushShare}% High/Urgent`);
    if(s.weekdaySignal)signals.push(`${s.weekdaySignal.avgUnits} units typical this weekday`);
    detail.textContent=signals.slice(0,2).join(' · ')||'Factory-specific demand patterns are building from observed orders.';
  }

  function mount(){mountNavigation();mountLearningView();mountLearningPeek();mountDecisionStory();setTimeout(()=>{moveLearningPanel();refreshLearningPeek();},0);}

  // Extend the existing router without changing the underlying views or planning logic.
  if(typeof showView==='function'){
    showView=function(){
      const allowed=['today','orders','buy','learning','more'];
      const view=allowed.includes(location.hash.slice(1))?location.hash.slice(1):'today';
      document.querySelectorAll('[data-view]').forEach(x=>x.hidden=x.dataset.view!==view);
      document.querySelectorAll('[data-nav]').forEach(a=>a.dataset.nav===view?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current'));
      if(view==='learning')setTimeout(moveLearningPanel,0);
      window.scrollTo(0,0);
    };
  }

  const previousRecalc=typeof recalc==='function'?recalc:null;
  if(previousRecalc)recalc=function(){const value=previousRecalc.apply(this,arguments);setTimeout(refreshLearningPeek,0);return value;};

  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{mount();if(typeof showView==='function')showView();},0));
  window.addEventListener('hashchange',()=>setTimeout(()=>{moveLearningPanel();refreshLearningPeek();},0));
})();
