/* Shared, dependency-free helpers for browser outputs and regression tests. */
(function (root) {
  const numeric = (value, fallback = NaN) => {
    if (value == null || String(value).trim() === '') return fallback;
    const parsed = Number(String(value).replace(/,/g, '').trim());
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));

  function validateOrders(orders) {
    const errors = [];
    orders.forEach((order, i) => {
      const prefix = `Row ${i + 1}`;
      if (!order.product || order.product === 'Unspecified product') errors.push(`${prefix}: supply a product.`);
      if (!Number.isFinite(order.qty) || order.qty <= 0) errors.push(`${prefix}: quantity must be greater than zero.`);
      if (!Number.isFinite(order.stock) || order.stock < 0) errors.push(`${prefix}: stock must be zero or greater.`);
      if (Number.isFinite(order.shortage) && (order.shortage < 0 || order.shortage > order.qty)) errors.push(`${prefix}: shortage must be between zero and quantity.`);
    });
    return errors;
  }

  function dueTime(value, reference = new Date()) {
    const text = String(value || '').trim().toLowerCase();
    const date = new Date(reference);
    date.setHours(0, 0, 0, 0);
    if (text === 'today') return date.getTime();
    if (text === 'tomorrow') { date.setDate(date.getDate() + 1); return date.getTime(); }
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const weekday = days.indexOf(text.replace(/^next /, ''));
    if (weekday >= 0) {
      let delta = (weekday - date.getDay() + 7) % 7;
      if (!delta && text.startsWith('next ')) delta = 7;
      date.setDate(date.getDate() + delta);
      return date.getTime();
    }
    // Require a year for absolute dates; do not silently assign one to pilot dates.
    if (!/\b\d{4}\b/.test(text)) return Infinity;
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const parsed = iso ? new Date(+iso[1], +iso[2] - 1, +iso[3]) : new Date(text);
    if (iso && (parsed.getFullYear() !== +iso[1] || parsed.getMonth() !== +iso[2] - 1 || parsed.getDate() !== +iso[3])) return Infinity;
    return Number.isNaN(parsed.getTime()) ? Infinity : parsed.getTime();
  }

  function sortedOrders(workspace) {
    const reference = workspace.generatedAt || new Date();
    const priority = order => /urgent/i.test(order.priority) ? 0 : /high/i.test(order.priority) ? 1 : 2;
    return [...(workspace.orders || [])].sort((a, b) => {
      const aDue = dueTime(a.due, reference), bDue = dueTime(b.due, reference);
      return Number(Boolean(b.risk)) - Number(Boolean(a.risk)) ||
        (aDue === bDue ? 0 : aDue < bDue ? -1 : 1) || priority(a) - priority(b);
    });
  }

  function warnings(workspace) {
    const orders = workspace.orders || [];
    const notes = [...(workspace.warnings || [])];
    if (workspace.ordersCount !== orders.length) notes.push(`Charts cover ${orders.length} loaded order rows. The workspace reports ${workspace.ordersCount ?? 'an unknown number of'} orders in total.`);
    const unknown = orders.filter(o => !Number.isFinite(dueTime(o.due, workspace.generatedAt))).length;
    if (unknown) notes.push(`${unknown} order(s) have an unrecognized or incomplete due date. Confirm before release.`);
    const keys = orders.map(o => `${o.product.trim().toLowerCase()}|${o.unit || 'units'}`);
    if (new Set(keys).size < keys.length) notes.push('Repeated products: stock must be reserved separately for each order. Do not repeat the same shared stock balance across rows.');
    return notes;
  }

  function coverageSvg(workspace) {
    const orders = sortedOrders(workspace);
    const width = 920, height = Math.max(200, 140 + orders.length * 76);
    const parts = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="coverage-title coverage-description">`,
      `<title id="coverage-title">${escape(workspace.name)}: order stock coverage</title>`,
      '<desc id="coverage-description">Each bar represents one order, from zero to one hundred percent. Green is covered stock. Orange is the remaining shortage. Quantities use each order\'s own unit.</desc>',
      `<rect width="${width}" height="${height}" fill="#fffdf8"/>`,
      '<g font-family="system-ui, sans-serif" fill="#1f1f1b">',
      `<text x="24" y="32" font-size="22" font-weight="700">${escape(String(workspace.name || "BatchWatt").slice(0, 65))}</text>`,
      `<text x="24" y="57" font-size="14">${orders.length} loaded orders · stock coverage per order · draft for supervisor review</text>`,
      '<text x="340" y="86" font-size="14">0%</text><text x="630" y="86" font-size="14">50%</text><text x="876" y="86" font-size="14">100%</text>'];
    if (!orders.length) parts.push('<text x="24" y="126" font-size="16">No order rows available. Upload or paste orders to see coverage.</text>');
    orders.forEach((order, i) => {
      const y = 108 + i * 76;
      const qty = numeric(order.qty, 0), shortage = numeric(order.shortage, 0);
      const covered = Math.max(0, Math.min(qty, qty - shortage));
      const coveredWidth = qty > 0 ? covered / qty * 560 : 0;
      const label = `${order.id} · ${order.product}`;
      parts.push(`<text x="24" y="${y + 4}" font-size="15"><title>${escape(label)}</title>${escape(label.length > 34 ? label.slice(0, 31) + '…' : label)}</text>`,
        `<text x="24" y="${y + 25}" font-size="14" fill="#66645c">${escape(order.priority)} · ${escape(order.due)}</text>`,
        `<rect x="340" y="${y - 12}" width="560" height="24" rx="3" fill="#d8663c"/>`,
        `<rect x="340" y="${y - 12}" width="${coveredWidth.toFixed(2)}" height="24" fill="#2f6f4e"/>`,
        `<text x="340" y="${y + 34}" font-size="14">Covered ${covered} · Short ${shortage} · Ordered ${qty} ${escape(order.unit || 'units')}</text>`);
    });
    parts.push('</g></svg>');
    return parts.join('');
  }

  function csv(workspace) {
    // Prevent spreadsheet formula execution in user-controlled cells.
    const cell = value => {
      let text = String(value ?? '');
      if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
      return '"' + text.replace(/"/g, '""') + '"';
    };
    const rows = [['Order', 'Customer', 'Product', 'Due', 'Priority', 'Quantity', 'Unit', 'Stock', 'Shortage', 'Needs review', 'Action']];
    sortedOrders(workspace).forEach(o => rows.push([o.id, o.customer, o.product, o.due, o.priority, o.qty, o.unit, o.stock, o.shortage, o.risk ? 'Yes' : 'No', o.action]));
    return '\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n');
  }

  const api = { numeric, validateOrders, dueTime, sortedOrders, warnings, coverageSvg, csv };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BatchWattInsights = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
