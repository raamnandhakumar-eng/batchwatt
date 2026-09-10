/* Visible energy controls for the BatchWatt Today screen. */
'use strict';
(function(){
  const fields = [
    ['baseKw','Background load','kW'],
    ['peakLimitKw','Peak target','kW'],
    ['monthlyPeakKw','Month peak so far','kW'],
    ['rate','Off-peak rate','$/kWh'],
    ['peakRate','Peak rate','$/kWh'],
    ['demandRate','Demand charge','$/kW']
  ];

  function mount(){
    if($('today-energy-card')) return;
    const next = $('next-action');
    if(!next) return;
    const card = document.createElement('section');
    card.id = 'today-energy-card';
    card.className = 'panel today-energy-card';
    card.innerHTML = `
      <div class="energy-head">
        <div>
          <p class="eyebrow">ENERGY CONTROL</p>
          <h2>Power and tariff inputs</h2>
          <p class="subtle">Keep the production plan inside your peak target and tariff window.</p>
        </div>
        <span id="today-energy-status" class="status-pill neutral">Waiting for plan</span>
      </div>
      <div id="today-energy-output" class="today-energy-output"></div>
      <div id="today-energy-inputs" class="today-energy-inputs"></div>
      <details class="energy-window">
        <summary>Peak tariff window</summary>
        <div class="today-energy-inputs two-inputs">
          <label>Peak starts<input data-energy="peakStart" type="time" step="900"></label>
          <label>Peak ends<input data-energy="peakEnd" type="time" step="900"></label>
        </div>
      </details>`;
    next.insertAdjacentElement('afterend', card);
  }

  function renderInputs(){
    const box = $('today-energy-inputs');
    if(!box || !input?.energy) return;
    box.innerHTML = fields.map(([key,label,unit]) => `
      <label>${label}<span>${unit}</span><input data-energy="${key}" type="number" min="0" step="any" value="${esc(input.energy[key])}"></label>`).join('');
    const start = document.querySelector('#today-energy-card [data-energy="peakStart"]');
    const end = document.querySelector('#today-energy-card [data-energy="peakEnd"]');
    if(start) start.value = input.energy.peakStart || '';
    if(end) end.value = input.energy.peakEnd || '';
  }

  function renderOutput(){
    const out = $('today-energy-output');
    const status = $('today-energy-status');
    if(!out || !status) return;
    if(!result){
      out.innerHTML = `
        <div><span>Planned peak</span><strong>—</strong></div>
        <div><span>Peak headroom</span><strong>—</strong></div>
        <div><span>Shift energy</span><strong>—</strong></div>
        <div><span>Energy cost</span><strong>—</strong></div>`;
      status.textContent = (input?.orders||[]).length ? 'Needs valid plan' : 'Add orders';
      status.className = 'status-pill neutral';
      return;
    }
    const peak = Number(result.proposed.peakKw || 0);
    const target = Number(input.energy.peakLimitKw || 0);
    const headroom = Math.round((target - peak) * 100) / 100;
    const within = headroom >= 0;
    out.innerHTML = `
      <div><span>Planned peak</span><strong>${peak} kW</strong></div>
      <div><span>Peak headroom</span><strong>${headroom >= 0 ? '+' : ''}${headroom} kW</strong></div>
      <div><span>Shift energy</span><strong>${result.proposed.kwh} kWh</strong></div>
      <div><span>Energy cost</span><strong>${money(result.proposed.usageCost)}</strong></div>`;
    status.textContent = within ? 'Within peak target' : 'Above peak target';
    status.className = 'status-pill ' + (within ? 'good' : 'bad');
  }

  function render(){
    mount();
    renderInputs();
    renderOutput();
  }

  const originalRecalc = recalc;
  recalc = function(){
    const value = originalRecalc.apply(this, arguments);
    render();
    return value;
  };

  document.addEventListener('DOMContentLoaded', render);
})();
