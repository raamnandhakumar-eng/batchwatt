/* Evidence-first shift analyst: derives insights only from the current BatchWatt plan. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BatchWattShiftAnalyst = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const n = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const round = value => Math.round((n(value) + Number.EPSILON) * 100) / 100;
  const priorityScore = { Urgent: 3, High: 2, Standard: 1 };
  const sortRisks = (a, b) => b.rank - a.rank || a.orderId.localeCompare(b.orderId);
  const amount = (value, currency) => {
    try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2 }).format(n(value)); }
    catch { return round(value) + ' ' + (currency || 'USD'); }
  };
  const format = value => n(value).toLocaleString('en-US', { maximumFractionDigits: 1 });
  const pct = value => (n(value) * 100).toFixed(1) + '%';

  function analyze(input, plan) {
    const orders = Array.isArray(input && input.orders) ? input.orders : [];
    const empty = {
      ready: false, factory: String(input && input.factory || 'Factory'), orders: orders.length,
      risks: [], actions: [], mix: [], quality: [], metrics: null, comparable: false,
      note: 'Generate a valid plan to analyze delivery, production, and energy exposure.'
    };
    if (!plan || !plan.baseline || !plan.proposed) return empty;

    const b = plan.baseline, p = plan.proposed;
    const holds = Array.isArray(plan.holds) ? plan.holds : [];
    const shift = input.shift || {};
    const energy = input.energy || {};
    const currency = energy.currency || 'USD';
    const baselineIds = (b.jobs || []).map(j => String(j.id)).sort();
    const proposedIds = (p.jobs || []).map(j => String(j.id)).sort();
    const comparable = JSON.stringify(baselineIds) === JSON.stringify(proposedIds);
    const allProducts = new Map((input.products || []).map(product => [product.id, product.name || product.id]));
    const mixMap = new Map();
    for (const order of orders) {
      const name = String(allProducts.get(order.productId) || 'Unknown product');
      mixMap.set(name, (mixMap.get(name) || 0) + 1);
    }
    const mix = [...mixMap].map(([name, count]) => ({
      name, count, share: orders.length ? count / orders.length : 0
    })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    const risks = [];
    const tracked = new Set();
    const addOrderRisk = (id, title, detail, priority, type) => {
      const orderId = String(id || '');
      const key = type + ':' + orderId;
      if (tracked.has(key)) return;
      tracked.add(key);
      const score = priorityScore[priority] || 1;
      risks.push({ orderId, title: String(title), detail: String(detail), priority: priority || 'Standard',
        type, level: score === 3 ? 'critical' : score === 2 ? 'high' : 'moderate',
        rank: (type === 'hold' ? 40 : 30) + score });
    };
    for (const h of holds) addOrderRisk(h.orderId, 'HOLD · ' + String(h.product || h.orderId),
      String(h.reason || h.reasonCode || 'Check schedule feasibility.'), h.priority, 'hold');
    for (const job of p.jobs || []) {
      if (n(job.lateMinutes) > 0) addOrderRisk(job.id,
        'Late · ' + String(job.product || job.id),
        format(job.lateMinutes) + ' minutes after the supplied due time. Check dispatch priority.',
        job.priority, 'late');
    }
    const heldIds = new Set(holds.map(h => String(h.orderId)));
    const jobIds = new Set((p.jobs || []).map(j => String(j.id)));
    const start = Number(String(shift.start || '00:00').slice(0, 2)) * 60 +
      Number(String(shift.start || '00:00').slice(3, 5));
    for (const a of plan.allocations || []) {
      if (!n(a.produce) && n(a.dueMinute) < start && !heldIds.has(String(a.id)) && !jobIds.has(String(a.id))) {
        addOrderRisk(a.id, 'Overdue stock dispatch · ' + String(a.product || a.id),
          'Finished stock covers this order, but its supplied due time precedes shift start.',
          a.priority, 'late');
      }
    }
    risks.sort(sortRisks);

    const peakLimit = n(energy.peakLimitKw);
    const peakBreach = peakLimit > 0 && n(p.peakKw) > peakLimit + 0.00001;
    const usageDelta = round(n(b.usageCost) - n(p.usageCost));
    const demandDelta = round(n(b.demandExposure) - n(p.demandExposure));
    const kwhDelta = round(n(b.kwh) - n(p.kwh));
    const peakDelta = round(n(b.peakKw) - n(p.peakKw));
    const shifted = n(plan.comparison && plan.comparison.shiftedJobs);
    const counted = input.inventoryCountedAt || '';
    const timeOfCount = counted ? new Date(counted).getTime() : NaN;
    const shiftTime = shift.date && shift.start ? new Date(shift.date + 'T' + shift.start).getTime() : NaN;
    const inventoryAge = Number.isFinite(timeOfCount) && Number.isFinite(shiftTime)
      ? (shiftTime - timeOfCount) / 3600000 : null;
    const intervalsUsed = n(plan.energyInput && plan.energyInput.intervalsUsed);
    const shiftIntervals = n(plan.energyInput && plan.energyInput.shiftIntervals);
    const quality = [];
    if (inventoryAge === null) quality.push({ status: 'unknown', text: 'No dated inventory count. Confirm current stock and packaging.' });
    else if (inventoryAge < 0) quality.push({ status: 'review', text: 'Inventory count is dated after shift start. Verify the date.' });
    else if (inventoryAge > 24) quality.push({ status: 'review', text: 'Inventory count is ' + Math.floor(inventoryAge) + ' hours older than shift start.' });
    else quality.push({ status: 'supplied', text: 'Inventory count timestamp supplied (' + Math.round(inventoryAge) + ' hours before shift).' });
    quality.push({ status: intervalsUsed === shiftIntervals && shiftIntervals ? 'imported' : intervalsUsed ? 'partial' : 'assumed',
      text: intervalsUsed + ' of ' + shiftIntervals + ' energy intervals use imported background load.' });
    quality.push({ status: 'assumed', text: 'Machine kW, tariff prices, and demand rate are supplied assumptions, not meter or bill verification.' });

    const actions = [];
    for (const risk of risks.slice(0, 4)) actions.push({
      severity: risk.level, title: risk.title, detail: risk.detail, source: 'Order ' + risk.orderId
    });
    if (peakBreach) actions.push({
      severity: 'high', title: 'Peak target exceeded',
      detail: format(p.peakKw) + ' kW planned vs ' + format(peakLimit) + ' kW target. Review feasible timing and lines.',
      source: 'Proposed 15-minute load model'
    });
    if (inventoryAge === null || inventoryAge < 0 || inventoryAge > 24) actions.push({
      severity: 'moderate', title: 'Verify stock freshness',
      detail: 'Confirm finished goods, raw materials and packaging before releasing the shift.',
      source: 'Inventory count timestamp'
    });
    if (intervalsUsed < shiftIntervals && shiftIntervals) actions.push({
      severity: 'moderate', title: 'Improve energy input coverage',
      detail: 'Import background-load intervals to replace fallback estimates for the uncovered shift.',
      source: 'Energy input coverage'
    });
    if (!risks.length && !peakBreach) actions.push({
      severity: 'good', title: 'Review and release',
      detail: 'No holds, supplied-due-time lateness, or peak target breach detected. Supervisor approval remains necessary.',
      source: 'Current modeled shift plan'
    });

    const onTime = Math.max(0, orders.length - new Set(risks.filter(r => r.type === 'hold' || r.type === 'late').map(r => r.orderId)).size);
    return {
      ready: true, factory: String(input.factory || plan.factory || 'Factory'),
      orders: orders.length, shift: String(shift.date || ''),
      risks, actions, quality, mix, comparable, currency,
      metrics: {
        holds: holds.length, lateOrders: n(p.lateOrders) + n(p.overdueStockOrders),
        atRiskOrders: new Set(risks.map(r => r.orderId)).size,
        onTime, shifted, baselinePeak: round(b.peakKw), proposedPeak: round(p.peakKw),
        peakLimit, peakDelta, peakBreach, baselineKwh: round(b.kwh), proposedKwh: round(p.kwh),
        kwhDelta, baselineUsage: round(b.usageCost), proposedUsage: round(p.usageCost),
        usageDelta, baselineDemand: round(b.demandExposure), proposedDemand: round(p.demandExposure),
        demandDelta, intervalsUsed, shiftIntervals
      },
      note: 'Current modeled plan only. Baseline is earliest-feasible. No actual production or utility-bill savings are verified.'
    };
  }

  function answer(analysis, question) {
    const q = String(question || '').trim().toLowerCase();
    if (!analysis.ready) return { title: 'Generate a plan first', body: analysis.note };
    const m = analysis.metrics, cost = v => amount(v, analysis.currency);
    const top = analysis.risks.slice(0, 3).map(r => r.title + ' (' + r.orderId + '): ' + r.detail).join(' ');
    if (/hold|blocked|risk|late|dispatch|urgent|shortage/.test(q)) {
      return { title: 'Delivery risk',
        body: m.atRiskOrders + ' of ' + analysis.orders + ' orders are flagged, including ' +
          m.holds + ' HOLDs and ' + m.lateOrders + ' late or overdue orders. ' +
          (top || 'No order-specific scheduling risks are flagged.') };
    }
    if (/cost|sav|money|bill|tariff|price|dollar|financial/.test(q)) {
      return { title: 'Modeled cost comparison',
        body: 'Electricity usage cost: ' + cost(m.baselineUsage) + ' baseline vs ' +
          cost(m.proposedUsage) + ' proposed (difference ' + cost(m.usageDelta) + '). ' +
          'Conditional monthly demand-charge exposure: ' + cost(m.baselineDemand) + ' vs ' +
          cost(m.proposedDemand) + ' (difference ' + cost(m.demandDelta) + '). ' +
          (analysis.comparable ? 'The two plans schedule the same production-order set.' :
            'The scheduled order sets differ; do not call these differences efficiency savings.') +
          ' Demand exposure is conditional on the final billing-month peak, not a daily saving.' };
    }
    if (/peak|energy|power|kw|kwh|electric|load|carbon/.test(q)) {
      return { title: 'Energy and peak exposure',
        body: 'Peak: ' + format(m.baselinePeak) + ' → ' + format(m.proposedPeak) +
          ' kW; configured target ' + format(m.peakLimit) + ' kW. ' +
          'Modeled consumption: ' + format(m.baselineKwh) + ' → ' + format(m.proposedKwh) +
          ' kWh. ' + (m.peakBreach ? 'The proposed shift exceeds the peak target. ' : '') +
          'Moving a job to another time alone does not reduce kWh. Different production lines or changeovers can change modeled kWh.' };
    }
    if (/mix|product|portfolio|concentrat|sku|exposure/.test(q)) {
      return { title: 'Order portfolio',
        body: 'Order-count mix: ' + (analysis.mix.slice(0, 5).map(x =>
          x.name + ' ' + x.count + ' orders (' + pct(x.share) + ')').join('; ') || 'No products') +
          '. These are order shares, not comparable product quantities or revenue weights.' };
    }
    if (/trust|confiden|data|input|accur|source|quality/.test(q)) {
      return { title: 'Data confidence',
        body: analysis.quality.map(x => x.text).join(' ') +
          ' Outputs are modeled from supplied settings and records; this is not a live meter or independently verified result.' };
    }
    if (/production|schedule|run|shift|due|delivery|plan/.test(q)) {
      return { title: 'Production position',
        body: analysis.orders + ' supplied orders, ' + m.holds + ' held, ' +
          m.lateOrders + ' late or overdue, and ' + m.shifted +
          ' runs shifted relative to earliest-feasible baseline. ' +
          (top || 'No listed production holds or lateness.') };
    }
    return { title: 'Recommended next steps',
      body: analysis.actions.slice(0, 4).map((a, i) => (i + 1) + '. ' + a.title + ': ' + a.detail).join(' ') +
        ' Supervisor review is required before release.' };
  }

  return { analyze, answer, amount, format };
});
