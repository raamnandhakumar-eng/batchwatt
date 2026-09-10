/* One planning engine shared by the browser and Vercel API. No external services. */
(function (root) {
  'use strict';
  const procurement = typeof module !== 'undefined' && module.exports ? require('./procurement') : root.BatchWattProcurement;
  const SLOT_MINUTES = 15;
  const round = n => Math.round((n + Number.EPSILON) * 100) / 100;
  const timeMinutes = text => {
    if (!/^\d{2}:\d{2}$/.test(String(text))) return NaN;
    const [h, m] = text.split(':').map(Number);
    return h < 24 && m < 60 ? h * 60 + m : NaN;
  };
  const clock = minutes => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  function numeric(value, label, min = 0, positive = false) {
    const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
    if (value == null || value === '' || !Number.isFinite(n) || n < min || (positive && n === 0)) throw new Error(`${label} must be ${positive ? 'greater than' : 'at least'} ${min}.`);
    return n;
  }
  function validate(input) {
    if (!input || typeof input !== 'object') throw new Error('Supply factory planning data.');
    const { orders, products, lines, energy, shift } = input;
    if (!Array.isArray(orders) || !orders.length) throw new Error('Add at least one order.');
    if (orders.length > 150 || products?.length > 150 || lines?.length > 20) throw new Error('Use up to 150 orders/products and 20 lines per plan.');
    if (!Array.isArray(products) || !products.length || !Array.isArray(lines) || !lines.length) throw new Error('Add products and production lines.');
    const start = timeMinutes(shift?.start), end = timeMinutes(shift?.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || start % 15 || end % 15) throw new Error('Use a same-day shift in 15-minute increments, with end after start.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(shift.date) || new Date(`${shift.date}T12:00:00Z`).toISOString().slice(0, 10) !== shift.date) throw new Error('Supply a valid planning date.');
    const ids = (rows, label) => {
      if (rows.some(r => !r.id || typeof r.id !== 'string') || new Set(rows.map(r => r.id)).size !== rows.length) throw new Error(`${label} need unique, non-empty IDs.`);
    };
    ids(lines, 'Lines'); ids(products, 'Products'); ids(orders, 'Orders');
    lines.forEach(l => {
      if (!String(l.name || '').trim()) throw new Error('Each line needs a name.');
      numeric(l.kw, `${l.name} power`, 0, true);
      numeric(l.changeoverMinutes, `${l.name} changeover`);
    });
    products.forEach(p => {
      if (!String(p.name || '').trim()) throw new Error('Each product needs a name.');
      if (!lines.some(l => l.id === p.lineId)) throw new Error(`${p.name}: choose an existing line.`);
      numeric(p.rate, `${p.name} units/hour`, 0, true);
      numeric(p.stock, `${p.name} finished stock`);
      numeric(p.packaging, `${p.name} packaging stock`);
    });
    orders.forEach(o => {
      if (!products.some(p => p.id === o.productId)) throw new Error(`Order ${o.id}: choose an existing product.`);
      numeric(o.qty, `Order ${o.id} quantity`, 0, true);
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(o.due) || !Number.isFinite(timeMinutes(o.due.slice(11))) || new Date(o.due.slice(0, 10) + 'T12:00:00Z').toISOString().slice(0, 10) !== o.due.slice(0, 10)) throw new Error(`Order ${o.id}: supply a valid due date and time.`);
      if (!['Standard', 'High', 'Urgent'].includes(o.priority)) throw new Error(`Order ${o.id}: choose Standard, High or Urgent.`);
    });
    ['baseKw', 'peakLimitKw', 'monthlyPeakKw', 'rate', 'peakRate', 'demandRate'].forEach(key => numeric(energy?.[key], `Energy ${key}`));
    if (!energy.peakLimitKw) throw new Error('Peak demand target must be greater than zero.');
    if (!Number.isFinite(timeMinutes(energy.peakStart)) || !Number.isFinite(timeMinutes(energy.peakEnd))) throw new Error('Supply valid peak tariff window times.');
    if (typeof energy.currency !== 'string' || !/^[A-Z]{3}$/.test(energy.currency)) throw new Error('Use a three-letter currency code.');
    return { start, end };
  }

  function inWindow(minute, start, end) {
    return start === end ? false : start < end ? minute >= start && minute < end : minute >= start || minute < end;
  }
  function createEnergyPlan(input) {
    const { start, end } = validate(input);
    const { energy, shift } = input;
    const products = new Map(input.products.map(p => [p.id, { ...p, stock: Number(p.stock), packaging: Number(p.packaging), rate: Number(p.rate) }]));
    const lines = new Map(input.lines.map(l => [l.id, { ...l, kw: Number(l.kw), changeoverMinutes: Number(l.changeoverMinutes) }]));
    const urgency = { Urgent: 0, High: 1, Standard: 2 };
    const ordered = [...input.orders].sort((a, b) => a.due.localeCompare(b.due) || urgency[a.priority] - urgency[b.priority] || a.id.localeCompare(b.id));
    const dateDay = text => Date.parse(`${text}T00:00:00Z`) / 86400000;
    const allocations = ordered.map(o => {
      const p = products.get(o.productId);
      const qty = Number(o.qty), covered = Math.min(qty, p.stock);
      p.stock -= covered;
      const produce = qty - covered, reserved = Math.min(produce, p.packaging);
      p.packaging -= reserved;
      return { ...o, qty, product: p.name, unit: p.unit || 'units', lineId: p.lineId,
        dueMinute: (dateDay(o.due.slice(0, 10)) - dateDay(shift.date)) * 1440 + timeMinutes(o.due.slice(11)),
        fromStock: round(covered), produce: round(produce), packagingReserved: round(reserved), packagingShort: round(produce - reserved),
        durationSlots: Math.ceil(produce / p.rate * 4 - 1e-9) };
    });
    const materialPlan = procurement.planMaterials(input, allocations);
    allocations.forEach(order => { const material = materialPlan.byOrder.get(order.id); order.materialShortages = material.shortages; order.recipeMissing = material.recipeMissing; });
    const slots = Array.from({ length: (end - start) / SLOT_MINUTES }, (_, i) => {
      const minute = start + i * SLOT_MINUTES;
      return { minute, time: clock(minute), rate: Number(inWindow(minute, timeMinutes(energy.peakStart), timeMinutes(energy.peakEnd)) ? energy.peakRate : energy.rate) };
    });
    function schedule(mode) {
      const profile = slots.map(s => ({ ...s, kw: Number(energy.baseKw), jobs: [] }));
      const available = new Map([...lines.keys()].map(id => [id, 0]));
      const lastProduct = new Map();
      const jobs = [], unscheduled = [];
      for (const order of allocations) {
        if (!order.produce) continue;
        if (order.packagingShort > 0) { unscheduled.push({ ...order, reason: `Short ${order.packagingShort} packaging units. Replenish before scheduling.` }); continue; }
        if (order.materialShortages.length) { unscheduled.push({ ...order, reason: 'Material shortage: ' + order.materialShortages.map(m => `${m.name} ${m.shortage} ${m.unit}`).join(', ') + '. Receive stock before scheduling.' }); continue; }
        if (order.recipeMissing) { unscheduled.push({ ...order, reason: 'Add a material recipe for this product before production can be scheduled.' }); continue; }
        const line = lines.get(order.lineId);
        const changeover = lastProduct.has(line.id) && lastProduct.get(line.id) !== order.productId ? Math.ceil(line.changeoverMinutes / 15) : 0;
        const duration = order.durationSlots + changeover;
        const earliest = available.get(line.id);
        let best = null;
        const oldPeak = Math.max(Number(energy.monthlyPeakKw), ...profile.map(s => s.kw));
        // Keep enough line time for later orders; a cheaper slot must not drop work.
        const position = allocations.indexOf(order);
        const later = allocations.slice(position + 1).filter(o => o.lineId === line.id && o.produce > 0 && !o.packagingShort && !o.materialShortages.length && !o.recipeMissing);
        let previous = order.productId;
        const reservedSlots = later.reduce((sum, o) => { const setup = previous !== o.productId ? Math.ceil(line.changeoverMinutes / 15) : 0; previous = o.productId; return sum + o.durationSlots + setup; }, 0);
        const latest = Math.max(earliest, profile.length - duration - reservedSlots);
        for (let from = earliest; from + duration <= profile.length; from++) {
          if (mode === 'energy' && from > latest) break;
          const finish = start + (from + duration) * 15;
          const late = Math.max(0, finish - order.dueMinute);
          const window = profile.slice(from, from + duration);
          const peak = Math.max(oldPeak, ...window.map(s => s.kw + line.kw));
          const exceed = Math.max(0, ...window.map(s => s.kw + line.kw - Number(energy.peakLimitKw)));
          const cost = window.reduce((sum, s) => sum + line.kw * .25 * s.rate, 0) + (peak - oldPeak) * Number(energy.demandRate);
          // Decision order: protect delivery, respect the peak target, then choose the lowest modeled energy+demand cost.
          const score = mode === 'baseline' ? [from] : [late, exceed, cost, from];
          const better = !best || score.some((value, i) => value < best.score[i] - 1e-8 && score.slice(0, i).every((v, j) => Math.abs(v - best.score[j]) < 1e-8));
          if (better) best = { from, duration, finish, late, score, changeover };
          if (mode === 'baseline') break;
        }
        if (!best) { unscheduled.push({ ...order, reason: 'Insufficient line time in this shift. Extend the shift or move this order.' }); continue; }
        for (let i = best.from; i < best.from + duration; i++) { profile[i].kw += line.kw; profile[i].jobs.push(order.id); }
        available.set(line.id, best.from + duration); lastProduct.set(line.id, order.productId);
        jobs.push({ ...order, line: line.name, start: start + best.from * 15, end: best.finish,
          startTime: clock(start + best.from * 15), endTime: clock(best.finish), lateMinutes: best.late,
          changeoverMinutes: best.changeover * 15, kwh: round(duration * .25 * line.kw), kw: line.kw });
      }
      const peakKw = Math.max(Number(energy.baseKw), ...profile.map(s => s.kw));
      const kwh = profile.reduce((sum, s) => sum + s.kw * .25, 0);
      const usageCost = profile.reduce((sum, s) => sum + s.kw * .25 * s.rate, 0);
      const demandExposure = Math.max(0, peakKw - Number(energy.monthlyPeakKw)) * Number(energy.demandRate);
      return { jobs, unscheduled, profile: profile.map(s => ({ ...s, kw: round(s.kw) })), peakKw: round(peakKw), kwh: round(kwh),
        usageCost: round(usageCost), demandExposure: round(demandExposure),
        lateOrders: jobs.filter(j => j.lateMinutes > 0).length,
        overdueStockOrders: allocations.filter(o => !o.produce && o.dueMinute < start).length,
        overloadSlots: profile.filter(s => s.kw > Number(energy.peakLimitKw) + 1e-8).length };
    }
    const baseline = schedule('baseline');
    const candidate = schedule('energy');
    // Do not claim savings by dropping work or worsening delivery performance.
    const sameWork = baseline.jobs.map(j => j.id).sort().join('|') === candidate.jobs.map(j => j.id).sort().join('|');
    const baselineLateness = new Map(baseline.jobs.map(j => [j.id, j.lateMinutes]));
    const protectsDispatch = sameWork && candidate.jobs.every(j => j.lateMinutes <= baselineLateness.get(j.id));
    const noWorseBill = candidate.usageCost + candidate.demandExposure <= baseline.usageCost + baseline.demandExposure + .01;
    const useCandidate = protectsDispatch && noWorseBill;
    const proposed = useCandidate ? candidate : baseline;
    const warnings = [];
    if (!useCandidate) warnings.push('No energy improvement met the dispatch and cost checks. The original schedule is retained.');
    if (proposed.unscheduled.length) warnings.push(`${proposed.unscheduled.length} order(s) need materials, recipes, packaging or more shift capacity.`);
    if (proposed.lateOrders || proposed.overdueStockOrders) warnings.push(`${proposed.lateOrders + proposed.overdueStockOrders} order(s) are late against the supplied due times.`);
    if (proposed.overloadSlots) warnings.push(`Peak target exceeded in ${proposed.overloadSlots} fifteen-minute interval(s). Review equipment sequencing or the target.`);

    const jobUsageCost = (schedule, job) => round(schedule.profile
      .filter(s => s.minute >= job.start && s.minute < job.end)
      .reduce((sum, s) => sum + Number(job.kw) * .25 * Number(s.rate), 0));
    const decisions = proposed.jobs.map(job => {
      const base = baseline.jobs.find(b => b.id === job.id);
      const baselineUsageCost = base ? jobUsageCost(baseline, base) : null;
      const proposedUsageCost = jobUsageCost(proposed, job);
      const shiftedMinutes = base ? job.start - base.start : 0;
      let reason = 'Kept at the earliest feasible time to protect delivery and line capacity.';
      if (shiftedMinutes !== 0 && baselineUsageCost != null && proposedUsageCost < baselineUsageCost - .01) reason = 'Shifted to a lower-tariff production window without worsening the supplied due time.';
      else if (shiftedMinutes !== 0 && baseline.peakKw > proposed.peakKw) reason = 'Staggered to reduce peak-demand exposure without worsening the supplied due time.';
      else if (job.changeoverMinutes > 0) reason = 'Sequenced after the prior line job with changeover time included in the operating plan.';
      return {
        orderId: job.id, customer: job.customer, product: job.product, quantity: job.produce, unit: job.unit,
        line: job.line, due: job.due, priority: job.priority,
        recommendedStart: job.startTime, recommendedEnd: job.endTime,
        baselineStart: base?.startTime || null, baselineEnd: base?.endTime || null,
        shiftedMinutes, changeoverMinutes: job.changeoverMinutes,
        baselineUsageCost, proposedUsageCost,
        modeledUsageSaving: baselineUsageCost == null ? null : round(baselineUsageCost - proposedUsageCost),
        reason
      };
    });

    return { schemaVersion: '2.1', generatedAt: new Date().toISOString(), factory: input.factory || 'My factory', shift, energy,
      allocations, baseline, proposed, decisions, warnings,
      procurement: { requirements: materialPlan.requirements, totalEstimatedPurchaseCost: materialPlan.totalEstimatedPurchaseCost },
      comparison: { peakReductionKw: round(baseline.peakKw - proposed.peakKw),
        peakReductionPct: baseline.peakKw ? round((baseline.peakKw - proposed.peakKw) / baseline.peakKw * 100) : 0,
        usageSaving: round(baseline.usageCost - proposed.usageCost),
        conditionalDemandSaving: round(baseline.demandExposure - proposed.demandExposure),
        totalModeledOperatingSaving: round((baseline.usageCost + baseline.demandExposure) - (proposed.usageCost + proposed.demandExposure)),
        shiftedJobs: proposed.jobs.filter(j => baseline.jobs.find(b => b.id === j.id)?.start !== j.start).length },
      objective: ['Protect supplied order due times', 'Avoid peak-demand target breaches', 'Minimize modeled electricity and conditional demand-charge cost', 'Use finished stock before scheduling new production', 'Keep material shortages and replenishment cost visible', 'Include line changeover time in the schedule'],
      assumptions: ['15-minute constant-load model, including base load during the shift. Short runs and changeovers round up to a full interval.',
        'One production line per product, one order at a time per line. Changeover runs at the line power rating.',
        'Tariff model uses off-peak/peak energy prices and a linear monthly demand rate. Ratchets, minimum billed demand, taxes and power-factor penalties are excluded.',
        'Demand savings are conditional on these schedules setting the final monthly peak. Do not multiply them by working days.',
        'Shifting machine timing does not itself reduce kWh. Validate load and rates against meter and tariff data.',
        'Material recipes and stock are checked; machine dependencies and detailed process constraints require supervisor review. This is a scheduling heuristic, not a guaranteed optimum.'] };
  }
  const api = { createEnergyPlan, timeMinutes, clock };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BatchWattEnergy = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
