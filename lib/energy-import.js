/* Parse energy settings and interval-load spreadsheets. */
(function(root){
  'use strict';
  const clean=value=>String(value??'').trim();
  const norm=value=>clean(value).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

  const intervalSynonyms={
    time:['time','timestamp','date time','datetime','interval','interval start','start time'],
    kw:['facility kw','baseline kw','base kw','load kw','demand kw','power kw','facility load','load','kw'],
    rate:['tariff rate','energy rate','rate','price','price per kwh','usd per kwh']
  };
  const settingsSynonyms={
    baseKw:['base kw','background kw','background load','base load','facility base kw'],
    peakLimitKw:['peak target kw','peak limit kw','peak target','peak limit','demand target kw'],
    monthlyPeakKw:['monthly peak kw','current monthly peak kw','current peak kw','monthly peak'],
    rate:['off peak rate','offpeak rate','energy rate','standard rate','rate'],
    peakRate:['peak rate','on peak rate','peak energy rate'],
    peakStart:['peak start','peak window start','on peak start'],
    peakEnd:['peak end','peak window end','on peak end'],
    demandRate:['demand rate','demand charge','demand charge rate','demand rate per kw'],
    currency:['currency','currency code']
  };

  function parseDelimited(text){
    const source=String(text||'').replace(/\r\n?/g,'\n');
    if(!source.trim())return [];
    const delimiter=source.includes('\t')?'\t':',';
    const rows=[];let row=[],field='',quoted=false;
    for(let i=0;i<source.length;i++){
      const ch=source[i];
      if(ch==='"'){
        if(quoted&&source[i+1]==='"'){field+='"';i++;}else quoted=!quoted;
      }else if(ch===delimiter&&!quoted){row.push(field);field='';}
      else if(ch==='\n'&&!quoted){row.push(field);if(row.some(v=>clean(v)!==''))rows.push(row);row=[];field='';}
      else field+=ch;
    }
    row.push(field);if(row.some(v=>clean(v)!==''))rows.push(row);
    return rows;
  }

  function findHeader(headers,names){
    const normalized=headers.map(norm);
    let idx=normalized.findIndex(h=>names.includes(h));
    if(idx<0)idx=normalized.findIndex(h=>names.some(name=>h.includes(name)||name.includes(h)));
    return idx;
  }

  function autoMap(headers,mode){
    const source=mode==='settings'?settingsSynonyms:intervalSynonyms;
    const out={};
    Object.entries(source).forEach(([key,names])=>{out[key]=findHeader(headers,names);});
    return out;
  }

  function detectMode(headers){
    const interval=autoMap(headers,'interval');
    const settings=autoMap(headers,'settings');
    const intervalScore=(interval.time>=0?1:0)+(interval.kw>=0?1:0)+(interval.rate>=0?0.25:0);
    const settingsScore=Object.values(settings).filter(i=>i>=0).length;
    if(intervalScore>=2)return 'interval';
    if(settingsScore>=2)return 'settings';
    return 'unknown';
  }

  function timeText(value){
    if(value instanceof Date&&!Number.isNaN(value.getTime()))return `${String(value.getHours()).padStart(2,'0')}:${String(value.getMinutes()).padStart(2,'0')}`;
    if(typeof value==='number'&&Number.isFinite(value)){
      const fraction=((value%1)+1)%1;
      const minutes=Math.round(fraction*1440)%1440;
      return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
    }
    const text=clean(value);
    let m=text.match(/(?:^|[ T])(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
    if(!m)m=text.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
    if(!m)return '';
    let h=Number(m[1]),min=Number(m[2]||0);const ap=String(m[3]||'').toUpperCase();
    if(ap==='PM'&&h<12)h+=12;if(ap==='AM'&&h===12)h=0;
    if(h<0||h>23||min<0||min>59)return '';
    return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
  }

  function minutes(text){
    if(!/^\d{2}:\d{2}$/.test(String(text)))return NaN;
    const [h,m]=String(text).split(':').map(Number);return h*60+m;
  }

  function buildIntervalLoad(matrix,mapping,context={}){
    if(!Array.isArray(matrix)||matrix.length<2)return {valid:[],invalid:[],total:0,coverage:0};
    if(!Number.isInteger(mapping?.time)||mapping.time<0||!Number.isInteger(mapping?.kw)||mapping.kw<0){
      return {valid:[],invalid:[{row:1,errors:['Map Time and Facility kW columns.']}],total:Math.max(0,matrix.length-1),coverage:0};
    }
    const start=minutes(context.shift?.start||'00:00'),end=minutes(context.shift?.end||'23:45');
    const seen=new Set(),valid=[],invalid=[];
    for(let i=1;i<matrix.length;i++){
      const row=matrix[i]||[];if(row.every(v=>clean(v)===''))continue;
      const time=timeText(row[mapping.time]);
      const kw=Number(String(row[mapping.kw]??'').replace(/,/g,''));
      const rate=mapping.rate>=0&&clean(row[mapping.rate])!==''?Number(String(row[mapping.rate]).replace(/[$,]/g,'')):null;
      const errors=[];const minute=minutes(time);
      if(!time)errors.push('Time is invalid.');
      else if(minute%15!==0)errors.push('Time must use 15-minute intervals.');
      if(!Number.isFinite(kw)||kw<0)errors.push('Facility kW must be zero or greater.');
      if(rate!=null&&(!Number.isFinite(rate)||rate<0))errors.push('Tariff rate must be zero or greater.');
      if(time&&seen.has(time))errors.push(`Duplicate interval ${time}.`);
      if(errors.length){invalid.push({row:i+1,values:row,errors});continue;}
      seen.add(time);
      valid.push({row:i+1,draft:{time,kw,rate:rate==null?null:rate,inShift:Number.isFinite(start)&&Number.isFinite(end)?minute>=start&&minute<end:true}});
    }
    const inShift=valid.filter(x=>x.draft.inShift).length;
    const expected=Number.isFinite(start)&&Number.isFinite(end)&&end>start?(end-start)/15:0;
    return {valid,invalid,total:valid.length+invalid.length,coverage:expected?Math.round(inShift/expected*100):0,expectedIntervals:expected,inShiftIntervals:inShift};
  }

  function buildSettings(matrix,mapping){
    if(!Array.isArray(matrix)||matrix.length<2)return {valid:null,errors:['Energy settings need a header row and one data row.']};
    const row=matrix.slice(1).find(r=>Array.isArray(r)&&r.some(v=>clean(v)!==''));
    if(!row)return {valid:null,errors:['Energy settings file has no data row.']};
    const out={},errors=[];
    const numericFields=['baseKw','peakLimitKw','monthlyPeakKw','rate','peakRate','demandRate'];
    let mapped=0;
    Object.entries(mapping||{}).forEach(([key,index])=>{
      if(!Number.isInteger(index)||index<0)return;mapped++;
      const raw=row[index];
      if(numericFields.includes(key)){
        const n=Number(String(raw??'').replace(/[$,]/g,''));
        if(!Number.isFinite(n)||n<0)errors.push(`${key} must be zero or greater.`);else out[key]=n;
      }else if(key==='peakStart'||key==='peakEnd'){
        const t=timeText(raw);if(!t)errors.push(`${key} is invalid.`);else out[key]=t;
      }else if(key==='currency'){
        const c=clean(raw).toUpperCase();if(!/^[A-Z]{3}$/.test(c))errors.push('Currency must be a three-letter code.');else out.currency=c;
      }
    });
    if(mapped<2)errors.push('Map at least two energy settings columns.');
    if(Object.prototype.hasOwnProperty.call(out,'peakLimitKw')&&out.peakLimitKw<=0)errors.push('Peak target must be greater than zero.');
    return {valid:errors.length?null:out,errors};
  }

  const api={parseDelimited,autoMap,detectMode,timeText,buildIntervalLoad,buildSettings};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BatchWattEnergyImport=api;
})(typeof globalThis!=='undefined'?globalThis:this);
