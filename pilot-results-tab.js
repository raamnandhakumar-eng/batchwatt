/* Read-only pilot/resume facts tab. Product changes must not rewrite these claims. */
'use strict';
(function(){
  const LOCKED = {
    headline: 'BatchWatt — Energy / operations decision-support platform | 2026',
    bullets: [
      'Built and deployed a Vercel decision-support tool that unified fragmented order, stock, production, and energy data from Excel/CSV and pasted orders into a single decision-support view; calculates shortages, ranks dispatch risk, recommends sequencing, and surfaces planning-time, energy, and peak-load indicators.',
      'Across 2 operational pilot workbooks, 19 planning cycles, and 73 orders, surfaced 16 at-risk orders/dispatches and recorded 14 sequencing changes; supplied pilot data showed 62–64% lower planning time, 6.7–8.8% estimated energy reduction, and 9.0–11.7% peak-load reduction.'
    ],
    pilots: [
      {key:'rkg',name:'RKG Ghee',cycles:10,orders:32,skus:6,risk:9,changes:7,planning:'64.2%',energy:'8.8% estimated',peak:'11.7%',rating:'4.34 / 5'},
      {key:'pr',name:'PR Food Products',cycles:9,orders:41,skus:8,risk:7,changes:7,planning:'62.3%',energy:'6.7% estimated',peak:'9.0%',rating:'4.26 / 5'}
    ]
  };

  function mount(){
    if(document.getElementById('pilot-results')) return;
    const tabs=document.querySelector('.tabs');
    const main=document.querySelector('main.shell');
    if(!tabs||!main) return;

    const more=tabs.querySelector('[data-nav="more"]');
    const nav=document.createElement('a');
    nav.href='#pilot-results'; nav.dataset.nav='pilot-results'; nav.textContent='Pilot Results';
    tabs.insertBefore(nav,more||null);

    const section=document.createElement('section');
    section.id='pilot-results'; section.dataset.view='pilot-results'; section.className='view'; section.hidden=true;
    section.innerHTML=`
      <div class="page-head pilot-head">
        <div><p class="eyebrow">PILOT RESULTS</p><h1>Recorded BatchWatt pilot facts</h1><p class="subtle">Read-only reference. These are the locked facts preserved from the resume/application record.</p></div>
        <span class="status-pill good">Claims locked</span>
      </div>

      <section class="panel locked-claims">
        <p class="eyebrow">LOCKED RESUME DESCRIPTION</p>
        <h2>${esc(LOCKED.headline)}</h2>
        <ul>${LOCKED.bullets.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
      </section>

      <div class="pilot-grid">
        ${LOCKED.pilots.map(p=>`
          <article class="panel pilot-card">
            <div class="panel-head"><div><p class="eyebrow">OPERATIONAL PILOT</p><h2>${esc(p.name)}</h2></div><button class="primary" data-pilot-demo="${p.key}">Run demo</button></div>
            <div class="pilot-metrics">
              <div><span>Planning cycles</span><strong>${p.cycles}</strong></div>
              <div><span>Orders</span><strong>${p.orders}</strong></div>
              <div><span>SKUs</span><strong>${p.skus}</strong></div>
              <div><span>At-risk orders / dispatches</span><strong>${p.risk}</strong></div>
              <div><span>Sequencing changes</span><strong>${p.changes}</strong></div>
              <div><span>Planning-time reduction</span><strong>${esc(p.planning)}</strong></div>
              <div><span>Energy reduction</span><strong>${esc(p.energy)}</strong></div>
              <div><span>Peak-load reduction</span><strong>${esc(p.peak)}</strong></div>
              <div><span>Operator rating</span><strong>${esc(p.rating)}</strong></div>
            </div>
          </article>`).join('')}
      </div>

      <section class="panel claim-boundary">
        <p class="eyebrow">EVIDENCE BOUNDARY</p>
        <p>Pilot metrics are calculated from the supplied BatchWatt pilot workbooks. They must not be described as independently verified, customer-approved, or externally audited unless that evidence is later attached and explicitly approved for use.</p>
        <p>New product capabilities such as dashboards, SaaS authentication, database persistence, or richer optimization must not be retroactively represented as features deployed during the two 2026 pilots.</p>
      </section>`;
    main.appendChild(section);
  }

  function runDemo(key){
    const scenario=window.BATCHWATT_DEMOS?.[key];
    if(!scenario) return;
    input=scenario.input();
    workflow={items:{},release:null};
    recalc();
    goto('today');
    const save=document.getElementById('save-state');
    if(save) save.textContent=`${scenario.title} demo loaded`;
  }

  const priorShow=showView;
  showView=function(){
    const view=['today','pilot-results','orders','buy','more'].includes(location.hash.slice(1))?location.hash.slice(1):'today';
    document.querySelectorAll('[data-view]').forEach(x=>x.hidden=x.dataset.view!==view);
    document.querySelectorAll('[data-nav]').forEach(a=>a.toggleAttribute('aria-current',a.dataset.nav===view));
    window.scrollTo(0,0);
  };

  document.addEventListener('click',e=>{const b=e.target.closest('[data-pilot-demo]');if(b)runDemo(b.dataset.pilotDemo);});
  document.addEventListener('DOMContentLoaded',()=>{mount();showView();});
})();
