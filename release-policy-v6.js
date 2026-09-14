/* V6 release presentation: shared operations engine decides full/partial/blocked release. */
'use strict';
(function(){
  if(typeof renderToday!=='function'||!window.BatchWattOperations)return;
  const prior=renderToday;
  renderToday=function(){
    const value=prior.apply(this,arguments);
    try{
      if(result){
        const s=BatchWattOperations.summary(input,result,workflow);
        if(s.partialRelease){
          const title=document.getElementById('release-title');
          const detail=document.getElementById('release-detail');
          const status=document.getElementById('plan-status');
          if(title)title.textContent='Partial release ready';
          if(detail)detail.textContent=`${s.runnableJobs} runnable production run${s.runnableJobs===1?'':'s'} can proceed; ${s.blockedOrders} order${s.blockedOrders===1?' remains':'s remain'} on HOLD.`;
          if(status){status.textContent='Partial release ready';status.className='status-pill warn';}
        }
      }
    }catch{}
    return value;
  };
})();
