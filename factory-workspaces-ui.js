/* Multiple operating workspaces per factory: UI controls. */
'use strict';
(function(){
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function stats(ws){const s=ws?.state||{};return `${s.orders?.length||0} orders · ${s.energy?.intervalLoad?.length||0} energy intervals · ${s.shift?.date||'No date'}`;}
  function mountTop(){
    const right=document.querySelector('.appbar-right');if(!right||document.getElementById('bw-workspace-switcher'))return;
    const factory=document.getElementById('factory-profile-switcher');const wrap=document.createElement('div');wrap.id='bw-workspace-switcher';wrap.className='bw-workspace-switcher';
    wrap.innerHTML='<span>WORKSPACE</span><select id="bw-workspace-select" aria-label="Active workspace"></select><button id="bw-workspace-new" class="quiet" type="button" title="New workspace">+</button>';
    if(factory)factory.insertAdjacentElement('afterend',wrap);else right.prepend(wrap);
    wrap.querySelector('select').addEventListener('change',e=>window.BatchWattWorkspaces?.load(e.target.value));
    wrap.querySelector('button').addEventListener('click',openDialog);
  }
  function mountPanel(){
    const more=document.getElementById('more');if(!more||document.getElementById('bw-workspaces-panel'))return;
    const anchor=document.getElementById('factory-profile-panel')||more.querySelector('.page-head');const panel=document.createElement('section');panel.id='bw-workspaces-panel';panel.className='panel compact-panel bw-workspaces-panel';
    panel.innerHTML='<div class="panel-head"><div><p class="eyebrow">WORKSPACES</p><h2>Plans and scenarios for this factory</h2><p class="subtle">Each workspace keeps separate orders, interval energy, inventory state and plan while using the same factory profile.</p></div><button id="bw-workspace-new-setup" class="primary" type="button">+ Workspace</button></div><div id="bw-workspace-list" class="bw-workspace-list"></div>';
    if(anchor)anchor.insertAdjacentElement('afterend',panel);else more.prepend(panel);
    panel.querySelector('#bw-workspace-new-setup').addEventListener('click',openDialog);panel.addEventListener('click',handleAction);
  }
  function mountDialog(){
    if(document.getElementById('bw-workspace-dialog'))return;
    const d=document.createElement('dialog');d.id='bw-workspace-dialog';d.innerHTML='<form id="bw-workspace-form"><div class="dialog-head"><h2>Create workspace</h2><button type="button" class="icon-button" id="bw-workspace-close" aria-label="Close">×</button></div><label>Workspace name<input id="bw-workspace-name" required placeholder="Tomorrow plan or Scenario A"></label><label>Shift date<input id="bw-workspace-date" type="date" required></label><fieldset class="bw-workspace-mode"><legend>Start from</legend><label><input type="radio" name="bw-workspace-mode" value="fresh" checked> Fresh workspace from factory profile</label><label><input type="radio" name="bw-workspace-mode" value="duplicate"> Duplicate current workspace</label></fieldset><button class="primary big" type="submit">Create workspace</button></form>';
    document.body.appendChild(d);d.querySelector('#bw-workspace-close').onclick=()=>d.close();d.querySelector('form').addEventListener('submit',e=>{e.preventDefault();const name=document.getElementById('bw-workspace-name').value.trim(),date=document.getElementById('bw-workspace-date').value,mode=document.querySelector('input[name="bw-workspace-mode"]:checked')?.value||'fresh';if(name&&date){window.BatchWattWorkspaces?.create(name,date,mode);d.close();}});
  }
  function openDialog(){
    mountDialog();const d=document.getElementById('bw-workspace-dialog');if(!d)return;const date=input?.shift?.date||localDate();document.getElementById('bw-workspace-name').value=`Plan · ${date}`;document.getElementById('bw-workspace-date').value=date;d.showModal();document.getElementById('bw-workspace-name').focus();
  }
  function handleAction(e){
    const b=e.target.closest('[data-ws-action]');if(!b)return;const id=b.dataset.workspaceId,action=b.dataset.wsAction;if(action==='open')window.BatchWattWorkspaces?.load(id);if(action==='rename'){const current=window.BatchWattWorkspaces?.list().find(w=>w.id===id);const name=current?prompt('Workspace name',current.name):'';if(name?.trim())window.BatchWattWorkspaces?.rename(id,name);}if(action==='duplicate')window.BatchWattWorkspaces?.duplicate(id);if(action==='delete'){const current=window.BatchWattWorkspaces?.list().find(w=>w.id===id);if(current&&confirm(`Delete workspace “${current.name}”?`)){const ok=window.BatchWattWorkspaces?.remove(id);if(ok===false)fail('Each factory needs at least one workspace.');}}
  }
  function render(){
    mountTop();mountPanel();mountDialog();const api=window.BatchWattWorkspaces;if(!api)return;const list=api.list(),active=api.activeId();const select=document.getElementById('bw-workspace-select');if(select){select.innerHTML=list.map(w=>`<option value="${esc(w.id)}" ${w.id===active?'selected':''}>${esc(w.name)}</option>`).join('');select.value=active;}
    const box=document.getElementById('bw-workspace-list');if(box)box.innerHTML=list.map(w=>`<article class="bw-workspace-row ${w.id===active?'active':''}"><div><span>${w.id===active?'ACTIVE WORKSPACE':'WORKSPACE'}</span><strong>${esc(w.name)}</strong><small>${esc(stats(w))}</small></div><div class="bw-workspace-actions"><button class="quiet" type="button" data-ws-action="open" data-workspace-id="${esc(w.id)}">Open</button><button class="quiet" type="button" data-ws-action="rename" data-workspace-id="${esc(w.id)}">Rename</button><button class="quiet" type="button" data-ws-action="duplicate" data-workspace-id="${esc(w.id)}">Duplicate</button><button class="quiet danger-lite" type="button" data-ws-action="delete" data-workspace-id="${esc(w.id)}" ${list.length<=1?'disabled':''}>Delete</button></div></article>`).join('');
  }
  window.BatchWattWorkspaceUI={render};document.addEventListener('DOMContentLoaded',()=>setTimeout(render,0));window.addEventListener('hashchange',render);
})();