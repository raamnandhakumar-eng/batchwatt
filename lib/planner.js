// BatchWatt V9 planning and parsing engine.
// Goal: automate input collection from WhatsApp, stock sheets, electricity bills, LPG receipts,
// then create a dispatch-first plan with a monthly-peak-aware energy receipt.

function n(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

function money(value, currencyCode = 'LOCAL') {
  return `${Math.round(n(value)).toLocaleString('en-US')} ${currencyCode}`;
}

function moneyRange(low, high, currencyCode = 'LOCAL') {
  if (n(high) <= 0) return `0 ${currencyCode}`;
  return `~${money(low, currencyCode)} to ${money(high, currencyCode)}`;
}

const DEFAULT_PRODUCTS = {
  GHEE_500ML: { sku: 'GHEE_500ML', name: '500 ml ghee', kgPerUnit: 0.5, family: 'Ghee' },
  GHEE_250ML: { sku: 'GHEE_250ML', name: '250 ml ghee', kgPerUnit: 0.25, family: 'Ghee' },
  GHEE_1L: { sku: 'GHEE_1L', name: '1 L ghee', kgPerUnit: 1.0, family: 'Ghee' },
  PREMIUM_TIN: { sku: 'PREMIUM_TIN', name: 'Premium tin', kgPerUnit: 1.0, family: 'Ghee' }
};

const DEFAULT_ALIASES = {
  '500 ml': 'GHEE_500ML',
  '500ml': 'GHEE_500ML',
  'half litre': 'GHEE_500ML',
  'half liter': 'GHEE_500ML',
  '250 ml': 'GHEE_250ML',
  '250ml': 'GHEE_250ML',
  '1 l': 'GHEE_1L',
  '1l': 'GHEE_1L',
  'one litre': 'GHEE_1L',
  'one liter': 'GHEE_1L',
  'premium tin': 'PREMIUM_TIN',
  'tin': 'PREMIUM_TIN'
};

const DEFAULT_MACHINES = [
  { machine: 'Kettle / heating', avgKw: 30, startupSpikeKw: 10, fastStartHour: 8, fastEndHour: 11, staggeredStartHour: 8, staggeredEndHour: 11, shiftable: false },
  { machine: 'Compressor', avgKw: 18, startupSpikeKw: 8, fastStartHour: 8, fastEndHour: 14, staggeredStartHour: 11, staggeredEndHour: 17, shiftable: true },
  { machine: 'Filler', avgKw: 12, startupSpikeKw: 4, fastStartHour: 8, fastEndHour: 12, staggeredStartHour: 12, staggeredEndHour: 16, shiftable: true },
  { machine: 'Labeler / sealer', avgKw: 8, startupSpikeKw: 3, fastStartHour: 8, fastEndHour: 13, staggeredStartHour: 14, staggeredEndHour: 18, shiftable: true }
];

function normalizeSku(text, aliases = DEFAULT_ALIASES) {
  const lower = String(text || '').toLowerCase();
  const ordered = Object.entries(aliases).sort((a, b) => b[0].length - a[0].length);
  for (const [alias, sku] of ordered) {
    if (lower.includes(alias.toLowerCase())) return sku;
  }
  return null;
}

function parseWhatsappOrders(text, aliases = DEFAULT_ALIASES) {
  const orders = [];
  const exceptions = [];
  const lines = String(text || '')
    .split(/\n+/)
    .map(l => l.replace(/^[\s\-•*]+/, '').trim())
    .filter(Boolean);

  for (const line of lines) {
    const lower = line.toLowerCase();
    const sku = normalizeSku(lower, aliases);
    if (!sku) {
      exceptions.push({ source: 'whatsapp', line, issue: 'unknown_sku', message: "Couldn't read SKU. Please confirm product." });
      continue;
    }

    let units = null;
    const cases = lower.match(/(\d+(?:,\d+)*)\s*(cases?|ctn|cartons?)\b/);
    if (cases) units = n(cases[1]) * 24;
    if (units === null) {
      const qty = lower.match(/(\d+(?:,\d+)*)\s*(x|pcs?|units?|jars?|bottles?|nos?|no)?\b/);
      if (qty) units = n(qty[1]);
    }
    if (!units) {
      exceptions.push({ source: 'whatsapp', line, issue: 'unknown_quantity', message: "Couldn't read quantity. Please confirm units." });
      continue;
    }

    let dueDays = 2;
    if (/today|urgent|evening|tonight|eod|fast|asap/.test(lower)) dueDays = 0;
    else if (/tomorrow|tmrw|next day/.test(lower)) dueDays = 1;

    let customer = 'Customer';
    if (line.includes(':')) customer = line.split(':')[0].trim().slice(0, 60) || customer;
    else if (line.includes('-')) customer = line.split('-')[0].trim().slice(0, 60) || customer;

    orders.push({ sourceLine: line, customer, sku, units: Math.round(units), dueDays, needsConfirmation: false });
  }

  return { orders, exceptions };
}

function parseStockCsv(csvText) {
  const stock = {};
  const exceptions = [];
  const rows = String(csvText || '').split(/\n+/).map(r => r.trim()).filter(Boolean);
  if (rows.length < 2) return { stock, exceptions: [{ source: 'stock', issue: 'empty_stock_sheet', message: 'No stock rows found. Using zero stock until sheet sync succeeds.' }] };
  const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
  for (const row of rows.slice(1)) {
    const vals = row.split(',').map(v => v.trim());
    const obj = Object.fromEntries(headers.map((h, i) => [h, vals[i] || '']));
    const sku = obj.sku || obj.product || obj.item;
    if (!sku) {
      exceptions.push({ source: 'stock', line: row, issue: 'missing_sku', message: 'Stock row missing SKU.' });
      continue;
    }
    stock[sku] = {
      sku,
      finishedUnits: n(obj.finished_units || obj.finished || obj.stock),
      packagingUnits: n(obj.packaging_units || obj.packaging || obj.bottles),
      lastKnown: /true|yes|1/.test(String(obj.last_known || '').toLowerCase())
    };
  }
  return { stock, exceptions };
}

function matchNum(pattern, text, fallback = 0) {
  const m = String(text || '').match(pattern);
  return m ? n(m[1], fallback) : fallback;
}

function parseBillAndReceipts(text, defaultCurrency = 'LOCAL') {
  const raw = String(text || '');
  const currencyMatch = raw.match(/currency\s+([A-Z]{3})/i);
  const noDemandCharge = /no\s+demand\s+charge|demand\s+charge\s*[:=]?\s*none|demand\s+tariff\s*[:=]?\s*no/i.test(raw);
  const demandChargePerKw = noDemandCharge ? 0 : matchNum(/demand\s*charge\s*([\d,.]+)\s*per\s*kw/i, raw);
  const parsed = {
    currencyCode: currencyMatch ? currencyMatch[1].toUpperCase() : defaultCurrency,
    totalKwh: matchNum(/total\s*kwh\s*([\d,.]+)/i, raw),
    electricityRatePerKwh: matchNum(/rate\s*([\d,.]+)\s*per\s*kwh/i, raw, 10),
    maxDemandKw: matchNum(/max\s*demand\s*([\d,.]+)\s*kw/i, raw),
    monthlyPeakSoFarKw: matchNum(/(?:month(?:ly)?\s*peak\s*so\s*far|peak\s*so\s*far)\s*([\d,.]+)\s*kw/i, raw),
    demandChargePerKw,
    hasDemandChargeTariff: demandChargePerKw > 0 && !noDemandCharge,
    contractedDemandKw: matchNum(/contracted\s*demand\s*([\d,.]+)\s*kw/i, raw, 9999),
    penaltyAboveContractPerKw: matchNum(/penalty\s*([\d,.]+)\s*per\s*kw/i, raw),
    lpgDeliveredKg: matchNum(/delivered\s*([\d,.]+)\s*kg/i, raw),
    lpgPricePerKg: matchNum(/at\s*([\d,.]+)\s*per\s*kg/i, raw, 100),
    lpgStockAfterRefillKg: matchNum(/stock\s*after\s*refill\s*([\d,.]+)\s*kg/i, raw),
    batchesSinceRefill: matchNum(/batches\s*since\s*refill\s*([\d,.]+)/i, raw)
  };
  return parsed;
}

function buildPeakProfile(machines = DEFAULT_MACHINES, mode = 'fast') {
  const profile = [];
  for (let hour = 8; hour < 18; hour += 1) {
    let kw = 0;
    const active = [];
    for (const m of machines) {
      const start = n(m[`${mode}StartHour`] ?? m[`${mode}_start_hour`] ?? m.fastStartHour);
      const end = n(m[`${mode}EndHour`] ?? m[`${mode}_end_hour`] ?? m.fastEndHour);
      if (start <= hour && hour < end) {
        kw += n(m.avgKw ?? m.avg_kw);
        active.push(m.machine || 'machine');
      }
      if (Math.floor(start) === hour) kw += n(m.startupSpikeKw ?? m.startup_spike_kw);
    }
    profile.push({ hour, kw: Math.round(kw * 10) / 10, active });
  }
  return profile;
}

function hasDemandChargeTariff(setup) {
  const explicit = setup.hasDemandChargeTariff ?? setup.has_demand_charge_tariff;
  if (explicit === false || explicit === 'false' || explicit === 0) return false;
  if (explicit === true || explicit === 'true' || explicit === 1) return true;
  return n(setup.demandChargePerKw ?? setup.demand_charge_per_kw) > 0;
}

function demandCost(peakKw, setup) {
  if (!hasDemandChargeTariff(setup)) return 0;
  const demand = n(peakKw) * n(setup.demandChargePerKw ?? setup.demand_charge_per_kw);
  const over = Math.max(0, n(peakKw) - n(setup.contractedDemandKw ?? setup.contracted_demand_kw, 9999));
  const penalty = over * n(setup.penaltyAboveContractPerKw ?? setup.penalty_above_contract_per_kw);
  return demand + penalty;
}

function demandChargeSavingForToday(fastPeakKw, staggeredPeakKw, setup) {
  const currencyCode = setup.currencyCode || 'LOCAL';
  const monthlyPeakSoFarKw = n(setup.monthlyPeakSoFarKw ?? setup.monthly_peak_so_far_kw, 0);
  const eligible = hasDemandChargeTariff(setup);
  if (!eligible) {
    return {
      eligible: false,
      monthlyPeakSoFarKw,
      wouldSetNewMonthlyPeak: false,
      low: 0,
      high: 0,
      range: `0 ${currencyCode}`,
      note: 'Demand-charge saving today: 0. No demand-charge tariff detected on this bill.'
    };
  }
  if (n(fastPeakKw) <= monthlyPeakSoFarKw) {
    return {
      eligible: true,
      monthlyPeakSoFarKw,
      wouldSetNewMonthlyPeak: false,
      low: 0,
      high: 0,
      range: `0 ${currencyCode}`,
      note: `Demand-charge saving today: 0. Today does not exceed this billing month's peak so far (${monthlyPeakSoFarKw} kW).`
    };
  }
  const fastMonthlyPeak = Math.max(monthlyPeakSoFarKw, n(fastPeakKw));
  const staggeredMonthlyPeak = Math.max(monthlyPeakSoFarKw, n(staggeredPeakKw));
  const modeledMid = Math.max(0, demandCost(fastMonthlyPeak, setup) - demandCost(staggeredMonthlyPeak, setup));
  const low = modeledMid * 0.8;
  const high = modeledMid * 1.2;
  return {
    eligible: true,
    monthlyPeakSoFarKw,
    wouldSetNewMonthlyPeak: modeledMid > 0,
    low,
    high,
    range: moneyRange(low, high, currencyCode),
    note: modeledMid > 0
      ? `Avoids ${moneyRange(low, high, currencyCode)} per billing month if this run would set the monthly peak.`
      : `Demand-charge saving today: 0. Staggered schedule still does not lower this billing month's peak.`
  };
}

function createPlan(input) {
  const setup = Object.assign({ currencyCode: 'LOCAL', lpgKgPerOutputKg: 0.14, kwhPerOutputKg: 0.18, lpgSafetyStockKg: 80, usageSavingsLowPct: 0.05, usageSavingsHighPct: 0.15 }, input.setup || {});
  const products = Object.assign({}, DEFAULT_PRODUCTS, input.products || {});
  const aliases = Object.assign({}, DEFAULT_ALIASES, input.aliases || {});
  const machines = input.machines || DEFAULT_MACHINES;

  const whatsapp = parseWhatsappOrders(input.whatsappText || input.dailyWhatsappFeed || '', aliases);
  const stockParsed = parseStockCsv(input.stockCsv || input.existingStockCsv || '');
  const bill = parseBillAndReceipts(input.billText || input.billAndLpgText || '', setup.currencyCode);
  Object.assign(setup, bill);

  const exceptions = [...whatsapp.exceptions, ...stockParsed.exceptions];
  const stock = stockParsed.stock;
  const planRows = [];

  for (const order of whatsapp.orders.sort((a, b) => a.dueDays - b.dueDays || a.customer.localeCompare(b.customer))) {
    const product = products[order.sku] || { name: order.sku, kgPerUnit: 1, family: 'Unknown' };
    const s = stock[order.sku] || { finishedUnits: 0, packagingUnits: 0, lastKnown: true };
    if (!stock[order.sku]) exceptions.push({ source: 'stock', issue: 'missing_stock_row', sku: order.sku, message: `No stock row for ${order.sku}. Used zero and flagged correction.` });
    if (s.lastKnown) exceptions.push({ source: 'stock', issue: 'last_known_stock', sku: order.sku, message: `${order.sku} stock is last-known. Confirm before production.` });

    const dispatchFromStock = Math.min(n(order.units), n(s.finishedUnits));
    s.finishedUnits = Math.max(0, n(s.finishedUnits) - dispatchFromStock);
    const produceUnits = Math.max(0, n(order.units) - dispatchFromStock);
    const packageShort = Math.max(0, produceUnits - n(s.packagingUnits));
    const kg = produceUnits * n(product.kgPerUnit, 1);

    planRows.push({
      customer: order.customer,
      sku: order.sku,
      productName: product.name,
      orderUnits: order.units,
      dueDays: order.dueDays,
      dispatchFromStock: Math.round(dispatchFromStock),
      produceUnits: Math.round(produceUnits),
      productionKg: Math.round(kg * 100) / 100,
      packagingShortageUnits: Math.round(packageShort)
    });
  }

  const totalKg = planRows.reduce((sum, r) => sum + n(r.productionKg), 0);
  const lpgNeededKg = totalKg * n(setup.lpgKgPerOutputKg ?? setup.lpg_kg_per_output_kg, 0.14);
  const electricityKwh = totalKg * n(setup.kwhPerOutputKg ?? setup.kwh_per_output_kg, 0.18);

  const fastProfile = buildPeakProfile(machines, 'fast');
  const staggeredProfile = buildPeakProfile(machines, 'staggered');
  const fastPeakKw = Math.max(0, ...fastProfile.map(r => r.kw));
  const staggeredPeakKw = Math.max(0, ...staggeredProfile.map(r => r.kw));

  const lpgCost = lpgNeededKg * n(setup.lpgPricePerKg ?? setup.lpg_price_per_kg, 100);
  const energyCharge = electricityKwh * n(setup.electricityRatePerKwh ?? setup.electricity_rate_per_kwh, 10);
  const dailyUsageCost = lpgCost + energyCharge;
  const usageSavingsLow = dailyUsageCost * n(setup.usageSavingsLowPct ?? setup.usage_savings_low_pct, 0.05);
  const usageSavingsHigh = dailyUsageCost * n(setup.usageSavingsHighPct ?? setup.usage_savings_high_pct, 0.15);
  const demandCharge = demandChargeSavingForToday(fastPeakKw, staggeredPeakKw, setup);
  const totalEnergyCost = dailyUsageCost;
  const currencyCode = setup.currencyCode || 'LOCAL';

  const atRisk = planRows.filter(r => r.dueDays === 0 && r.produceUnits > 0).length;
  const confidence = exceptions.length ? 'review needed' : 'good';

  const whatsappSummary = buildSummary(planRows, {
    lpgNeededKg, electricityKwh, fastPeakKw, staggeredPeakKw, usageSavingsLow, usageSavingsHigh,
    demandCharge, energyCostPerKg: totalKg ? totalEnergyCost / totalKg : 0, currencyCode
  }, exceptions);

  return {
    inputMode: 'automated-first: WhatsApp webhook + stock sync + bill/receipt parser + exception review',
    confidence,
    atRiskOrders: atRisk,
    dispatchPlan: planRows,
    exceptions,
    energyReceipt: {
      lpgNeededKg: Math.round(lpgNeededKg * 10) / 10,
      electricityKwh: Math.round(electricityKwh * 10) / 10,
      fastPeakKw,
      staggeredPeakKw,
      monthlyPeakSoFarKw: demandCharge.monthlyPeakSoFarKw,
      hasDemandChargeTariff: demandCharge.eligible,
      wouldSetNewMonthlyPeak: demandCharge.wouldSetNewMonthlyPeak,
      usageSavingsRange: moneyRange(usageSavingsLow, usageSavingsHigh, currencyCode),
      demandChargeSavingsRange: demandCharge.range,
      demandChargeNote: demandCharge.note,
      energyCostPerKg: Math.round((totalKg ? totalEnergyCost / totalKg : 0) * 100) / 100,
      calibrationNote: 'Modeled. Usage estimates sharpen after bills, LPG refills, meter readings, and production logs. Demand-charge savings apply only when today would set a new billing-month peak.'
    },
    fastProfile,
    staggeredProfile,
    whatsappSummary
  };
}

function buildSummary(planRows, energy, exceptions) {
  const first = planRows.find(r => r.produceUnits > 0);
  const stockDispatch = planRows.filter(r => r.dispatchFromStock > 0).slice(0, 3);
  const risk = planRows.filter(r => r.dueDays === 0 && r.produceUnits > 0);
  const lines = [];
  lines.push('BatchWatt plan');
  if (first) lines.push(`1. Make first: ${first.produceUnits} units of ${first.productName} for ${first.customer}.`);
  else lines.push('1. No production needed from parsed orders. Dispatch from stock.');
  if (stockDispatch.length) lines.push(`2. Dispatch from stock: ${stockDispatch.map(r => `${r.dispatchFromStock} ${r.productName}`).join(', ')}.`);
  if (risk.length) lines.push(`3. At-risk today: ${risk.length} order(s) still need production.`);
  lines.push(`4. Energy receipt: LPG ${Math.round(energy.lpgNeededKg * 10) / 10} kg, electricity ${Math.round(energy.electricityKwh * 10) / 10} kWh.`);
  lines.push(`5. Peak load: ${energy.fastPeakKw} kW fast schedule -> ${energy.staggeredPeakKw} kW staggered schedule. Month peak so far: ${energy.demandCharge.monthlyPeakSoFarKw} kW.`);
  lines.push(`6. Usage saving this run: ${moneyRange(energy.usageSavingsLow, energy.usageSavingsHigh, energy.currencyCode)}.`);
  lines.push(`7. ${energy.demandCharge.note} ${exceptions.length ? 'Review flagged items before running.' : 'Ready to run.'}`);
  return lines.join('\n');
}

module.exports = {
  DEFAULT_PRODUCTS,
  DEFAULT_ALIASES,
  DEFAULT_MACHINES,
  parseWhatsappOrders,
  parseStockCsv,
  parseBillAndReceipts,
  createPlan,
  money,
  moneyRange,
  demandChargeSavingForToday
};
