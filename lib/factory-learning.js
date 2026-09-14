/* BatchWatt per-factory learning model. Learns demand patterns from observed orders only. */
(function(root){
  'use strict';
  const copy=x=>JSON.parse(JSON.stringify(x));
  const safeNum=x=>Number.isFinite(Number(x))?Number(x):0;
  const norm=x=>String(x??'').trim();
  const productName=(id,products=[])=>products.find(p=>p.id===id)?.name||id||'Unknown product';
  const orderKey=o=>norm(o.externalId)?`ext:${norm(o.externalId).toLowerCase()}`:norm(o.id)?`id:${norm(o.id)}`:`row:${[o.customer,o.productId,o.qty,o.due].map(norm).join('|').toLowerCase()}`;
  const hourOf=due=>{const m=String(due||'').match(/T(\d{2}):(\d{2})/);return m?Number(m[1]):null;};
  const dateOf=due=>String(due||'').slice(0,10);
  const weekdayOf=due=>{const d=new Date(`${dateOf(due)}T12:00:00`);return Number.isNaN(d.getTime())?null:d.getDay();};
  const pct=(a,b)=>b?Math.round(a/b*1000)/10:0;
  const quantile=(values,q)=>{const a=values.map(Number).filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return 0;const i=(a.length-1)*q,lo=Math.floor(i),hi=Math.ceil(i);return Math.round((a[lo]+(a[hi]-a[lo])*(i-lo))*100)/100;};

  function empty(factoryId=''){
    return {version:1,factoryId,observations:[],createdAt:null,updatedAt:null};
  }

  function merge(state,orders=[],products=[],capturedAt=new Date().toISOString()){
    const next=copy(state&&state.version===1?state:empty(state?.factoryId||''));
    const byKey=new Map((next.observations||[]).map((o,i)=>[o.key,i]));
    let added=0,updated=0;
    for(const o of orders||[]){
      if(!o||!o.productId||safeNum(o.qty)<=0||!o.due)continue;
      const key=orderKey(o),obs={key,id:norm(o.id),externalId:norm(o.externalId),customer:norm(o.customer)||'Unknown customer',productId:norm(o.productId),product:productName(o.productId,products),qty:safeNum(o.qty),due:norm(o.due),priority:norm(o.priority)||'Standard',capturedAt};
      if(byKey.has(key)){
        const i=byKey.get(key),prior=next.observations[i];
        next.observations[i]={...prior,...obs,capturedAt:prior.capturedAt||capturedAt,lastSeenAt:capturedAt};updated++;
      }else{
        obs.firstSeenAt=capturedAt;obs.lastSeenAt=capturedAt;next.observations.push(obs);byKey.set(key,next.observations.length-1);added++;
      }
    }
    if(!next.createdAt&&next.observations.length)next.createdAt=capturedAt;
    if(added||updated)next.updatedAt=capturedAt;
    return {state:next,added,updated};
  }

  function summarize(state,forDate=''){
    const obs=state?.observations||[],sampleCount=obs.length,totalUnits=obs.reduce((s,o)=>s+safeNum(o.qty),0);
    const customers=new Map(),products=new Map(),priorities={Urgent:0,High:0,Standard:0},hours=Array(24).fill(0),days=new Map(),weekdays=Array.from({length:7},()=>({dates:new Set(),units:0,orders:0}));
    for(const o of obs){
      const c=norm(o.customer)||'Unknown customer';customers.set(c,(customers.get(c)||0)+1);
      const p=products.get(o.productId)||{productId:o.productId,name:o.product||o.productId,orders:0,units:0,quantities:[],daily:new Map()};p.orders++;p.units+=safeNum(o.qty);p.quantities.push(safeNum(o.qty));const day=dateOf(o.due);if(day)p.daily.set(day,(p.daily.get(day)||0)+safeNum(o.qty));products.set(o.productId,p);
      priorities[o.priority]=(priorities[o.priority]||0)+1;
      const h=hourOf(o.due);if(h!=null)hours[h]++;
      if(day){const d=days.get(day)||{orders:0,units:0};d.orders++;d.units+=safeNum(o.qty);days.set(day,d);const wd=weekdayOf(o.due);if(wd!=null){weekdays[wd].dates.add(day);weekdays[wd].units+=safeNum(o.qty);weekdays[wd].orders++;}}
    }
    const productStats=[...products.values()].map(p=>({productId:p.productId,name:p.name,orders:p.orders,units:Math.round(p.units*100)/100,orderShare:pct(p.orders,sampleCount),unitShare:pct(p.units,totalUnits),avgQty:Math.round(p.units/p.orders*100)/100,medianQty:quantile(p.quantities,.5),p75DailyUnits:quantile([...p.daily.values()],.75)})).sort((a,b)=>b.units-a.units||b.orders-a.orders||a.name.localeCompare(b.name));
    const customerStats=[...customers.entries()].map(([name,count])=>({name,count,share:pct(count,sampleCount)})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name));
    const repeatOrders=customerStats.filter(c=>c.count>1).reduce((s,c)=>s+c.count,0);
    const busiestHour=hours.reduce((best,n,h)=>n>best.count?{hour:h,count:n}:best,{hour:null,count:0});
    const rush=(priorities.Urgent||0)+(priorities.High||0);
    const confidence=sampleCount>=100?'Strong':sampleCount>=30?'Growing':'Early';
    const confidenceScore=Math.min(100,Math.round(sampleCount/100*100));
    const targetDay=forDate?new Date(`${forDate}T12:00:00`).getDay():null;
    const w=targetDay!=null?weekdays[targetDay]:null;
    const weekdaySignal=w&&w.dates.size?{weekday:targetDay,observedDates:w.dates.size,avgUnits:Math.round(w.units/w.dates.size*100)/100,avgOrders:Math.round(w.orders/w.dates.size*100)/100}:null;
    return {
      sampleCount,totalUnits:Math.round(totalUnits*100)/100,uniqueCustomers:customers.size,uniqueProducts:products.size,observedDueDates:days.size,
      confidence,confidenceScore,productStats,customerStats,priorities,rushShare:pct(rush,sampleCount),repeatCustomerOrderShare:pct(repeatOrders,sampleCount),busiestDueHour:busiestHour.hour,busiestDueHourCount:busiestHour.count,weekdaySignal,
      topProduct:productStats[0]||null,topCustomer:customerStats[0]||null
    };
  }

  function describe(summary){
    const out=[];
    if(!summary?.sampleCount)return out;
    if(summary.topProduct)out.push(`${summary.topProduct.name} is ${summary.topProduct.unitShare}% of observed unit demand.`);
    if(summary.busiestDueHour!=null)out.push(`The busiest due-time hour is around ${String(summary.busiestDueHour).padStart(2,'0')}:00.`);
    if(summary.rushShare>0)out.push(`${summary.rushShare}% of observed orders are High or Urgent priority.`);
    if(summary.weekdaySignal)out.push(`For this weekday, observed demand averages ${summary.weekdaySignal.avgUnits} units across ${summary.weekdaySignal.observedDates} due dates.`);
    return out;
  }

  const api={empty,merge,summarize,describe,orderKey};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BatchWattFactoryLearning=api;
})(typeof globalThis!=='undefined'?globalThis:this);
