/* BatchWatt bulk order intake UI. Depends on ExcelJS, BatchWattOrderImport, and ops-app globals. */
'use strict';
(function(){
  let matrix=[];
  const fields=[['customer','Customer'],['product','Product'],['qty','Quantity'],['due','Due date/time'],['priority','Priority'],['orderId','Order/reference']];
  const required=new Set(['customer','product','qty','due']);

  function addImportButtons(){
    const header=$('open-order');
    if(header&&!$('open-import')){
      const b=document.createElement('button');b.id='open-import';b.className='quiet';b.textContent='Import orders';header.before(b);
    }
    const page=$('open-order-2');
    if(page&&!$('open-import-2')){
      const b=document.createElement('button');b.id='open-import-2';b.className='quiet';b.textContent='Import Excel / paste';page.before(b);
    }
  }

  function addDialog(){
    if($('order-import-dialog'))return;
    const dialog=document.createElement('dialog');dialog.id='order-import-dialog';dialog.className='import-dialog';
    dialog.innerHTML=`<div class="import-shell">
      <div class="dialog-head"><div><p class="eyebrow">ORDER INTAKE</p><h2>Import customer orders</h2></div><button type="button" class="icon-button" id="close-import" aria-label="Close">×</button></div>
      <p class="subtle">Paste rows copied from Excel or upload .xlsx, .csv, or .tsv. BatchWatt validates every row before it changes the live plan.</p>
      <div class="import-source-grid">
        <section class="import-source"><strong>Paste from Excel or WhatsApp</strong><textarea id="import-paste" rows="7" placeholder="Customer\tProduct\tQuantity\tDue\tPriority\nRavi Stores\tCow ghee 1 L\t40\t9/10/2026 3:00 PM\tHigh"></textarea><button type="button" class="quiet" id="parse-paste">Preview pasted rows</button></section>
        <section class="import-source"><strong>Upload spreadsheet</strong><label class="file-drop">Choose Excel or CSV<input id="import-file" type="file" accept=".xlsx,.csv,.tsv,.txt"></label><small id="import-file-name">No file selected</small></section>
      </div>
      <section id="mapping-panel" class="import-stage" hidden>
        <div class="panel-head"><div><p class="eyebrow">COLUMN MAPPING</p><h3>Confirm what each column means</h3></div><span id="import-source-label" class="subtle"></span></div>
        <div id="mapping-grid" class="mapping-grid"></div>
      </section>
      <section id="preview-panel" class="import-stage" hidden>
        <div class="panel-head"><div><p class="eyebrow">VALIDATION</p><h3>Preview before import</h3></div><strong id="preview-summary"></strong></div>
        <div class="table-wrap"><table><thead><tr><th>Row</th><th>Customer</th><th>Product</th><th>Qty</th><th>Due</th><th>Priority</th><th>Result</th></tr></thead><tbody id="preview-table"></tbody></table></div>
        <div class="import-actions"><span id="import-note" class="subtle">Invalid rows are skipped.</span><button type="button" class="primary" id="confirm-import" disabled>Import valid orders</button></div>
      </section>
    </div>`;
    document.body.appendChild(dialog);
  }

  function optionList(headers,index){
    return `<option value="-1">Not mapped</option>${headers.map((h,i)=>`<option value="${i}" ${i===index?'selected':''}>${esc(h||`Column ${i+1}`)}</option>`).join('')}`;
  }

  function currentMapping(){
    const out={};fields.forEach(([key])=>{out[key]=Number(document.querySelector(`[data-map="${key}"]`)?.value??-1);});return out;
  }

  function renderMapping(){
    if(!matrix.length)return;
    const headers=matrix[0].map((x,i)=>String(x||`Column ${i+1}`).trim());
    const guessed=BatchWattOrderImport.autoMap(headers);
    $('mapping-grid').innerHTML=fields.map(([key,label])=>`<label>${label}${required.has(key)?' *':''}<select data-map="${key}">${optionList(headers,guessed[key])}</select></label>`).join('');
    $('mapping-panel').hidden=false;
    document.querySelectorAll('[data-map]').forEach(s=>s.addEventListener('change',renderPreview));
    renderPreview();
  }

  function renderPreview(){
    if(!matrix.length)return;
    const built=BatchWattOrderImport.buildOrders(matrix,currentMapping(),{products:input.products,existingOrders:input.orders,shift:input.shift});
    $('preview-panel').hidden=false;
    $('preview-summary').textContent=`${built.valid.length} valid · ${built.invalid.length} rejected`;
    $('confirm-import').disabled=built.valid.length===0;
    const byRow=new Map([...built.valid.map(x=>[x.row,{ok:true,...x}]),...built.invalid.map(x=>[x.row,{ok:false,...x}])]);
    $('preview-table').innerHTML=[...byRow.values()].slice(0,50).map(x=>{
      if(x.ok){const d=x.draft;return `<tr><td>${x.row}</td><td>${esc(d.customer)}</td><td>${esc(d.productName)}</td><td>${d.qty}</td><td>${esc(d.due.replace('T',' '))}</td><td>${esc(d.priority)}</td><td class="status-good">Ready</td></tr>`;}
      const row=x.values||[],m=currentMapping();return `<tr><td>${x.row}</td><td>${esc(row[m.customer]||'')}</td><td>${esc(row[m.product]||'')}</td><td>${esc(row[m.qty]||'')}</td><td>${esc(row[m.due]||'')}</td><td>${esc(m.priority>=0?row[m.priority]||'Standard':'Standard')}</td><td class="status-bad">${esc(x.errors.join(' '))}</td></tr>`;
    }).join('');
    $('import-note').textContent=built.total>50?`Showing first 50 of ${built.total} rows. Invalid rows will be skipped.`:'Invalid rows will be skipped.';
    $('confirm-import').onclick=()=>commitImport(built);
  }

  function setMatrix(rows,label){
    matrix=(rows||[]).filter(r=>Array.isArray(r)&&r.some(v=>String(v??'').trim()!==''));
    if(matrix.length<2){$('mapping-panel').hidden=true;$('preview-panel').hidden=true;fail('Order import needs a header row and at least one data row.');return;}
    fail('');$('import-source-label').textContent=label;renderMapping();
  }

  function safeExternalId(value){
    const cleanId=String(value||'').trim().replace(/[^A-Za-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'');
    if(!cleanId)return uid('ORD');
    const candidate=/^ORD[-_]/i.test(cleanId)?cleanId:`ORD-${cleanId}`;
    return input.orders.some(o=>o.id===candidate)?uid('ORD'):candidate;
  }

  function commitImport(built){
    const imported=built.valid.map(x=>{const d=x.draft;return {id:safeExternalId(d.externalId),customer:d.customer,productId:d.productId,qty:d.qty,due:d.due,priority:d.priority,externalId:d.externalId||''};});
    input.orders.push(...imported);workflow.release=null;recalc();
    $('order-import-dialog').close();goto('today');
    $('save-state').textContent=`${imported.length} order${imported.length===1?'':'s'} imported${built.invalid.length?` · ${built.invalid.length} row${built.invalid.length===1?'':'s'} skipped`:''}`;
  }

  function openImport(){
    $('import-paste').value='';$('import-file').value='';$('import-file-name').textContent='No file selected';matrix=[];$('mapping-panel').hidden=true;$('preview-panel').hidden=true;fail('');$('order-import-dialog').showModal();
  }

  function excelCellValue(value){
    if(value==null)return '';
    if(value instanceof Date)return value;
    if(typeof value!=='object')return value;
    if(Array.isArray(value.richText))return value.richText.map(x=>x.text||'').join('');
    if(Object.prototype.hasOwnProperty.call(value,'result'))return value.result;
    if(value.text!=null)return value.text;
    if(value.hyperlink)return value.text||value.hyperlink;
    return String(value);
  }

  async function readFile(file){
    $('import-file-name').textContent=file.name;
    const lower=file.name.toLowerCase();
    try{
      if(lower.endsWith('.csv')||lower.endsWith('.tsv')||lower.endsWith('.txt')){setMatrix(BatchWattOrderImport.parseDelimited(await file.text()),file.name);return;}
      if(!lower.endsWith('.xlsx'))throw new Error('Use .xlsx, .csv, or pasted rows.');
      if(!window.ExcelJS)throw new Error('Excel reader is unavailable.');
      const book=new ExcelJS.Workbook();await book.xlsx.load(await file.arrayBuffer());
      const sheet=book.worksheets[0];if(!sheet)throw new Error('The workbook has no worksheets.');
      const rows=[];sheet.eachRow({includeEmpty:false},row=>rows.push(row.values.slice(1).map(excelCellValue)));
      setMatrix(rows,`${file.name} · ${sheet.name}`);
    }catch(err){fail(`Could not read order file: ${err.message}`);}
  }

  document.addEventListener('DOMContentLoaded',()=>{
    addImportButtons();addDialog();
    $('open-import').onclick=openImport;$('open-import-2').onclick=openImport;$('close-import').onclick=()=>$('order-import-dialog').close();
    $('parse-paste').onclick=()=>setMatrix(BatchWattOrderImport.parseDelimited($('import-paste').value),'Pasted rows');
    $('import-file').addEventListener('change',e=>{const file=e.target.files?.[0];if(file)readFile(file);});
  });
})();
