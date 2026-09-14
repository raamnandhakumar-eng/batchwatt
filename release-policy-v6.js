/* V6 release policy: HOLD orders stay visible but do not automatically block runnable work. */
'use strict';
(function(){
  if(!window.BatchWattOperations)return;
  const legacy=window.BatchWattOperations;
  const baseSummary=legacy.summary.bind(legacy);
  legacy.summary=function(input,result,workflow){
    const s=baseSummary(input,result,workflow);
    if(!result)return s;
    const open=(s.items||[]).filter(i=>i.state?.status!=='Resolved');
    const attentionCritical=open.filter(i=>i.severity==='critical');
    const releaseCritical=open.filter(i=>i.severity==='critical'&&i.type==='Energy');
    const runnableJobs=(result.proposed?.jobs||[]).length;
    const stockReadyOrders=(result.allocations||[]).filter(a=>!a.produce&&Number(a.dueMinute)>=0).length;
    const blocked=(result.proposed?.unscheduled||[]).length;
    const peakBreach=Boolean(s.peakBreach);
    const hasWork=runnableJobs>0||stockReadyOrders>0||(!(result.allocations||[]).length&&Boolean(result));
    const releasable=!peakBreach&&!releaseCritical.length&&hasWork;
    return {...s,criticalCount:releaseCritical.length,attentionCriticalCount:attentionCritical.length,releaseBlockerCount:releaseCritical.length+(peakBreach?1:0),runnableJobs,stockReadyOrders,allOrdersFeasible:blocked===0,partialRelease:releasable&&blocked>0,releaseMode:releasable?(blocked?'partial':'full'):'blocked',releasable};
  };
  window.BatchWattOperations=legacy;
  if(typeof renderToday==='function'){
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
  }
})();
