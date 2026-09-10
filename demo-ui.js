/* Usable demo launcher + plan export for BatchWatt. */
'use strict';
(function(){
  function mountDemoPanel(){
    if(document.getElementById('demo-showcase')) return;
    const today = document.getElementById('today');
    const head = today?.querySelector('.today-head');
    if(!today || !head || !window.BATCHWATT_DEMOS) return;
    const section = document.createElement('section');
    section.id = 'demo-showcase';
    section.className = 'panel demo-showcase';
    section.innerHTML = `
      <div class="panel-head">
        <div><p class="eyebrow">TRY BATCHWATT</p><h2>Two working demos</h2><p class="subtle">Load a complete operating scenario, change the inputs, and watch the shift plan recalculate.</p></div>
        <button class="quiet" id="download-order-template">Order template</button>
      </div>
      <div class="demo-grid">
        ${Object.entries(window.BATCHWATT_DEMOS).map(([key,d])=>`
          <article class="demo-card">
            <div><span class="demo-tag">${esc(d.subtitle)}</span><h3>${esc(d.title)}</h3><p>${esc(d.prompt)}</p></div>
            <div class="demo-evidence"><span>Recorded pilot context</span><strong>${esc(d.evidence.orders)} orders · ${esc(d.evidence.skus)} SKUs</strong><small>${esc(d.evidence.planning)} planning time · ${esc(d.evidence.peak)} peak load</small></div>
            <button class="primary" data-load-scenario="${key}">Run demo</button>
          </article>`).join('')}
      </div>
      <p class="demo-boundary">Demo workspaces are illustrative. Recorded pilot metrics remain separately documented and are not represented as independently verified.</p>`;
    head.insertAdjacentElement('afterend', section);
    document.getElementById('download-order-template')?.addEventListener('click',downloadOrderTemplate);
  }

  function loadScenario(key){
    const scenario = window.BATCHWATT_DEMOS?.[key];
    if(!scenario) return;
    input = scenario.input();
    workflow = {items:{},release:null};
    recalc();
    goto('today');
    const save = document.getElementById('save-state');
    if(save) save.textContent = `${scenario.title} demo loaded`;
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function downloadOrderTemplate(){
    const sampleProduct = input?.products?.[0]?.name || 'Product name';
    const date = input?.shift?.date || localDate();
    const csv = [
      ['Customer','Product','Quantity','Due','Priority','Order Reference'],
      ['Example customer',sampleProduct,'100',`${date} 15:00`,'High','EXAMPLE-001']
    ].map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='batchwatt-order-template.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function exportPlan(){
    const rows = orderRows();
    const jobs = result?.proposed?.jobs || [];
    const purchases = result?.procurement?.requirements || [];
    const rs = release();
    const payload = {
      exportedAt:new Date().toISOString(),
      factory:input.factory,
      shift:input.shift,
      status:rs.isReleased?'Released':(result && ops().releasable?'Ready to release':'Needs action'),
      energy:{inputs:input.energy,planned:result?{peakKw:result.proposed.peakKw,kwh:result.proposed.kwh,usageCost:result.proposed.usageCost}:null},
      orders:rows,
      production:jobs,
      procurement:purchases.filter(x=>Number(x.toBuy)>0)
    };
    const blob = new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `batchwatt-${String(input.factory||'factory').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}-${input.shift.date}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function mountExport(){
    if(document.getElementById('export-plan')) return;
    const appbar = document.querySelector('.appbar-right');
    if(!appbar) return;
    const b=document.createElement('button');
    b.id='export-plan';b.className='quiet';b.textContent='Export plan';
    appbar.insertBefore(b,document.getElementById('open-order'));
    b.addEventListener('click',exportPlan);
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-load-scenario]');
    if(b) loadScenario(b.dataset.loadScenario);
  });
  document.addEventListener('DOMContentLoaded',()=>{mountDemoPanel();mountExport();});
})();
