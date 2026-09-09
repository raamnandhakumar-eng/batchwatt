(function (root) {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const money = (value, currency) => {
    try { return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value); }
    catch { return `${currency} ${Number(value).toFixed(0)}`; }
  };
  function loadChart(result) {
    const width = 1040, height = 370, left = 60, right = 1010, top = 72, bottom = 302;
    const profiles = [result.baseline.profile, result.proposed.profile];
    const max = Math.max(1, Number(result.energy.peakLimitKw), Number(result.energy.monthlyPeakKw), ...profiles.flat().map(s => s.kw)) * 1.15;
    const count = profiles[0].length;
    const x = i => left + i / count * (right - left);
    const y = kw => bottom - kw / max * (bottom - top);
    const parts = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="load-title load-desc">`,
      `<title id="load-title">${escape(result.factory)}: baseline and proposed electrical load</title>`,
      `<desc id="load-desc">Estimated fifteen-minute load. Baseline peak ${result.baseline.peakKw} kW. Proposed peak ${result.proposed.peakKw} kW. Peak target ${result.energy.peakLimitKw} kW. Values are modeled, not measured.</desc>`,
      `<rect width="${width}" height="${height}" fill="#ffffff"/><g font-family="system-ui, sans-serif" font-size="13" fill="#526275">`,
      `<text x="${left}" y="28" font-size="19" font-weight="700" fill="#142b34">${escape(result.factory)} · ${escape(result.shift.date)}</text>`,
      `<text x="${left}" y="49">Estimated load (kW) · baseline vs energy-aware plan · 15-minute intervals</text>`];
    profiles[0].forEach((slot,i) => {
      if (slot.rate === Number(result.energy.peakRate) && Number(result.energy.peakRate) !== Number(result.energy.rate)) parts.push(`<rect x="${x(i)}" y="${top}" width="${(right-left)/count}" height="${bottom-top}" fill="#fff5df"/>`);
    });
    for (let i = 0; i <= 4; i++) {
      const value = max * i / 4;
      parts.push(`<line x1="${left}" x2="${right}" y1="${y(value)}" y2="${y(value)}" stroke="#e7edef"/><text x="${left - 10}" y="${y(value)+4}" text-anchor="end">${value.toFixed(0)}</text>`);
    }
    [[Number(result.energy.peakLimitKw),'#ba612d','Peak target'],[Number(result.energy.monthlyPeakKw),'#776bbb','Month peak so far']].forEach(([value,color,label],i) => {
      parts.push(`<line x1="${left}" x2="${right}" y1="${y(value)}" y2="${y(value)}" stroke="${color}" stroke-dasharray="5 5"/><text x="${right}" y="${y(value)-5}" text-anchor="end" fill="${color}">${label} ${value} kW</text>`);
    });
    profiles.forEach((profile,p) => {
      const points = profile.map((slot,i) => `${x(i)},${y(slot.kw)} ${x(i+1)},${y(slot.kw)}`).join(' ');
      parts.push(`<polyline points="${points}" fill="none" stroke="${p ? '#087c68' : '#a0aab4'}" stroke-width="${p ? 3 : 2}" ${p ? '' : 'stroke-dasharray="6 3"'}/>`);
    });
    const step = Math.max(1, Math.ceil(count / 8));
    profiles[0].forEach((slot,i) => { if (i % step === 0) parts.push(`<text x="${x(i)}" y="${bottom+24}">${slot.time}</text>`); });
    parts.push(`<text x="${right}" y="${bottom+24}" text-anchor="end">${escape(result.shift.end)}</text><text x="${left}" y="357">Green: proposed · Gray: baseline · Shaded: peak tariff window · Model assumptions apply</text></g></svg>`);
    return parts.join('');
  }
  function dispatchRows(result) {
    return result.allocations.map(order => {
      const job = result.proposed.jobs.find(j => j.id === order.id);
      const baseline = result.baseline.jobs.find(j => j.id === order.id);
      const blocked = result.proposed.unscheduled.find(j => j.id === order.id);
      return { ...order, start: job?.startTime || '', end: job?.endTime || '', baselineStart: baseline?.startTime || '',
        line: job?.line || '', kwh: job?.kwh || 0,
        status: blocked ? 'Blocked' : !order.produce ? (order.dueMinute < result.proposed.profile[0].minute ? 'Overdue stock dispatch' : 'Ready from stock') : job?.lateMinutes ? 'Late' : 'Scheduled',
        reason: blocked?.reason || (!order.produce ? 'Dispatch from reserved finished stock.' : `${job.startTime}–${job.endTime} on ${job.line}. ${job.lateMinutes ? `${job.lateMinutes} minutes after due time.` : 'Finishes before due time.'}`) };
    });
  }
  function csv(result) {
    const cell = value => {
      let text = String(value ?? '');
      if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
      return `"${text.replace(/"/g, '""')}"`;
    };
    const rows = [['Order','Customer','Product','Unit','Ordered','Reserved stock','Produce','Packaging shortage','Due','Baseline start','Proposed start','Proposed end','Line','Modeled kWh','Status','Action']];
    dispatchRows(result).forEach(o => rows.push([o.id,o.customer,o.product,o.unit,o.qty,o.fromStock,o.produce,o.packagingShort,o.due,o.baselineStart,o.start,o.end,o.line,o.kwh,o.status,o.reason]));
    return '\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n');
  }
  function message(result) {
    const rows = dispatchRows(result);
    return [`BATCHWATT | ${result.factory} | ${result.shift.date}`, 'DRAFT • SUPERVISOR APPROVAL REQUIRED', '',
      `Estimated peak: ${result.baseline.peakKw} → ${result.proposed.peakKw} kW. Target: ${result.energy.peakLimitKw} kW.`,
      `Shift energy-cost change: ${money(-result.comparison.usageSaving,result.energy.currency)} (proposed minus baseline).`,
      `Conditional monthly demand saving: ${money(result.comparison.conditionalDemandSaving,result.energy.currency)}. Only if these schedules determine the final monthly peak.`, '',
      ...rows.map((o,i) => `${i+1}. ${o.product} for ${o.customer || 'customer'}: ${o.fromStock} from stock; ${o.produce} ${o.unit} to produce. ${o.reason}`), '',
      ...result.warnings.map(w => `REVIEW: ${w}`),
      'Confirm raw materials, packaging, equipment dependencies and dispatch availability before release.',
      'Load and tariff calculations are modeled estimates, not meter-verified savings.'
    ].join('\n');
  }
  const api = { escape, money, loadChart, dispatchRows, csv, message };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BatchWattReports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
