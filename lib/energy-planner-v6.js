/* BatchWatt V6 planning engine: multi-line, whole-shift beam search, structured HOLD reasons. */
(function (root) {
  'use strict';
  const procurement = typeof module !== 'undefined' && module.exports ? require('./procurement') : root.BatchWattProcurement;
  const SLOT_MINUTES = 15;
  const round = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  const priorityWeight = { Urgent: 100, High: 10, Standard: 1 };
  const holdPenalty = { Urgent: 10000, High: 1000, Standard: 100 };

  const timeMinutes = text => {
    if (!/^\d{2}:\d{2}$/.test(String(text))) return NaN;
    const [h, m] = String(text).split(':').map(Number);
    return h < 24 && m < 60 ? h * 60 + m : NaN;
  };
  const clock = minutes => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  const dateDay = text => Date.parse(`${text}T00:00:00Z`) / 86400000;
  const addDays = (date, days) => {
    const d = new Date(`${date}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + Number(days || 0));
    return d.toISOString().slice(0, 10);
  };
  function numeric(value, label, min = 0, positive = false) {
    const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
    if (value == null || value === '' || !Number.isFinite(n) || n < min || (positive && n === 0)) {
      throw new Error(`${label} must be ${positive ? 'greater than' : 'at least'} ${min}.`);
    }
    return n;
  }
  const lexLess = (a, b) => {
    if (!b) return true;
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const x = Number(a[i] || 0), y = Number(b[i] || 0);
      if (x < y - 1e-8) return true;
      if (x > y + 1e-8) return false;
    }
    return false;
  };
  const lexLE = (a, b) => !lexLess(b, a);

  function lineOptions(product) {
    if (Array.isArray(product.lineOptions) && product.lineOptions.length) {
      return product.lineOptions.map(x => ({ lineId: x.lineId, rate: Number(x.rate ?? product.rate) }));
    }
    if (Array.isArray(product.lineIds) && product.lineIds.length) {
      return product.lineIds.map(lineId => ({ lineId, rate: Number(product.rate) }));
    }
    return [{ lineId: product.lineId, rate: Number(product.rate) }];
  }

  function validate(input) {
    if (!input || typeof input !== 'object') throw new Error('Supply factory planning data.');
    const { orders, products, lines, energy, shift } = input;
    if (!Array.isArray(orders) || !orders.length) throw new Error('Add at least one order.');
    if (orders.length > 150 || products?.length > 150 || lines?.length > 20) throw new Error('Use up to 150 orders/products and 20 lines per plan.');
    if (!Array.isArray(products) || !products.length || !Array.isArray(lines) || !lines.length) throw new Error('Add products and production lines.');

    const start = timeMinutes(shift?.start), end = timeMinutes(shift?.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || start % SLOT_MINUTES || end % SLOT_MINUTES) {
      throw new Error('Use a same-day shift in 15-minute increments, with end after start.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(shift?.date || '') || new Date(`${shift.date}T12:00:00Z`).toISOString().slice(0, 10) !== shift.date) {
      throw new Error('Supply a valid planning date.');
    }

    const ids = (rows, label) => {
      if (rows.some(r => !r.id || typeof r.id !== 'string') || new Set(rows.map(r => r.id)).size !== rows.length) {
        throw new Error(`${label} need unique, non-empty IDs.`);
      }
    };
    ids(lines, 'Lines'); ids(products, 'Products'); ids(orders, 'Orders');
    const lineIds = new Set(lines.map(l => l.id));
    const productIds = new Set(products.map(p => p.id));

    lines.forEach(l => {
      if (!String(l.name || '').trim()) throw new Error('Each line needs a name.');
      numeric(l.kw, `${l.name} power`, 0, true);
      numeric(l.changeoverMinutes ?? 0, `${l.name} changeover`);
      if (l.changeoverKw != null) numeric(l.changeoverKw, `${l.name} changeover power`);
      if (l.downtime != null) {
        if (!Array.isArray(l.downtime)) throw new Error(`${l.name} downtime must be a list.`);
        l.downtime.forEach((d, i) => {
          const s = timeMinutes(d?.start), e = timeMinutes(d?.end);
          if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s || s % SLOT_MINUTES || e % SLOT_MINUTES) {
            throw new Error(`${l.name} downtime ${i + 1}: use aligned start/end times inside the day.`);
          }
        });
      }
    });

    products.forEach(p => {
      if (!String(p.name || '').trim()) throw new Error('Each product needs a name.');
      numeric(p.rate, `${p.name} units/hour`, 0, true);
      numeric(p.stock, `${p.name} finished stock`);
      numeric(p.packaging, `${p.name} packaging stock`);
      const opts = lineOptions(p);
      if (!opts.length || opts.some(x => !lineIds.has(x.lineId))) throw new Error(`${p.name}: choose existing eligible production lines.`);
      opts.forEach(x => numeric(x.rate, `${p.name} rate on ${x.lineId}`, 0, true));
    });

    lines.forEach(l => {
      if (l.changeovers != null) {
        if (!Array.isArray(l.changeovers)) throw new Error(`${l.name} changeovers must be a list.`);
        const seen = new Set();
        l.changeovers.forEach((c, i) => {
          if (!productIds.has(c.fromProductId) || !productIds.has(c.toProductId)) throw new Error(`${l.name} changeover ${i + 1}: use existing products.`);
          numeric(c.minutes, `${l.name} changeover minutes`);
          if (c.kw != null) numeric(c.kw, `${l.name} changeover kW`);
          const key = `${c.fromProductId}>${c.toProductId}`;
          if (seen.has(key)) throw new Error(`${l.name}: duplicate changeover ${key}.`);
          seen.add(key);
        });
      }
    });

    orders.forEach(o => {
      if (!productIds.has(o.productId)) throw new Error(`Order ${o.id}: choose an existing product.`);
      numeric(o.qty, `Order ${o.id} quantity`, 0, true);
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(o.due || '') || !Number.isFinite(timeMinutes(o.due.slice(11))) ||
          new Date(o.due.slice(0, 10) + 'T12:00:00Z').toISOString().slice(0, 10) !== o.due.slice(0, 10)) {
        throw new Error(`Order ${o.id}: supply a valid due date and time.`);
      }
      if (!['Standard', 'High', 'Urgent'].includes(o.priority)) throw new Error(`Order ${o.id}: choose Standard, High or Urgent.`);
    });

    ['baseKw', 'peakLimitKw', 'monthlyPeakKw', 'rate', 'peakRate', 'demandRate'].forEach(key => numeric(energy?.[key], `Energy ${key}`));
    if (!energy.peakLimitKw) throw new Error('Peak demand target must be greater than zero.');
    if (!Number.isFinite(timeMinutes(energy.peakStart)) || !Number.isFinite(timeMinutes(energy.peakEnd))) throw new Error('Supply valid peak tariff window times.');
    if (typeof energy.currency !== 'string' || !/^[A-Z]{3}$/.test(energy.currency)) throw new Error('Use a three-letter currency code.');
    if (energy.intervalLoadBasis != null && !['background', 'total'].includes(energy.intervalLoadBasis)) {
      throw new Error('Energy intervalLoadBasis must be background or total.');
    }
    if (energy.intervalLoadBasis === 'total' && Array.isArray(energy.intervalLoad) && energy.intervalLoad.length) {
      throw new Error('Total meter load cannot be safely combined with scheduled machine kW. Upload background/baseline load or set intervalLoadBasis to background after decomposing controllable production load.');
    }
    if (energy.intervalLoad != null) {
      if (!Array.isArray(energy.intervalLoad)) throw new Error('Energy interval load must be an array.');
      const seen = new Set();
      energy.intervalLoad.forEach((row, i) => {
        const minute = timeMinutes(row?.time);
        if (!Number.isFinite(minute) || minute % SLOT_MINUTES) throw new Error(`Energy interval ${i + 1}: use a valid 15-minute time.`);
        numeric(row?.kw, `Energy interval ${row.time} facility kW`);
        if (row?.rate != null && row.rate !== '') numeric(row.rate, `Energy interval ${row.time} rate`);
        if (seen.has(row.time)) throw new Error(`Energy interval ${row.time} is duplicated.`);
        seen.add(row.time);
      });
    }
    return { start, end };
  }

  function inWindow(minute, start, end) {
    return start === end ? false : start < end ? minute >= start && minute < end : minute >= start || minute < end;
  }
  function changeover(line, fromProductId, toProductId) {
    if (!fromProductId || fromProductId === toProductId) return { minutes: 0, slots: 0, kw: 0 };
    const row = (line.changeovers || []).find(c => c.fromProductId === fromProductId && c.toProductId === toProductId);
    const minutes = Number(row?.minutes ?? line.changeoverMinutes ?? 0);
    return { minutes, slots: Math.ceil(minutes / SLOT_MINUTES), kw: Number(row?.kw ?? line.changeoverKw ?? line.kw) };
  }
  function downtimeSet(line, shiftStart, slotCount) {
    const set = new Set();
    for (const d of line.downtime || []) {
      const a = Math.max(0, Math.floor((timeMinutes(d.start) - shiftStart) / SLOT_MINUTES));
      const b = Math.min(slotCount, Math.ceil((timeMinutes(d.end) - shiftStart) / SLOT_MINUTES));
      for (let i = a; i < b; i++) if (i >= 0) set.add(i);
    }
    return set;
  }
  function earliestMaterialDate(input, shortages) {
    let gate = input.shift.date;
    for (const s of shortages || []) {
      const material = (input.materials || []).find(m => m.id === s.materialId);
      if (!material) continue;
      let incomingDate = null, cumulative = 0;
      const incoming = (input.purchaseOrders || [])
        .filter(po => po.materialId === s.materialId && ['Ordered', 'Part received'].includes(po.status))
        .map(po => ({ date: po.expectedDate, qty: Number(po.qty) - Number(po.receivedQty || 0) }))
        .sort((a, b) => a.date.localeCompare(b.date));
      for (const po of incoming) {
        cumulative += po.qty;
        if (cumulative + 1e-9 >= Number(s.shortage)) { incomingDate = po.date; break; }
      }
      const supplier = (input.suppliers || []).find(x => x.id === material.supplierId);
      const replenishmentDate = supplier ? addDays(input.shift.date, Number(supplier.leadDays || 0)) : null;
      const earliest = [incomingDate, replenishmentDate].filter(Boolean).sort()[0] || null;
      if (!earliest) return null;
      if (earliest > gate) gate = earliest;
    }
    return gate;
  }

  function createEnergyPlan(input) {
    const { start, end } = validate(input);
    const { energy, shift } = input;
    const products = new Map(input.products.map(p => [p.id, { ...p, stock: Number(p.stock), packaging: Number(p.packaging), lineOptions: lineOptions(p) }]));
    const lines = new Map(input.lines.map(l => [l.id, { ...l, kw: Number(l.kw), changeoverMinutes: Number(l.changeoverMinutes || 0) }]));
    const urgency = { Urgent: 0, High: 1, Standard: 2 };
    const ordered = [...input.orders].sort((a, b) => a.due.localeCompare(b.due) || urgency[a.priority] - urgency[b.priority] || a.id.localeCompare(b.id));

    const allocations = ordered.map(o => {
      const p = products.get(o.productId);
      const qty = Number(o.qty), covered = Math.min(qty, p.stock);
      p.stock -= covered;
      const produce = qty - covered, reserved = Math.min(produce, p.packaging);
      p.packaging -= reserved;
      return {
        ...o, qty, product: p.name, unit: p.unit || 'units', lineId: p.lineId, lineOptions: p.lineOptions,
        dueMinute: (dateDay(o.due.slice(0, 10)) - dateDay(shift.date)) * 1440 + timeMinutes(o.due.slice(11)),
        fromStock: round(covered), produce: round(produce), packagingReserved: round(reserved), packagingShort: round(produce - reserved)
      };
    });

    const materialPlan = procurement.planMaterials(input, allocations);
    allocations.forEach(order => {
      const material = materialPlan.byOrder.get(order.id);
      order.materialShortages = material.shortages;
      order.recipeMissing = material.recipeMissing;
      if (order.materialShortages.length) order.earliestMaterialDate = earliestMaterialDate(input, order.materialShortages);
    });

    const importedIntervals = new Map((energy.intervalLoad || []).map(row => [String(row.time), row]));
    const slots = Array.from({ length: (end - start) / SLOT_MINUTES }, (_, i) => {
      const minute = start + i * SLOT_MINUTES, time = clock(minute), imported = importedIntervals.get(time);
      const tariffRate = Number(inWindow(minute, timeMinutes(energy.peakStart), timeMinutes(energy.peakEnd)) ? energy.peakRate : energy.rate);
      return {
        minute, time,
        baseKw: imported ? Number(imported.kw) : Number(energy.baseKw),
        rate: imported && imported.rate != null && imported.rate !== '' ? Number(imported.rate) : tariffRate,
        energySource: imported ? 'interval-import' : 'settings'
      };
    });
    const downtime = new Map([...lines.values()].map(l => [l.id, downtimeSet(l, start, slots.length)]));

    function preHold(order) {
      if (!order.produce) return null;
      if (order.packagingShort > 0) return {
        ...order, action: 'HOLD', reasonCode: 'PACKAGING',
        reason: `Short ${order.packagingShort} packaging units. Replenish before scheduling.`
      };
      if (order.materialShortages.length) {
        const eta = order.earliestMaterialDate ? ` Earliest modeled replenishment date: ${order.earliestMaterialDate}.` : '';
        return {
          ...order, action: 'HOLD', reasonCode: 'MATERIAL', earliestFeasibleDate: order.earliestMaterialDate || null,
          reason: 'Material shortage: ' + order.materialShortages.map(m => `${m.name} ${m.shortage} ${m.unit}`).join(', ') + `.${eta}`
        };
      }
      if (order.recipeMissing) return {
        ...order, action: 'HOLD', reasonCode: 'DATA',
        reason: 'Add a material recipe for this product before production can be scheduled.'
      };
      return null;
    }

    const fixedHolds = allocations.map(preHold).filter(Boolean);
    const schedulable = allocations.filter(o => o.produce > 0 && !preHold(o));

    function optionPlacement(order, lineOption, state, firstOnly = false) {
      const line = lines.get(lineOption.lineId);
      if (!line) return [];
      const co = changeover(line, state.lastProduct[line.id], order.productId);
      const runSlots = Math.ceil(Number(order.produce) / Number(lineOption.rate) * 4 - 1e-9);
      const totalSlots = co.slots + runSlots;
      const earliest = Number(state.available[line.id] || 0);
      const rows = [];
      for (let from = earliest; from + totalSlots <= slots.length; from++) {
        let blocked = false;
        for (let i = from; i < from + totalSlots; i++) if (downtime.get(line.id).has(i)) { blocked = true; break; }
        if (blocked) continue;
        const nextKw = state.kw.slice();
        for (let i = from; i < from + co.slots; i++) nextKw[i] += co.kw;
        for (let i = from + co.slots; i < from + totalSlots; i++) nextKw[i] += line.kw;
        const finish = start + (from + totalSlots) * SLOT_MINUTES;
        const late = Math.max(0, finish - order.dueMinute);
        const peak = Math.max(...nextKw);
        const exceed = Math.max(0, peak - Number(energy.peakLimitKw));
        const overloadSlots = nextKw.filter(x => x > Number(energy.peakLimitKw) + 1e-8).length;
        const usageCost = nextKw.reduce((sum, kw, i) => sum + kw * .25 * slots[i].rate, 0);
        const demandExposure = Math.max(0, peak - Number(energy.monthlyPeakKw)) * Number(energy.demandRate);
        const placement = {
          orderId: order.id, productId: order.productId, lineId: line.id, line: line.name, rate: Number(lineOption.rate),
          from, totalSlots, runSlots, setupSlots: co.slots, changeoverMinutes: co.minutes, changeoverKw: co.kw,
          start: start + from * SLOT_MINUTES, end: finish, startTime: clock(start + from * SLOT_MINUTES), endTime: clock(finish),
          productionStart: start + (from + co.slots) * SLOT_MINUTES, productionStartTime: clock(start + (from + co.slots) * SLOT_MINUTES),
          lateMinutes: late, kw: line.kw,
          kwh: round(co.slots * .25 * co.kw + runSlots * .25 * line.kw),
          localScore: [late * priorityWeight[order.priority], late, exceed, overloadSlots, usageCost + demandExposure, co.minutes, from],
          nextKw
        };
        rows.push(placement);
        if (firstOnly) break;
      }
      rows.sort((a, b) => lexLess(a.localScore, b.localScore) ? -1 : lexLess(b.localScore, a.localScore) ? 1 : 0);
      return rows;
    }

    function baselineSchedule() {
      const state = { available: Object.fromEntries([...lines.keys()].map(id => [id, 0])), lastProduct: {}, kw: slots.map(s => Number(s.baseKw)) };
      const placements = [], unscheduled = [...fixedHolds];
      for (const order of schedulable) {
        let best = null;
        for (const opt of order.lineOptions) {
          const rows = optionPlacement(order, opt, state, true);
          const p = rows[0];
          if (!p) continue;
          const score = [p.end, p.start, p.localScore[4]];
          if (!best || lexLess(score, best.score)) best = { p, score };
        }
        if (!best) {
          unscheduled.push({ ...order, action: 'HOLD', reasonCode: 'CAPACITY', reason: 'Insufficient eligible-line capacity in this shift. Extend the shift, change line availability, or move the order.' });
          continue;
        }
        const p = best.p;
        state.available[p.lineId] = p.from + p.totalSlots;
        state.lastProduct[p.lineId] = order.productId;
        state.kw = p.nextKw;
        placements.push(p);
      }
      return finalize(placements, unscheduled);
    }

    function stateScore(state) {
      const peak = Math.max(...state.kw);
      const exceed = Math.max(0, peak - Number(energy.peakLimitKw));
      const overload = state.kw.filter(x => x > Number(energy.peakLimitKw) + 1e-8).length;
      const usageCost = state.kw.reduce((sum, kw, i) => sum + kw * .25 * slots[i].rate, 0);
      const demandExposure = Math.max(0, peak - Number(energy.monthlyPeakKw)) * Number(energy.demandRate);
      return [
        state.heldCount, state.heldPenalty, state.weightedLate, state.totalLate,
        exceed, overload, usageCost + demandExposure, state.changeoverMinutes, state.completionSum
      ];
    }

    function candidateSchedule() {
      if (!schedulable.length) return finalize([], [...fixedHolds]);
      const large = schedulable.length > 30;
      const beamWidth = schedulable.length <= 10 ? 240 : (large ? 24 : 80), frontierSize = schedulable.length <= 10 ? 5 : (large ? 3 : 5), startChoices = schedulable.length <= 10 ? 4 : (large ? 2 : 3);
      let beam = [{
        remaining: schedulable.map(o => o.id),
        available: Object.fromEntries([...lines.keys()].map(id => [id, 0])),
        lastProduct: {}, kw: slots.map(s => Number(s.baseKw)), placements: [], capacityHolds: [],
        heldCount: 0, heldPenalty: 0, weightedLate: 0, totalLate: 0, changeoverMinutes: 0, completionSum: 0
      }];
      const byId = new Map(schedulable.map(o => [o.id, o]));

      for (let depth = 0; depth < schedulable.length; depth++) {
        const expanded = [];
        for (const state of beam) {
          const remainingOrders = state.remaining.map(id => byId.get(id)).filter(Boolean)
            .sort((a, b) => a.dueMinute - b.dueMinute || (priorityWeight[b.priority] - priorityWeight[a.priority]) || a.id.localeCompare(b.id));
          const frontier = remainingOrders.slice(0, frontierSize);
          for (const order of frontier) {
            const candidates = [];
            for (const opt of order.lineOptions) candidates.push(...optionPlacement(order, opt, state, false).slice(0, startChoices));
            for (const p of candidates) {
              const next = {
                ...state,
                remaining: state.remaining.filter(id => id !== order.id),
                available: { ...state.available, [p.lineId]: p.from + p.totalSlots },
                lastProduct: { ...state.lastProduct, [p.lineId]: order.productId },
                kw: p.nextKw,
                placements: [...state.placements, p],
                capacityHolds: state.capacityHolds.slice(),
                weightedLate: state.weightedLate + p.lateMinutes * priorityWeight[order.priority],
                totalLate: state.totalLate + p.lateMinutes,
                changeoverMinutes: state.changeoverMinutes + p.changeoverMinutes,
                completionSum: state.completionSum + p.end
              };
              expanded.push(next);
            }
            expanded.push({
              ...state,
              remaining: state.remaining.filter(id => id !== order.id),
              placements: state.placements.slice(),
              capacityHolds: [...state.capacityHolds, {
                ...order, action: 'HOLD', reasonCode: 'CAPACITY',
                reason: 'Held by whole-shift capacity optimization because all loaded production could not fit on eligible lines.'
              }],
              heldCount: state.heldCount + 1,
              heldPenalty: state.heldPenalty + holdPenalty[order.priority]
            });
          }
        }
        expanded.sort((a, b) => {
          const sa = stateScore(a), sb = stateScore(b);
          return lexLess(sa, sb) ? -1 : lexLess(sb, sa) ? 1 : 0;
        });
        beam = expanded.slice(0, beamWidth);
        if (!beam.length) break;
      }
      const best = beam[0];
      return best ? finalize(best.placements, [...fixedHolds, ...best.capacityHolds]) : baselineSchedule();
    }

    function finalize(placements, unscheduled) {
      const profile = slots.map((s, i) => ({ ...s, kw: Number(s.baseKw), jobs: [] }));
      const jobs = [];
      for (const p of placements) {
        const order = allocations.find(o => o.id === p.orderId);
        for (let i = p.from; i < p.from + p.setupSlots; i++) {
          profile[i].kw += p.changeoverKw;
          profile[i].jobs.push(order.id);
        }
        for (let i = p.from + p.setupSlots; i < p.from + p.totalSlots; i++) {
          profile[i].kw += p.kw;
          profile[i].jobs.push(order.id);
        }
        jobs.push({
          ...order, lineId: p.lineId, line: p.line, productionRate: p.rate,
          start: p.start, end: p.end, startTime: p.startTime, endTime: p.endTime,
          productionStart: p.productionStart, productionStartTime: p.productionStartTime,
          lateMinutes: p.lateMinutes, changeoverMinutes: p.changeoverMinutes, kwh: p.kwh, kw: p.kw
        });
      }
      jobs.sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
      const peakKw = Math.max(...profile.map(s => s.kw));
      const kwh = profile.reduce((sum, s) => sum + s.kw * .25, 0);
      const usageCost = profile.reduce((sum, s) => sum + s.kw * .25 * s.rate, 0);
      const demandExposure = Math.max(0, peakKw - Number(energy.monthlyPeakKw)) * Number(energy.demandRate);
      const weightedLateMinutes = jobs.reduce((sum, j) => sum + j.lateMinutes * priorityWeight[j.priority], 0);
      const totalLateMinutes = jobs.reduce((sum, j) => sum + j.lateMinutes, 0);
      const unscheduledPriorityPenalty = unscheduled.reduce((sum, j) => sum + (holdPenalty[j.priority] || 100), 0);
      return {
        jobs, unscheduled, profile: profile.map(s => ({ ...s, kw: round(s.kw) })), peakKw: round(peakKw), kwh: round(kwh),
        usageCost: round(usageCost), demandExposure: round(demandExposure),
        lateOrders: jobs.filter(j => j.lateMinutes > 0).length,
        totalLateMinutes, weightedLateMinutes, unscheduledPriorityPenalty,
        overdueStockOrders: allocations.filter(o => !o.produce && o.dueMinute < start).length,
        overloadSlots: profile.filter(s => s.kw > Number(energy.peakLimitKw) + 1e-8).length,
        totalChangeoverMinutes: jobs.reduce((sum, j) => sum + Number(j.changeoverMinutes || 0), 0)
      };
    }

    const baseline = baselineSchedule();
    const candidate = candidateSchedule();

    const baselineById = new Map(baseline.jobs.map(j => [j.id, j]));
    const candidateById = new Map(candidate.jobs.map(j => [j.id, j]));
    const serviceTuple = s => [s.unscheduled.length, s.unscheduledPriorityPenalty, s.weightedLateMinutes, s.totalLateMinutes];
    const serviceBetter = lexLess(serviceTuple(candidate), serviceTuple(baseline));
    const serviceNoWorse = lexLE(serviceTuple(candidate), serviceTuple(baseline));
    const commonNoWorse = candidate.jobs.every(j => {
      const b = baselineById.get(j.id);
      return !b || j.lateMinutes <= b.lateMinutes;
    });
    const noNewDroppedWork = baseline.jobs.every(j => candidateById.has(j.id)) || serviceBetter;
    const noWorseBill = candidate.usageCost + candidate.demandExposure <= baseline.usageCost + baseline.demandExposure + .01;
    const useCandidate = serviceNoWorse && commonNoWorse && noNewDroppedWork && (serviceBetter || noWorseBill);
    const proposed = useCandidate ? candidate : baseline;

    const warnings = [];
    if (!useCandidate) warnings.push('No whole-shift alternative improved service/energy without worsening protected delivery. The earliest-feasible baseline is retained.');
    if (proposed.unscheduled.length) warnings.push(`${proposed.unscheduled.length} order(s) are on HOLD for materials, packaging, data or capacity.`);
    if (proposed.lateOrders || proposed.overdueStockOrders) warnings.push(`${proposed.lateOrders + proposed.overdueStockOrders} order(s) are late against supplied due times.`);
    if (proposed.overloadSlots) warnings.push(`Peak target exceeded in ${proposed.overloadSlots} fifteen-minute interval(s). Review sequencing, eligible lines or the target.`);

    const jobUsageCost = (schedule, job) => round(schedule.profile
      .filter(s => s.minute >= job.start && s.minute < job.end)
      .reduce((sum, s) => sum + Number(job.kw) * .25 * Number(s.rate), 0));

    const decisions = proposed.jobs.map(job => {
      const base = baselineById.get(job.id);
      const baselineUsageCost = base ? jobUsageCost(baseline, base) : null;
      const proposedUsageCost = jobUsageCost(proposed, job);
      const shiftedMinutes = base ? job.start - base.start : 0;
      const lineChanged = Boolean(base && base.lineId !== job.lineId);
      let reason = 'RUN at the earliest feasible time while protecting delivery and line capacity.';
      if (lineChanged) reason = `SHIFT to ${job.line}: this eligible line improves the whole-shift service/energy objective without worsening protected delivery.`;
      else if (shiftedMinutes !== 0 && baselineUsageCost != null && proposedUsageCost < baselineUsageCost - .01) reason = 'SHIFT to a lower-tariff production window without worsening protected delivery.';
      else if (shiftedMinutes !== 0 && baseline.peakKw > proposed.peakKw) reason = 'SHIFT to reduce peak-demand exposure without worsening protected delivery.';
      else if (shiftedMinutes !== 0) reason = 'SHIFT as part of the whole-shift sequence to protect higher-priority delivery and factory feasibility.';
      else if (job.changeoverMinutes > 0) reason = 'RUN after the prior line job with configured changeover time included.';
      return {
        action: shiftedMinutes !== 0 || lineChanged ? 'SHIFT' : 'RUN',
        orderId: job.id, customer: job.customer, product: job.product, quantity: job.produce, unit: job.unit,
        line: job.line, lineId: job.lineId, due: job.due, priority: job.priority,
        recommendedStart: job.startTime, recommendedEnd: job.endTime, productionStart: job.productionStartTime,
        baselineStart: base?.startTime || null, baselineEnd: base?.endTime || null, baselineLine: base?.line || null,
        shiftedMinutes, changeoverMinutes: job.changeoverMinutes,
        baselineUsageCost, proposedUsageCost,
        modeledUsageSaving: baselineUsageCost == null ? null : round(baselineUsageCost - proposedUsageCost),
        reason
      };
    });
    const holds = proposed.unscheduled.map(h => ({
      action: 'HOLD', orderId: h.id, customer: h.customer, product: h.product, quantity: h.produce, unit: h.unit,
      due: h.due, priority: h.priority, reasonCode: h.reasonCode || 'CAPACITY', earliestFeasibleDate: h.earliestFeasibleDate || null, reason: h.reason
    }));
    const orderDecisions = [...decisions, ...holds].sort((a, b) => {
      const oa = allocations.findIndex(o => o.id === a.orderId), ob = allocations.findIndex(o => o.id === b.orderId);
      return oa - ob;
    });

    const intervalsUsed = slots.filter(s => s.energySource === 'interval-import').length;
    return {
      schemaVersion: '3.0', generatedAt: new Date().toISOString(), factory: input.factory || 'My factory', shift, energy,
      baselineLabel: 'Earliest-feasible baseline',
      plannerMethod: 'bounded whole-shift beam search with eligible-line and 15-minute start-time candidates',
      allocations, baseline, proposed, decisions, holds, orderDecisions, warnings,
      energyInput: {
        intervalDataLoaded: importedIntervals.size > 0, intervalsLoaded: importedIntervals.size, intervalsUsed,
        shiftIntervals: slots.length, intervalLoadBasis: energy.intervalLoadBasis || 'background'
      },
      procurement: { requirements: materialPlan.requirements, totalEstimatedPurchaseCost: materialPlan.totalEstimatedPurchaseCost },
      comparison: {
        peakReductionKw: round(baseline.peakKw - proposed.peakKw),
        peakReductionPct: baseline.peakKw ? round((baseline.peakKw - proposed.peakKw) / baseline.peakKw * 100) : 0,
        usageSaving: round(baseline.usageCost - proposed.usageCost),
        conditionalDemandSaving: round(baseline.demandExposure - proposed.demandExposure),
        totalModeledOperatingSaving: round((baseline.usageCost + baseline.demandExposure) - (proposed.usageCost + proposed.demandExposure)),
        shiftedJobs: proposed.jobs.filter(j => {
          const b = baselineById.get(j.id);
          return b && (b.start !== j.start || b.lineId !== j.lineId);
        }).length,
        additionalScheduledOrders: Math.max(0, proposed.jobs.length - baseline.jobs.length)
      },
      objective: [
        'Minimize HOLD orders and protect higher-priority work',
        'Minimize priority-weighted late minutes and total late minutes',
        'Avoid peak-demand target breaches',
        'Minimize modeled electricity plus conditional demand-charge cost',
        'Minimize changeover burden after service and energy constraints',
        'Use finished stock before scheduling new production'
      ],
      assumptions: [
        '15-minute load model. Imported interval baseline load overrides configured base load at matching times; missing intervals fall back to configured base load.',
        'Imported Facility kW must represent background/baseline load before schedulable production loads are added. Total meter load is rejected unless decomposed first.',
        'Products may define lineOptions with line-specific rates, lineIds with a shared rate, or a legacy single lineId.',
        'Optional line downtime blocks affected intervals. Optional product-to-product changeover matrices override a line default changeover.',
        'Material HOLD decisions use physically available stock only. Existing inbound purchase orders and supplier lead time are used only to estimate an earliest replenishment date, not to pretend stock has arrived.',
        'Tariff model uses energy prices and a linear monthly demand rate. Ratchets, minimum billed demand, taxes and power-factor penalties are excluded.',
        'Demand savings are conditional on these schedules setting the final monthly peak. Do not multiply them by working days.',
        'Timing changes alone do not reduce kWh. A different eligible line may change modeled kWh because machine power/rate differ.',
        'The optimizer is a bounded deterministic beam-search heuristic, not a guarantee of a globally optimal mathematical solution. Supervisor review remains required.'
      ]
    };
  }

  const api = { createEnergyPlan, timeMinutes, clock };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BatchWattEnergy = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
