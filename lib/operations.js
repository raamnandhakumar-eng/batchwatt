/* BatchWatt operational workflow engine. Pure functions shared by UI/tests. */
(function(root){
  'use strict';
  const hash = text => {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(16).padStart(8, '0');
  };
  const planFingerprint = input => hash(JSON.stringify({
    factory: input.factory,
    shift: input.shift,
    energy: input.energy,
    lines: input.lines,
    products: input.products,
    orders: input.orders,
    materials: input.materials,
    recipes: input.recipes,
    purchaseOrders: input.purchaseOrders
  }));
  const sevRank = { critical: 0, high: 1, medium: 2, low: 3 };
  const normalizeState = (workflow, id) => workflow?.items?.[id] || { status: 'Open', owner: '', note: '', updatedAt: null };

  function deriveItems(input, result, workflow = {}) {
    if (!input || !result) return [];
    const items = [];
    const push = item => items.push({ ...item, state: normalizeState(workflow, item.id) });
    const shiftStart = (() => {
      const [h,m] = String(input.shift?.start || '00:00').split(':').map(Number);
      return h * 60 + m;
    })();

    for (const blocked of result.proposed.unscheduled || []) {
      const reason = String(blocked.reason || 'Production cannot be scheduled.');
      push({
        id: `order:${blocked.id}`,
        type: 'Order',
        severity: blocked.priority === 'Urgent' ? 'critical' : 'high',
        title: `${blocked.customer || blocked.id}: ${blocked.product}`,
        detail: reason,
        due: blocked.due || '',
        action: reason.includes('Material shortage') ? 'procurement' : reason.includes('packaging') || reason.includes('recipe') ? 'setup' : 'orders',
        sourceId: blocked.id
      });
    }

    for (const job of result.proposed.jobs || []) {
      if (Number(job.lateMinutes) > 0) {
        push({
          id: `late:${job.id}`,
          type: 'Dispatch',
          severity: job.priority === 'Urgent' ? 'critical' : 'high',
          title: `Late dispatch risk: ${job.customer || job.id}`,
          detail: `${job.product} finishes ${job.lateMinutes} min after the supplied due time.`,
          due: job.due || '',
          action: 'orders',
          sourceId: job.id
        });
      }
    }

    for (const a of result.allocations || []) {
      if (!a.produce && Number(a.dueMinute) < shiftStart) {
        push({
          id: `overdue-stock:${a.id}`,
          type: 'Dispatch',
          severity: a.priority === 'Urgent' ? 'critical' : 'high',
          title: `Overdue stock dispatch: ${a.customer || a.id}`,
          detail: `${a.product} is available from finished stock but its due time has passed.`,
          due: a.due || '',
          action: 'orders',
          sourceId: a.id
        });
      }
    }

    for (const m of result.procurement?.requirements || []) {
      if (Number(m.shortage) > 0 || Number(m.toBuy) > 0) {
        push({
          id: `material:${m.materialId}`,
          type: 'Procurement',
          severity: Number(m.shortage) > 0 ? 'high' : 'medium',
          title: `Replenish ${m.name}`,
          detail: Number(m.shortage) > 0
            ? `${m.shortage} ${m.unit} short for loaded orders. Suggested buy ${m.toBuy} ${m.unit}.`
            : `Stock is below the configured buffer. Suggested buy ${m.toBuy} ${m.unit}.`,
          due: input.shift?.date || '',
          action: 'procurement',
          sourceId: m.materialId
        });
      }
    }

    const today = input.shift?.date || '';
    for (const po of input.purchaseOrders || []) {
      if (!['Ordered','Part received'].includes(po.status)) continue;
      if (po.expectedDate <= today) {
        const mat = (input.materials || []).find(m => m.id === po.materialId);
        const remain = Math.max(0, Number(po.qty) - Number(po.receivedQty || 0));
        push({
          id: `po:${po.id}`,
          type: 'Inbound',
          severity: po.expectedDate < today ? 'high' : 'medium',
          title: `${po.expectedDate < today ? 'Overdue' : 'Due today'}: ${mat?.name || po.materialId}`,
          detail: `${remain} ${mat?.unit || 'units'} still expected. Confirm physical receipt before adding stock.`,
          due: po.expectedDate,
          action: 'procurement',
          sourceId: po.id
        });
      }
    }

    if (Number(result.proposed.peakKw) > Number(input.energy?.peakLimitKw)) {
      push({
        id: 'energy:peak-limit',
        type: 'Energy',
        severity: 'critical',
        title: 'Peak demand target exceeded',
        detail: `Planned peak ${result.proposed.peakKw} kW is above the ${input.energy.peakLimitKw} kW operating target.`,
        due: input.shift?.date || '',
        action: 'energy',
        sourceId: 'peak-limit'
      });
    }

    return items.sort((a,b) =>
      (a.state.status === 'Resolved') - (b.state.status === 'Resolved') ||
      sevRank[a.severity] - sevRank[b.severity] ||
      String(a.due).localeCompare(String(b.due)) || a.title.localeCompare(b.title)
    );
  }

  function summary(input, result, workflow = {}) {
    const items = deriveItems(input, result, workflow);
    const open = items.filter(i => i.state.status !== 'Resolved');
    const critical = open.filter(i => i.severity === 'critical');
    const blocked = (result?.proposed?.unscheduled || []).length;
    const limit = Number(input?.energy?.peakLimitKw || 0);
    const peak = Number(result?.proposed?.peakKw || 0);
    const peakBreach = Boolean(result) && peak > limit;
    return {
      items,
      openCount: open.length,
      criticalCount: critical.length,
      blockedOrders: blocked,
      peakHeadroomKw: Math.round((limit - peak) * 100) / 100,
      peakBreach,
      releasable: Boolean(result) && critical.length === 0 && blocked === 0 && !peakBreach
    };
  }

  function releaseStatus(input, workflow = {}) {
    const current = planFingerprint(input);
    const release = workflow.release || null;
    return {
      currentFingerprint: current,
      release,
      isReleased: Boolean(release && release.fingerprint === current),
      isStale: Boolean(release && release.fingerprint !== current)
    };
  }

  const api = { deriveItems, summary, planFingerprint, releaseStatus };
  if (typeof module !== 'undefined' && module.exports) module.exports=api;
  else root.BatchWattOperations=api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
