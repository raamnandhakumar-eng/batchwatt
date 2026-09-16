/* Explain planner outputs without inventing savings or data provenance. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.BatchWattEnergyReview=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function delivery(plan,schedule){
    const held=new Set((schedule.unscheduled||[]).map(x=>x.id));
    const jobs=new Map((schedule.jobs||[]).map(x=>[x.id,x]));
    const start=Number(String(plan.shift.start).slice(0,2))*60+Number(String(plan.shift.start).slice(3));
    return (plan.allocations||[]).reduce((n,a)=>{
      if(held.has(a.id))return n;
      const j=jobs.get(a.id);
      return n+(j?Number(j.lateMinutes===0):Number(!a.produce&&a.dueMinute>=start));
    },0);
  }
  function review(input,plan){
    const checks=[];
    const lines=input.lines||[];
    const missing=lines.filter(l=>l.kw==null||l.kw===''||!Number.isFinite(Number(l.kw))||Number(l.kw)<=0);
    checks.push({label:'Machine power',status:missing.length?'Missing':'Supplied assumption',detail:missing.length?`${missing.length} line(s) need a positive kW rating.`:'Line kW values are supplied inputs; meter verification is not recorded.'});
    const counted=input.inventoryCountedAt;
    const when=counted?new Date(counted):null;
    const shift=new Date(`${input.shift?.date}T${input.shift?.start||'00:00'}`);
    const age=when?(shift-when)/3600000:NaN;
    checks.push({label:'Inventory freshness',status:!Number.isFinite(age)?'Unknown':age<0?'Review date':age>24?'Stale':'Dated snapshot',detail:!Number.isFinite(age)?'No stock-count timestamp recorded. Confirm finished goods, packaging and material counts.':age<0?'The stock count is after the shift starts. Review the count date or shift date.':age>24?`Stock count predates shift start by ${Math.floor(age)} hours. Recheck quantities.`:`Stock counted ${counted.replace('T',' ')}. This is a user-recorded timestamp.`});
    const used=plan?.energyInput?.intervalsUsed||0,total=plan?.energyInput?.shiftIntervals||0;
    checks.push({label:'Background load',status:used===0?'Estimated':used<total?'Partial coverage':'Imported',detail:used===0?'All intervals use configured background kW. This is not a live meter feed.':`${used} of ${total} shift intervals use imported background load; ${total-used} use configured background kW.`});
    const overrides=(plan?.proposed?.profile||[]).filter(x=>x.energySource==='interval-import').length;
    checks.push({label:'Tariff basis',status:'User supplied',detail:`Configured time-of-use rates apply unless an imported interval supplies a rate. ${overrides} imported load intervals may carry rate overrides. Confirm currency and utility tariff.`});
    if(!plan)return {checks};
    const b=plan.baseline,p=plan.proposed;
    const before=delivery(plan,b),after=delivery(plan,p);
    const comparable=JSON.stringify(b.jobs.map(j=>j.id).sort())===JSON.stringify(p.jobs.map(j=>j.id).sort());
    const increasedLate=p.totalLateMinutes>b.totalLateMinutes;
    return {checks,beforeOnTime:before,afterOnTime:after,comparable,
      deliveryWarning:after<before||p.unscheduled.length>b.unscheduled.length||increasedLate,
      usageSaving:b.usageCost-p.usageCost,demandSaving:b.demandExposure-p.demandExposure,
      tradeoff:comparable?'The same production orders are scheduled in both scenarios.':'Scheduled order sets differ. Energy and cost changes also reflect a change in production served; do not treat the full difference as efficiency savings.'};
  }
  return {review,delivery};
});
