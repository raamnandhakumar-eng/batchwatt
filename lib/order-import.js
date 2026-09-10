/* Parse pasted spreadsheet rows, CSV, and mapped order tables. */
(function(root){
  'use strict';

  const clean = value => String(value ?? '').trim();
  const norm = value => clean(value).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const synonyms = {
    customer:['customer','customer name','client','buyer','account','distributor','retailer'],
    product:['product','product name','item','item name','sku','stock keeping unit'],
    qty:['qty','quantity','order qty','order quantity','units','unit quantity'],
    due:['due','due date','delivery due','delivery date','dispatch by','required by','required date','ship by'],
    priority:['priority','urgency','service level'],
    orderId:['order id','order no','order number','customer po','customer po no','reference','ref']
  };

  function parseDelimited(text){
    const source=String(text||'').replace(/\r\n?/g,'\n');
    if(!source.trim())return [];
    const delimiter=source.includes('\t')?'\t':',';
    const rows=[]; let row=[], field='', quoted=false;
    for(let i=0;i<source.length;i++){
      const ch=source[i];
      if(ch==='"'){
        if(quoted&&source[i+1]==='"'){field+='"';i++;}
        else quoted=!quoted;
      }else if(ch===delimiter&&!quoted){row.push(field);field='';}
      else if(ch==='\n'&&!quoted){row.push(field);if(row.some(v=>clean(v)!==''))rows.push(row);row=[];field='';}
      else field+=ch;
    }
    row.push(field); if(row.some(v=>clean(v)!==''))rows.push(row);
    return rows;
  }

  function autoMap(headers){
    const normalized=headers.map(norm), mapping={customer:-1,product:-1,qty:-1,due:-1,priority:-1,orderId:-1};
    for(const [field,names] of Object.entries(synonyms)){
      let idx=normalized.findIndex(h=>names.includes(h));
      if(idx<0)idx=normalized.findIndex(h=>names.some(name=>h.includes(name)||name.includes(h)));
      mapping[field]=idx;
    }
    return mapping;
  }

  function toLocalDateTime(value,shift={}){
    if(value instanceof Date&&!Number.isNaN(value.getTime())){
      const y=value.getFullYear(),m=String(value.getMonth()+1).padStart(2,'0'),d=String(value.getDate()).padStart(2,'0'),h=String(value.getHours()).padStart(2,'0'),min=String(value.getMinutes()).padStart(2,'0');
      return `${y}-${m}-${d}T${h}:${min}`;
    }
    if(typeof value==='number'&&Number.isFinite(value)){
      const excelEpoch=Date.UTC(1899,11,30); const ms=excelEpoch+value*86400000; const d=new Date(ms);
      const y=d.getUTCFullYear(),m=String(d.getUTCMonth()+1).padStart(2,'0'),day=String(d.getUTCDate()).padStart(2,'0'),h=String(d.getUTCHours()).padStart(2,'0'),min=String(d.getUTCMinutes()).padStart(2,'0');
      return `${y}-${m}-${day}T${h}:${min}`;
    }
    let text=clean(value);
    if(!text)return '';
    text=text.replace(/\s+/g,' ');
    let m=text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?$/);
    if(m){return `${m[1]}-${m[2]}-${m[3]}T${String(m[4]??String(shift.end||'17:00').split(':')[0]).padStart(2,'0')}:${m[5]??String(shift.end||'17:00').split(':')[1]}`;}
    m=text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?)?$/i);
    if(m){
      let year=Number(m[3]); if(year<100)year+=2000;
      let hour=m[4]==null?Number(String(shift.end||'17:00').split(':')[0]):Number(m[4]);
      const minute=m[5]==null?(m[4]==null?Number(String(shift.end||'17:00').split(':')[1]):0):Number(m[5]);
      const ap=(m[6]||'').toUpperCase(); if(ap==='PM'&&hour<12)hour+=12; if(ap==='AM'&&hour===12)hour=0;
      return `${year}-${String(Number(m[1])).padStart(2,'0')}-${String(Number(m[2])).padStart(2,'0')}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
    }
    const parsed=new Date(text);
    if(!Number.isNaN(parsed.getTime()))return toLocalDateTime(parsed,shift);
    return '';
  }

  function matchProduct(value,products=[]){
    const wanted=norm(value); if(!wanted)return {error:'Product is required.'};
    const exact=products.find(p=>norm(p.id)===wanted||norm(p.name)===wanted);
    if(exact)return {productId:exact.id,name:exact.name};
    const matches=products.filter(p=>norm(p.name).includes(wanted)||wanted.includes(norm(p.name)));
    if(matches.length===1)return {productId:matches[0].id,name:matches[0].name};
    if(matches.length>1)return {error:`Product "${clean(value)}" matches more than one configured product.`};
    return {error:`Product "${clean(value)}" is not in BatchWatt setup.`};
  }

  function normalizePriority(value){
    const p=norm(value);
    if(!p)return 'Standard';
    if(['urgent','critical','rush','asap'].includes(p))return 'Urgent';
    if(['high','important'].includes(p))return 'High';
    if(['standard','normal','medium','low'].includes(p))return 'Standard';
    return null;
  }

  function buildOrders(matrix,mapping,context={}){
    const products=context.products||[], existing=context.existingOrders||[], shift=context.shift||{};
    if(!Array.isArray(matrix)||matrix.length<2)return {valid:[],invalid:[],total:0};
    const required=['customer','product','qty','due'];
    const missing=required.filter(key=>!Number.isInteger(mapping?.[key])||mapping[key]<0);
    if(missing.length)return {valid:[],invalid:[{row:1,errors:[`Map required columns: ${missing.join(', ')}.`]}],total:Math.max(0,matrix.length-1)};
    const fingerprints=new Set(existing.map(o=>[norm(o.customer),norm((products.find(p=>p.id===o.productId)||{}).name||o.productId),Number(o.qty),clean(o.due)].join('|')));
    const externalIds=new Set(existing.map(o=>norm(o.externalId||o.id)));
    const valid=[],invalid=[];
    for(let i=1;i<matrix.length;i++){
      const row=matrix[i]||[]; if(row.every(v=>clean(v)===''))continue;
      const customer=clean(row[mapping.customer]);
      const qty=Number(String(row[mapping.qty]??'').replace(/,/g,''));
      const product=matchProduct(row[mapping.product],products);
      const due=toLocalDateTime(row[mapping.due],shift);
      const priority=normalizePriority(mapping.priority>=0?row[mapping.priority]:'');
      const externalId=mapping.orderId>=0?clean(row[mapping.orderId]):'';
      const errors=[];
      if(!customer)errors.push('Customer is required.');
      if(product.error)errors.push(product.error);
      if(!Number.isFinite(qty)||qty<=0)errors.push('Quantity must be greater than zero.');
      if(!due)errors.push('Due date/time is invalid.');
      if(!priority)errors.push('Priority must be Standard, High, or Urgent.');
      if(externalId&&externalIds.has(norm(externalId)))errors.push(`Order/reference "${externalId}" already exists.`);
      const fp=[norm(customer),norm(product.name||row[mapping.product]),qty,clean(due)].join('|');
      if(!errors.length&&fingerprints.has(fp))errors.push('This customer/product/quantity/due combination is already loaded.');
      if(errors.length){invalid.push({row:i+1,values:row,errors});continue;}
      fingerprints.add(fp); if(externalId)externalIds.add(norm(externalId));
      valid.push({row:i+1,draft:{customer,productId:product.productId,productName:product.name,qty,due,priority,externalId}});
    }
    return {valid,invalid,total:valid.length+invalid.length};
  }

  const api={parseDelimited,autoMap,toLocalDateTime,matchProduct,normalizePriority,buildOrders};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BatchWattOrderImport=api;
})(typeof globalThis!=='undefined'?globalThis:this);
