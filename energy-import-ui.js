/* Energy spreadsheet intake UI. Depends on ExcelJS, BatchWattEnergyImport, and ops-app globals. */
'use strict';
(function(){
  let mode='interval',matrix=[],sourceLabel='';
  const intervalFields=[['time','Time'],['kw','Facility kW'],['rate','Tariff rate (optional)']];
  const settingsFields=[['baseKw','Base load kW'],['peakLimitKw','Peak target kW'],['monthlyPeakKw','Current monthly peak kW'],['rate','Off-peak rate'],['peakRate','Peak rate'],['peakStart','Peak start'],['peakEnd','Peak end'],['demandRate','Demand charge / kW'],['currency','Currency']];

  function fields(){return mode==='settings'?settingsFields:intervalFields;}
  function required(key){return mode==='interval'&&['time','kw'].includes(key);}

  function addButtons(){
    const energyPanel=document.getElementById('energy-settings')?.closest('.compact-panel');
    const head=energyPanel?.querySelector('.panel-head');
    if(head&&!document.getElementById('open-energy-import')){
      const b=document.createElement('button');b.id='open-energy-import';b.className='quiet';b.type='button';b.textContent='Import energy';head.appendChild(b);
    }
    const actions=document.querySelector('.pipeline-actions');
    if(actions&&!document.getElementById('open-energy-import-top')){
      const b=document.createElement('button');b.id='open-energy-import-top';b.className='quiet';b.type='button';b.textContent='Energy data';actions.appendChild(b);
    }
  }

  function addDialog(){
    if(document.getElementById('energy-import-dialog'))return;
    const dialog=document.createElement('dialog');dialog.id='energy-import-dialog';dialog.className='import-dialog energy-import-dialog';
    dialog.innerHTML=`<div class="import-shell">
      <div class="dialog-head"><div><p class="eyebrow">ENERGY INTAKE</p><h2>Import energy data</h2></div><button type="button" class="icon-button" id="close-energy-import" aria-label="Close">×</button></div>
      <p class="subtle">Load either a 15-minute baseline facility-load profile or tariff / peak settings. Data is validated before it enters the shared planning model.</p>
      <div class="energy-mode-switch" role="group" aria-label="Energy data type"><button type="button" class="active" data-energy-mode="interval">15-min load profile</button><button type="button" data-energy-mode="settings">Energy settings</button></div>
      <div class="energy-format-hint" id="energy-format-hint"></div>
      <div class="import-source-grid">
        <section class="import-source"><strong>Paste spreadsheet rows</strong><textarea id="energy-import-paste" rows="7"></textarea><button type="button" class="quiet" id="parse-energy-paste">Preview pasted rows</button></section>
        <section class="import-source"><strong>Upload spreadsheet</strong><label class="file-drop">Choose Excel or CSV<input id="energy-import-file" type="file" accept=".xlsx,.csv,.tsv,.txt"></label><small id="energy-import-file-name">No file selected</small></section>
      </div>
      <section id="energy-mapping-panel" class="import-stage" hidden>
        <div class="panel-head"><div><p class="eyebrow">FIELD MAPPING</p><h3>Confirm the energy columns</h3></div><span id="energy-source-label" class="subtle"></span></div>
        <div id="energy-mapping-grid" class="mapping-grid"></div>
      </section>
      <section id="energy-preview-panel" class="import-stage" hidden>
        <div class="panel-head"><div><p class="eyebrow">VALIDATION</p><h3>Preview before import</h3></div><strong id="energy-preview-summary"></strong></div>
        <div id="energy-preview-content"></div>
        <div class="import-actions"><span id="energy-import-note" class="subtle"></span><button type="button" class="primary" id="confirm-energy-import" disabled>Import energy data</button></div>
      </section>
    </div>`;
    document.body.appendChild(dialog);
  }

  function setHints(){
    const hint=document.getElementById('energy-format-hint'),paste=document.getElementById('energy-import-paste');
    if(!hint||!paste)return;
    if(mode==='interval'){
      hint.innerHTML='<strong>Expected:</strong> Time · Facility kW · optional Tariff rate. Use 15-minute timestamps. Facility kW should represent baseline/background load before BatchWatt adds scheduled line loads.';
      paste.placeholder='Time\tFacility kW\tTariff rate\n08:00\t24\t0.13\n08:15\t25\t0.13\n08:30\t27\t0.13';
    }else{
      hint.innerHTML='<strong>Expected:</strong> one row with settings such as Base kW, Peak target kW, Off-peak rate, Peak rate, Peak start/end and Demand charge.';
      paste.placeholder='Base kW\tPeak target kW\tMonthly peak kW\tOff-peak rate\tPeak rate\tPeak start\tPeak end\tDemand charge\tCurrency\n20\t80\t65\t0.13\t0.28\t16:00\t20:00\t15\tUSD';
    }
  }

  function optionList(headers,index){return `<option value="-1">Not mapped</option>${headers.map((h,i)=>`<option value="${i}" ${i===index?'selected':''}>${esc(h||`Column ${i+1}`)}</option>`).join('')}`;}
  function currentMapping(){const out={};fields().forEach(([key])=>{out[key]=Number(document.querySelector(`[data-energy-map="${key}"]`)?.value??-1);});return out;}

  function renderMapping(){
    if(!matrix.length)return;
    const headers=matrix[0].map((x,i)=>String(x||`Column ${i+1}`).trim());
    const guessed=BatchWattEnergyImport.autoMap(headers,mode);
    document.getElementById('energy-mapping-grid').innerHTML=fields().map(([key,label])=>`<label>${label}${required(key)?' *':''}<select data-energy-map="${key}">${optionList(headers,guessed[key])}</select></label>`).join('');
    document.getElementById('energy-mapping-panel').hidden=false;
    document.querySelectorAll('[data-energy-map]').forEach(s=>s.addEventListener('change',renderPreview));
    renderPreview();
  }

  function renderPreview(){
    if(!matrix.length)return;
    const panel=document.getElementById('energy-preview-panel'),summary=document.getElementById('energy-preview-summary'),content=document.getElementById('energy-preview-content'),confirm=document.getElementById('confirm-energy-import'),note=document.getElementById('energy-import-note');
    panel.hidden=false;
    if(mode==='interval'){
      const built=BatchWattEnergyImport.buildIntervalLoad(matrix,currentMapping(),{shift:input.shift});
      summary.textContent=`${built.valid.length} valid · ${built.invalid.length} rejected`;
      confirm.disabled=built.valid.length===0;
      const rows=[...built.valid.slice(0,12).map(x=>({ok:true,...x})),...built.invalid.slice(0,8).map(x=>({ok:false,...x}))];
      content.innerHTML=`<div class="energy-import-kpis"><div><span>Intervals</span><strong>${built.valid.length}</strong></div><div><span>Shift coverage</span><strong>${built.coverage}%</strong></div><div><span>Rejected</span><strong>${built.invalid.length}</strong></div></div><div class="table-wrap"><table><thead><tr><th>Row</th><th>Time</th><th>Facility kW</th><th>Rate</th><th>Result</th></tr></thead><tbody>${rows.map(x=>x.ok?`<tr><td>${x.row}</td><td>${esc(x.draft.time)}</td><td>${x.draft.kw}</td><td>${x.draft.rate==null?'—':x.draft.rate}</td><td class="status-good">Ready</td></tr>`:`<tr><td>${x.row}</td><td colspan="3">${esc((x.values||[]).join(' · '))}</td><td class="status-bad">${esc(x.errors.join(' '))}</td></tr>`).join('')}</tbody></table></div>`;
      note.textContent=built.coverage<100?`The shift has ${built.coverage}% interval coverage. Missing times fall back to the configured base load and tariff.`:'Full shift coverage. Missing tariff rates use the configured tariff window.';
      confirm.onclick=()=>commitInterval(built);
    }else{
      const built=BatchWattEnergyImport.buildSettings(matrix,currentMapping());
      summary.textContent=built.valid?'Settings valid':'Review settings';confirm.disabled=!built.valid;
      if(built.valid){
        content.innerHTML=`<div class="energy-settings-preview">${Object.entries(built.valid).map(([k,v])=>`<div><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('')}</div>`;
        note.textContent='Only mapped settings are updated; existing interval-load data is preserved.';
        confirm.onclick=()=>commitSettings(built.valid);
      }else{
        content.innerHTML=`<div class="status-bad energy-import-errors">${built.errors.map(e=>`<p>${esc(e)}</p>`).join('')}</div>`;note.textContent='Fix the mapping or source values before import.';
      }
    }
  }

  function commitInterval(built){
    input.energy.intervalLoad=built.valid.map(x=>{const r={time:x.draft.time,kw:x.draft.kw};if(x.draft.rate!=null)r.rate=x.draft.rate;return r;});
    input.energy.sources={...(input.energy.sources||{}),interval:{source:sourceLabel,loadedAt:new Date().toISOString(),intervals:built.valid.length,coverage:built.coverage}};
    workflow.release=null;recalc();document.getElementById('energy-import-dialog').close();goto('today');
    const save=document.getElementById('save-state');if(save)save.textContent=`Energy profile imported · ${built.valid.length} intervals · ${built.coverage}% shift coverage`;
  }

  function commitSettings(values){
    const intervalLoad=input.energy.intervalLoad,sources=input.energy.sources||{};
    input.energy={...input.energy,...values};
    if(intervalLoad)input.energy.intervalLoad=intervalLoad;
    input.energy.sources={...sources,settings:{source:sourceLabel,loadedAt:new Date().toISOString(),fields:Object.keys(values).length}};
    workflow.release=null;recalc();document.getElementById('energy-import-dialog').close();goto('today');
    const save=document.getElementById('save-state');if(save)save.textContent=`Energy settings imported · ${Object.keys(values).length} fields`;
  }

  function setMatrix(rows,label){
    matrix=(rows||[]).filter(r=>Array.isArray(r)&&r.some(v=>String(v??'').trim()!==''));sourceLabel=label;
    if(matrix.length<2){document.getElementById('energy-mapping-panel').hidden=true;document.getElementById('energy-preview-panel').hidden=true;fail('Energy import needs a header row and at least one data row.');return;}
    fail('');document.getElementById('energy-source-label').textContent=label;renderMapping();
  }

  function excelCellValue(value){
    if(value==null)return '';if(value instanceof Date)return value;if(typeof value!=='object')return value;
    if(Array.isArray(value.richText))return value.richText.map(x=>x.text||'').join('');
    if(Object.prototype.hasOwnProperty.call(value,'result'))return value.result;if(value.text!=null)return value.text;if(value.hyperlink)return value.text||value.hyperlink;return String(value);
  }

  async function readFile(file){
    document.getElementById('energy-import-file-name').textContent=file.name;const lower=file.name.toLowerCase();
    try{
      if(lower.endsWith('.csv')||lower.endsWith('.tsv')||lower.endsWith('.txt')){setMatrix(BatchWattEnergyImport.parseDelimited(await file.text()),file.name);return;}
      if(!lower.endsWith('.xlsx'))throw new Error('Use .xlsx, .csv, .tsv or pasted rows.');
      if(!window.ExcelJS)throw new Error('Excel reader is unavailable.');
      const book=new ExcelJS.Workbook();await book.xlsx.load(await file.arrayBuffer());
      let selected=null;
      for(const sheet of book.worksheets){
        const rows=[];sheet.eachRow({includeEmpty:false},row=>rows.push(row.values.slice(1).map(excelCellValue)));
        if(rows.length<2)continue;
        const detected=BatchWattEnergyImport.detectMode(rows[0]);
        if(detected===mode){selected={rows,label:`${file.name} · ${sheet.name}`};break;}
        if(!selected)selected={rows,label:`${file.name} · ${sheet.name}`};
      }
      if(!selected)throw new Error('The workbook has no usable worksheet.');
      setMatrix(selected.rows,selected.label);
    }catch(err){fail(`Could not read energy file: ${err.message}`);}
  }

  function openImport(){
    matrix=[];sourceLabel='';document.getElementById('energy-import-paste').value='';document.getElementById('energy-import-file').value='';document.getElementById('energy-import-file-name').textContent='No file selected';document.getElementById('energy-mapping-panel').hidden=true;document.getElementById('energy-preview-panel').hidden=true;fail('');setHints();document.getElementById('energy-import-dialog').showModal();
  }

  document.addEventListener('DOMContentLoaded',()=>{
    addButtons();addDialog();setHints();
    document.getElementById('open-energy-import')?.addEventListener('click',openImport);document.getElementById('open-energy-import-top')?.addEventListener('click',openImport);
    document.getElementById('close-energy-import').onclick=()=>document.getElementById('energy-import-dialog').close();
    document.querySelectorAll('[data-energy-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.energyMode;document.querySelectorAll('[data-energy-mode]').forEach(x=>x.classList.toggle('active',x===b));matrix=[];document.getElementById('energy-mapping-panel').hidden=true;document.getElementById('energy-preview-panel').hidden=true;setHints();}));
    document.getElementById('parse-energy-paste').onclick=()=>setMatrix(BatchWattEnergyImport.parseDelimited(document.getElementById('energy-import-paste').value),'Pasted rows');
    document.getElementById('energy-import-file').addEventListener('change',e=>{const file=e.target.files?.[0];if(file)readFile(file);});
  });
})();
