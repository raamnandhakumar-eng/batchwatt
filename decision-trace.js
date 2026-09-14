/* Live integration health and planner decision trace. */
'use strict';
(function(){
  function mountDecisionTrace(){
    const plan=document.querySelector('.simple-plan');
    if(!plan||document.getElementById('decision-trace-panel'))return;
    document.querySelector('.pipeline-details')?.remove();
    const panel=document.createElement('section');
    panel.id='decision-trace-panel';
    panel.className='decision-trace-panel';
    panel.innerHTML='<div class="trace-head"><div><p class="eyebrow">SHARED MODEL + DECISION TRACE</p><h2>Why this plan?</h2><p>Current inputs, constraints and scheduling decisions.</p></div><span class="trace-badge">LIVE</span></div><div id="integration-health" class="integration-health"></div><div class="trace-rulebar"><span><b>1</b> Due time</span><i>→</i><span><b>2</b> Stock & materials</span><i>→</i><span><b>3</b> Line capacity</span><i>→</i><span><b>4</b> Peak target</span><i>→</i><span><b>5</b> Cost</span></div><div id="trace-summary" class="trace-summary"></div><div id="trace-runs" class="trace-runs"></div>';
    plan.insertAdjacentElement('beforebegin',panel);
  }
  window.BatchWattDecisionTrace={mountDecisionTrace};
  document.addEventListener('DOMContentLoaded',mountDecisionTrace);
  window.addEventListener('hashchange',mountDecisionTrace);
})();
