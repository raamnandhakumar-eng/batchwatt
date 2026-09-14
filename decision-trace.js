/* Standardized planner decision trace. */
'use strict';
(function(){
  function mountDecisionTrace(){
    const plan=document.querySelector('.simple-plan');
    if(!plan||document.getElementById('decision-trace-panel'))return;
    document.querySelector('.pipeline-details')?.remove();
    const panel=document.createElement('section');
    panel.id='decision-trace-panel';
    panel.className='decision-trace-panel';
    panel.innerHTML='<div class="trace-head"><div><p class="eyebrow">STANDARD DECISION LOGIC</p><h2>Why each order is RUN, SHIFT, or HOLD</h2><p>Delivery first. Feasibility second. Peak third. Cost fourth.</p></div><span class="trace-badge">LIVE</span></div><div id="integration-health" class="integration-health"></div><div class="trace-rulebar"><span><b>1</b> Data</span><i>→</i><span><b>2</b> Validate</span><i>→</i><span><b>3</b> Feasibility</span><i>→</i><span><b>4</b> Prioritize</span><i>→</i><span><b>5</b> Baseline</span><i>→</i><span><b>6</b> Energy</span><i>→</i><span><b>7</b> Action</span></div><div id="trace-summary" class="trace-summary"></div><div id="trace-runs" class="trace-runs"></div>';
    plan.insertAdjacentElement('beforebegin',panel);
  }
  window.BatchWattDecisionTrace={mountDecisionTrace};
  document.addEventListener('DOMContentLoaded',mountDecisionTrace);
  window.addEventListener('hashchange',mountDecisionTrace);
})();
