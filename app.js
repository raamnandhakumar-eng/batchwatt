const STORAGE_KEY = "batchwatt_uploaded_workspaces_v2";

const basePilots = {
  rkg: {
    id: "BW-RKG-001",
    name: "RKG Ghee",
    dates: "Jul 7–20, 2026",
    location: "Ghee processing and packing unit, Tamil Nadu",
    workflow: "Order review → stock check → batch sizing → heating/filling sequence → dispatch-risk review",
    cycles: 10,
    orders: 32,
    skus: 6,
    lines: 2,
    planningBefore: 95.91,
    planningAfter: 34.37,
    planningReduction: 64.2,
    atRisk: 9,
    sequenceChanges: 7,
    baselineEnergy: 5187.6,
    optimizedEnergy: 4733.4,
    energyReduction: 8.8,
    baselinePeak: 131.2,
    optimizedPeak: 115.8,
    peakReduction: 11.7,
    operatorRating: 4.34,
    team: "Plant manager, production planner, shift supervisor, and BatchWatt pilot lead",
    source: "Preloaded operational pilot record",
    badge: "Operational pilot data · external proof pending",
    planSource: "Workbook-derived",
    notes: [
      "High-load equipment shifted outside the peak window.",
      "Material shortage surfaced before line start.",
      "Similar SKUs were grouped to reduce cleaning and changeover.",
      "Urgent dispatch recommendations were adjusted after supervisor review."
    ],
    sampleOrders: [
      ["RKG-ORD-001", "Bulk Ghee 5 litre", "Jul 9 · Standard", "21 tins · At risk", "Advance batch and reserve material"],
      ["RKG-ORD-023", "Cow Ghee 200 ml", "Jul 9 · High", "149 bottles · At risk", "Advance batch and reserve material"],
      ["RKG-ORD-029", "Cow Ghee 1 litre", "Jul 11 · Standard", "25 jars", "Review material and customer timing"],
      ["RKG-ORD-031", "Buffalo Ghee 500 ml", "Jul 10 · High", "23 jars", "Run in planned sequence"]
    ],
    samplePlans: [
      ["Bulk Ghee 5 litre", "Filling & Packing", "Avoid simultaneous high-load heating", "Reviewed; adjusted"],
      ["Cow Ghee 1 litre", "Heating & Filtration", "Reduce changeover and idle time", "Accepted and executed"],
      ["Cow Ghee 100 ml", "Filling & Packing", "Use available material before replenishment", "Accepted and executed"],
      ["Buffalo Ghee 500 ml", "Heating & Filtration", "Group same cleaning family", "Accepted"],
      ["Cow Ghee 200 ml", "Filling & Packing", "Prioritize near-due order", "Accepted with timing adjustment"]
    ],
    quality: [
      ["good", "Pilot summary detected"],
      ["good", "32 order records"],
      ["good", "10 daily metric rows"],
      ["warn", "External confirmation pending"]
    ],
    uploaded: false
  },
  pr: {
    id: "BW-PRF-001",
    name: "PR Food Products",
    dates: "Jul 14–25, 2026",
    location: "Packaged-food production unit, Tamil Nadu",
    workflow: "Order consolidation → material check → machine allocation → sequence recommendation → dispatch review",
    cycles: 9,
    orders: 41,
    skus: 8,
    lines: 3,
    planningBefore: 120.96,
    planningAfter: 45.63,
    planningReduction: 62.3,
    atRisk: 7,
    sequenceChanges: 7,
    baselineEnergy: 6133.0,
    optimizedEnergy: 5720.5,
    energyReduction: 6.7,
    baselinePeak: 156.5,
    optimizedPeak: 142.4,
    peakReduction: 9.0,
    operatorRating: 4.26,
    team: "Factory owner, production supervisor, inventory coordinator, and BatchWatt pilot lead",
    source: "Preloaded operational pilot record",
    badge: "Operational pilot data · external proof pending",
    planSource: "Workbook-derived",
    notes: [
      "High-load equipment shifted outside the peak window.",
      "Similar SKUs were grouped to reduce cleaning and changeover.",
      "Recommendations were adjusted for urgent dispatches.",
      "Material checks were completed before machine allocation."
    ],
    sampleOrders: [
      ["PRF-ORD-040", "Idli/Dosa Mix 500 g", "Jul 17 · Urgent", "85 packs · At risk", "Advance batch and reserve material"],
      ["PRF-ORD-011", "Sambar Powder 200 g", "Jul 18 · Urgent", "10 packs · At risk", "Advance batch and reserve material"],
      ["PRF-ORD-023", "Snack Mix 250 g", "Jul 17 · Standard", "49 packs", "Run in planned sequence"],
      ["PRF-ORD-001", "Sambar Powder 200 g", "Jul 15 · High", "94 packs", "Run in planned sequence"]
    ],
    samplePlans: [
      ["Snack Mix 250 g", "Roasting / Cooking", "Use available material before replenishment", "Accepted"],
      ["Ready Rice Mix 1 kg", "Packing", "Group same cleaning family", "Accepted with timing adjustment"],
      ["Idli/Dosa Mix 500 g", "Blending", "Reduce changeover and idle time", "Accepted and executed"],
      ["Idli/Dosa Mix 200 g", "Roasting / Cooking", "Use available material before replenishment", "Accepted and executed"],
      ["Rice Flour 1 kg", "Packing", "Prioritize near-due order", "Reviewed; adjusted"]
    ],
    quality: [
      ["good", "Pilot summary detected"],
      ["good", "41 order records"],
      ["good", "9 daily metric rows"],
      ["warn", "External confirmation pending"]
    ],
    uploaded: false
  }
};

const evidence = [
  ["Anonymized order and pilot tables", "Available in supplied workbook", "available"],
  ["Daily planning and energy measurements", "Available in supplied workbook", "available"],
  ["Production recommendations and team responses", "Available in supplied workbook", "available"],
  ["Original source spreadsheets", "Attachment pending", "pending"],
  ["Timestamped BatchWatt run logs", "Not yet attached", "pending"],
  ["Screenshots tied to pilot cycles", "Not yet attached", "pending"],
  ["Written company confirmation", "Not yet obtained", "pending"],
  ["Permission to publish company names", "Not yet recorded", "pending"]
];

let pilots = { ...basePilots };
let selectedFile = null;
let parsedUpload = null;

const HEADER_ALIASES = {
  company: ["company", "factory", "pilot name"], pilotId: ["pilot id", "id"], startDate: ["start date", "pilot start"], endDate: ["end date", "pilot end"],
  location: ["factory / location", "factory location", "location"], people: ["people involved", "team", "participants"], workflow: ["workflow tested", "workflow"],
  cycles: ["planning cycles", "cycles"], ordersProcessed: ["orders processed", "orders"], skusCovered: ["skus covered", "skus"], machines: ["machines / lines", "machines / stages", "machines", "lines", "production stages"],
  planningBefore: ["avg planning time before (min)", "planning time before (min)", "planning time before"], planningAfter: ["avg planning time with batchwatt (min)", "planning time with batchwatt (min)", "planning time after", "planning time with batchwatt"], planningReduction: ["planning time reduction", "planning reduction"],
  riskCount: ["orders / dispatches flagged at risk", "orders flagged at risk", "orders at risk"], sequenceChanges: ["production sequencing changes", "sequence changes"],
  baselineEnergy: ["baseline energy (kwh)", "baseline energy"], optimizedEnergy: ["optimized energy (kwh)", "optimized energy"], energyReduction: ["estimated energy reduction", "energy reduction"],
  baselinePeak: ["baseline peak (kw)", "baseline peak"], optimizedPeak: ["optimized peak (kw)", "optimized peak"], peakReduction: ["peak-load reduction", "peak load reduction"], operatorRating: ["avg operator rating", "operator rating", "operator rating (1–5)"],
  orderId: ["order id", "order number", "order"], orderDate: ["order date", "date"], customer: ["customer (anonymized)", "customer", "account"], sku: ["sku", "item code", "product code"], product: ["product", "product name", "item"], orderQty: ["order qty", "order quantity", "quantity", "qty"], unit: ["unit", "uom"], dueDate: ["due date", "dispatch date", "required date"], priority: ["priority"], openingStock: ["opening finished-goods stock", "finished goods stock", "opening stock", "available stock", "stock"], shortage: ["shortage qty", "shortage", "short quantity"], assignedLine: ["assigned line", "line / machine", "line", "machine"], initialRisk: ["initial risk", "risk", "risk status"], recommendation: ["batchwatt recommendation", "recommendation", "recommended action"], finalOutcome: ["final outcome", "outcome", "status"],
  planningCycle: ["planning cycle", "cycle"], ordersReviewed: ["orders reviewed"], dailyRisk: ["orders at risk", "risk count"], dailySequenceChanges: ["sequence changes"], dailyPlanningBefore: ["planning time before (min)", "planning time before"], dailyPlanningAfter: ["planning time with batchwatt (min)", "planning time with batchwatt", "planning time after"], dailyBaselineEnergy: ["baseline energy (kwh)", "baseline energy"], dailyOptimizedEnergy: ["optimized energy (kwh)", "optimized energy"], dailyBaselinePeak: ["baseline peak (kw)", "baseline peak"], dailyOptimizedPeak: ["optimized peak (kw)", "optimized peak"], note: ["operator / supervisor note", "operator note", "supervisor note", "note", "notes"],
  planId: ["plan id"], baselineSequence: ["baseline sequence"], recommendedSequence: ["recommended sequence"], reason: ["reason for recommendation", "recommendation reason", "reason"], teamResponse: ["team response", "factory response", "response"], executionStatus: ["execution status", "status"]
};

function normalize(value) { return String(value ?? "").trim().toLowerCase().replace(/[\s_]+/g, " ").replace(/[^a-z0-9 /()&-]/g, ""); }
function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function toNumber(value, fallback = 0) { if (typeof value === "number" && Number.isFinite(value)) return value; const parsed = Number(String(value ?? "").replace(/[%,$₹]/g, "").replace(/,/g, "").trim()); return Number.isFinite(parsed) ? parsed : fallback; }
function toPercent(value) { const n = toNumber(value, 0); return n !== 0 && Math.abs(n) <= 1 ? n * 100 : n; }
function average(values) { const nums = values.map(value => toNumber(value, NaN)).filter(Number.isFinite); return nums.length ? nums.reduce((sumValue, value) => sumValue + value, 0) / nums.length : 0; }
function sum(values) { return values.reduce((total, value) => total + toNumber(value, 0), 0); }
function max(values) { const nums = values.map(value => toNumber(value, NaN)).filter(Number.isFinite); return nums.length ? Math.max(...nums) : 0; }
function uniqueCount(values) { return new Set(values.map(value => String(value ?? "").trim()).filter(Boolean)).size; }
function pct(value) { return Number.isFinite(value) && value !== 0 ? `${value.toFixed(1)}%` : "—"; }
function minutes(value) { return Number.isFinite(value) && value !== 0 ? `${value.toFixed(1)} min` : "—"; }
function fixed(value, digits = 1, suffix = "") { return Number.isFinite(value) && value !== 0 ? `${value.toFixed(digits)}${suffix}` : "—"; }

function dateLabel(value) {
  if (!value && value !== 0) return "—";
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (typeof value === "number" && window.XLSX?.SSF) { const parsed = XLSX.SSF.parse_date_code(value); if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  const date = new Date(value); if (!Number.isNaN(date.getTime())) return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return String(value);
}
function dateRange(start, end) { if (!start && !end) return "Dates not supplied"; return `${dateLabel(start)}${end ? ` – ${dateLabel(end)}` : ""}`; }
function getValue(row, aliases) { if (!row) return ""; const normalizedRow = Object.fromEntries(Object.entries(row).map(([key, value]) => [normalize(key), value])); for (const alias of aliases) { const key = normalize(alias); if (Object.prototype.hasOwnProperty.call(normalizedRow, key)) return normalizedRow[key]; } return ""; }
function getField(row, field) { return getValue(row, HEADER_ALIASES[field] || []); }

function findHeaderRow(matrix, requiredGroups, maxRows = 20) {
  const limit = Math.min(matrix.length, maxRows);
  for (let index = 0; index < limit; index += 1) {
    const headers = matrix[index].map(normalize);
    const matches = requiredGroups.filter(group => group.some(alias => headers.includes(normalize(alias)))).length;
    if (matches >= Math.min(requiredGroups.length, 2)) return index;
  }
  return -1;
}

function sheetObjects(workbook, sheetName, requiredGroups) {
  if (!sheetName || !workbook.Sheets[sheetName]) return [];
  const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: "", raw: true });
  if (!matrix.length) return [];
  const headerIndex = findHeaderRow(matrix, requiredGroups);
  if (headerIndex < 0) return [];
  const headers = matrix[headerIndex].map(value => String(value ?? "").trim());
  return matrix.slice(headerIndex + 1).filter(row => row.some(value => String(value ?? "").trim() !== "")).map(row => Object.fromEntries(headers.map((header, index) => [header || `Column ${index + 1}`, row[index] ?? ""])));
}

function detectSheet(workbook, type, companyHint = "") {
  const typeRules = {
    summary: { names: ["pilot summary"], groups: [HEADER_ALIASES.company, HEADER_ALIASES.ordersProcessed] },
    orders: { names: ["orders", "order book"], groups: [HEADER_ALIASES.orderId, HEADER_ALIASES.product, HEADER_ALIASES.orderQty] },
    metrics: { names: ["daily metrics", "metrics"], groups: [HEADER_ALIASES.planningCycle, HEADER_ALIASES.dailyPlanningBefore] },
    plan: { names: ["production plan", "recommendations", "plan"], groups: [HEADER_ALIASES.product, HEADER_ALIASES.reason] },
    evidence: { names: ["evidence checklist", "evidence"], groups: [["evidence item"], ["current status", "status"]] }
  };
  const rule = typeRules[type];
  const companyTokens = normalize(companyHint).split(" ").filter(token => token.length > 1 && !["food", "foods", "products", "pilot", "company"].includes(token));
  const candidates = workbook.SheetNames.map(name => {
    const normalizedName = normalize(name); let score = rule.names.some(term => normalizedName.includes(term)) ? 5 : 0;
    if (companyTokens.some(token => normalizedName.includes(token))) score += 3;
    const rows = sheetObjects(workbook, name, rule.groups); if (rows.length) score += 4;
    return { name, score, rows };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score);
  return candidates[0] || { name: "", score: 0, rows: [] };
}

function buildOrderRows(orders) {
  return orders.map(row => {
    const qty = toNumber(getField(row, "orderQty"), 0), stock = toNumber(getField(row, "openingStock"), 0), explicitShortage = toNumber(getField(row, "shortage"), NaN);
    const shortage = Number.isFinite(explicitShortage) ? explicitShortage : Math.max(qty - stock, 0), riskText = String(getField(row, "initialRisk") || ""), isRisk = /risk|late|short|urgent/i.test(riskText) || shortage > 0, priority = String(getField(row, "priority") || "Standard"), due = getField(row, "dueDate");
    let recommendation = String(getField(row, "recommendation") || "");
    if (!recommendation) recommendation = isRisk && /urgent|high/i.test(priority) ? "Advance batch, reserve material, and confirm line capacity" : isRisk ? "Review shortage and schedule production before the due date" : "Run in the planned sequence";
    return { orderId: String(getField(row, "orderId") || "Order"), product: String(getField(row, "product") || getField(row, "sku") || "Unspecified product"), duePriority: `${dateLabel(due)} · ${priority}`, shortageRisk: `${shortage ? `${shortage} ${getField(row, "unit") || "units"}` : "No calculated shortage"}${riskText ? ` · ${riskText}` : ""}`, recommendation, isRisk, priorityRank: /urgent/i.test(priority) ? 0 : /high/i.test(priority) ? 1 : 2, shortage };
  }).sort((a, b) => Number(b.isRisk) - Number(a.isRisk) || a.priorityRank - b.priorityRank || b.shortage - a.shortage);
}

function buildPlanRows(plans, orderRows) {
  if (plans.length) return plans.slice(0, 12).map(row => [String(getField(row, "product") || getField(row, "sku") || "Unspecified product"), String(getField(row, "assignedLine") || "Not supplied"), String(getField(row, "reason") || getField(row, "recommendation") || "Recommendation recorded"), String(getField(row, "teamResponse") || getField(row, "executionStatus") || "Review pending")]);
  return orderRows.filter(row => row.isRisk).slice(0, 8).map(row => [row.product, "Line assignment required", row.recommendation, "Rules-based draft · supervisor review required"]);
}

function calculateFromRows({ name, fileName, summaryRow, orders, metrics, plans, detectedSheets }) {
  const orderRows = buildOrderRows(orders), riskOrders = orderRows.filter(row => row.isRisk), summaryCompany = getField(summaryRow, "company"), companyName = String(summaryCompany || name || fileName.replace(/\.[^.]+$/, "") || "Uploaded factory").trim();
  const planningBefore = toNumber(getField(summaryRow, "planningBefore"), average(metrics.map(row => getField(row, "dailyPlanningBefore")))), planningAfter = toNumber(getField(summaryRow, "planningAfter"), average(metrics.map(row => getField(row, "dailyPlanningAfter")))), planningReduction = toPercent(getField(summaryRow, "planningReduction")) || (planningBefore > 0 ? ((planningBefore - planningAfter) / planningBefore) * 100 : 0);
  const baselineEnergy = toNumber(getField(summaryRow, "baselineEnergy"), sum(metrics.map(row => getField(row, "dailyBaselineEnergy")))), optimizedEnergy = toNumber(getField(summaryRow, "optimizedEnergy"), sum(metrics.map(row => getField(row, "dailyOptimizedEnergy")))), energyReduction = toPercent(getField(summaryRow, "energyReduction")) || (baselineEnergy > 0 ? ((baselineEnergy - optimizedEnergy) / baselineEnergy) * 100 : 0);
  const baselinePeak = toNumber(getField(summaryRow, "baselinePeak"), max(metrics.map(row => getField(row, "dailyBaselinePeak")))), optimizedPeak = toNumber(getField(summaryRow, "optimizedPeak"), max(metrics.map(row => getField(row, "dailyOptimizedPeak")))), peakReduction = toPercent(getField(summaryRow, "peakReduction")) || (baselinePeak > 0 ? ((baselinePeak - optimizedPeak) / baselinePeak) * 100 : 0);
  const cycles = toNumber(getField(summaryRow, "cycles"), uniqueCount(metrics.map(row => getField(row, "planningCycle"))) || metrics.length), ordersProcessed = toNumber(getField(summaryRow, "ordersProcessed"), orders.length || sum(metrics.map(row => getField(row, "ordersReviewed")))), skus = toNumber(getField(summaryRow, "skusCovered"), uniqueCount(orders.map(row => getField(row, "sku") || getField(row, "product")))), lines = toNumber(getField(summaryRow, "machines"), uniqueCount([...orders.map(row => getField(row, "assignedLine")), ...plans.map(row => getField(row, "assignedLine"))])), atRisk = toNumber(getField(summaryRow, "riskCount"), riskOrders.length || sum(metrics.map(row => getField(row, "dailyRisk")))), sequenceChanges = toNumber(getField(summaryRow, "sequenceChanges"), sum(metrics.map(row => getField(row, "dailySequenceChanges"))) || plans.filter(row => String(getField(row, "baselineSequence")) !== String(getField(row, "recommendedSequence"))).length), operatorRating = toNumber(getField(summaryRow, "operatorRating"), average(metrics.map(row => getField(row, "operatorRating"))));
  const start = getField(summaryRow, "startDate") || metrics.map(row => getValue(row, ["Date"])).filter(Boolean)[0] || orders.map(row => getField(row, "orderDate")).filter(Boolean)[0], metricDates = metrics.map(row => getValue(row, ["Date"])).filter(Boolean), orderDates = orders.map(row => getField(row, "dueDate")).filter(Boolean), end = getField(summaryRow, "endDate") || metricDates.at(-1) || orderDates.at(-1), notes = [...new Set(metrics.map(row => String(getField(row, "note") || "").trim()).filter(Boolean))].slice(0, 6), warnings = [];
  if (!orders.length) warnings.push("No order sheet was detected, so order-risk details are unavailable.");
  if (!metrics.length) warnings.push("No daily-metrics sheet was detected; planning, energy, peak and rating KPIs may be incomplete.");
  if (!plans.length) warnings.push("No production-plan sheet was detected. Recommendations shown are rules-based drafts from the order table.");
  if (!summaryRow || !Object.keys(summaryRow).length) warnings.push("No Pilot Summary row was detected. KPIs were calculated from the available operational tables.");
  const quality = [[orders.length ? "good" : "warn", `${orders.length || 0} order rows detected`], [metrics.length ? "good" : "warn", `${metrics.length || 0} daily metric rows detected`], [plans.length ? "good" : "warn", `${plans.length || 0} production plan rows detected`], [summaryRow && Object.keys(summaryRow).length ? "good" : "warn", summaryRow && Object.keys(summaryRow).length ? "Pilot summary detected" : "Summary calculated from raw sheets"]];
  return { id: String(getField(summaryRow, "pilotId") || `BW-UP-${Date.now().toString().slice(-7)}`), name: companyName, dates: dateRange(start, end), location: String(getField(summaryRow, "location") || "Location not supplied"), workflow: String(getField(summaryRow, "workflow") || "Order intake → stock and shortage review → risk prioritization → production sequence review"), cycles, orders: ordersProcessed, skus, lines, planningBefore, planningAfter, planningReduction, atRisk, sequenceChanges, baselineEnergy, optimizedEnergy, energyReduction, baselinePeak, optimizedPeak, peakReduction, operatorRating, team: String(getField(summaryRow, "people") || "Operational team details were not supplied in the uploaded file."), source: `Uploaded locally from ${fileName}`, badge: "Uploaded operational dataset · browser-calculated", planSource: plans.length ? "Workbook-derived" : "Rules-based draft", notes: notes.length ? notes : warnings, sampleOrders: orderRows.slice(0, 10).map(row => [row.orderId, row.product, row.duePriority, row.shortageRisk, row.recommendation]), samplePlans: buildPlanRows(plans, orderRows), quality, warnings, detectedSheets, uploaded: true, createdAt: new Date().toISOString() };
}

function parseWorkbook(workbook, fileName, suppliedName) {
  const summaryDetection = detectSheet(workbook, "summary"), summaryRows = summaryDetection.rows, detected = [];
  if (summaryDetection.name) detected.push([summaryDetection.name, "Pilot summary"]);
  const workspaces = [], pilotSummaryRows = summaryRows.filter(row => { const company = String(getField(row, "company") || "").trim(), pilotId = String(getField(row, "pilotId") || "").trim(), pilotType = String(getValue(row, ["Pilot Type"]) || "").trim(), ordersProcessed = toNumber(getField(row, "ordersProcessed"), 0); return company && (pilotId.startsWith("BW-") || /pilot/i.test(pilotType) || ordersProcessed > 0); }), rowsToProcess = pilotSummaryRows.length ? pilotSummaryRows : [{}];
  rowsToProcess.forEach((summaryRow, index) => {
    const companyName = String(getField(summaryRow, "company") || suppliedName || (rowsToProcess.length > 1 ? `${fileName.replace(/\.[^.]+$/, "")} ${index + 1}` : fileName.replace(/\.[^.]+$/, ""))), ordersDetection = detectSheet(workbook, "orders", companyName), metricsDetection = detectSheet(workbook, "metrics", companyName), planDetection = detectSheet(workbook, "plan", companyName), evidenceDetection = detectSheet(workbook, "evidence", companyName), localDetected = [];
    [[ordersDetection, "Orders"], [metricsDetection, "Daily metrics"], [planDetection, "Production plan"], [evidenceDetection, "Evidence checklist"]].forEach(([item, label]) => { if (item.name) localDetected.push([item.name, label]); });
    workspaces.push(calculateFromRows({ name: suppliedName || companyName, fileName, summaryRow, orders: ordersDetection.rows, metrics: metricsDetection.rows, plans: planDetection.rows, detectedSheets: [...detected, ...localDetected] }));
  });
  return workspaces;
}

function persistUploads() { localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(Object.entries(pilots).filter(([, pilot]) => pilot.uploaded)))); }
function restoreUploads() { try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); if (saved && typeof saved === "object") pilots = { ...pilots, ...saved }; } catch (error) { console.warn("Could not restore BatchWatt uploads", error); } }
function refreshSelector(preferredKey = "") { const selector = document.querySelector("#pilot-select"), current = preferredKey || selector.value; selector.innerHTML = Object.entries(pilots).map(([key, pilot]) => `<option value="${escapeHtml(key)}">${escapeHtml(pilot.name)}${pilot.uploaded ? " · uploaded" : ""}</option>`).join(""); selector.value = pilots[current] ? current : Object.keys(pilots)[0]; updatePortfolio(); }
function updatePortfolio() { const all = Object.values(pilots); document.querySelector("#portfolio-pilots").textContent = all.length; document.querySelector("#portfolio-cycles").textContent = Math.round(sum(all.map(pilot => pilot.cycles))); document.querySelector("#portfolio-orders").textContent = Math.round(sum(all.map(pilot => pilot.orders))); document.querySelector("#portfolio-risks").textContent = Math.round(sum(all.map(pilot => pilot.atRisk))); }
function renderRows(target, rows, emptyColumns) { const body = document.querySelector(target); if (!rows.length) { body.innerHTML = `<tr><td class="empty-row" colspan="${emptyColumns}">No matching rows were available in this workspace.</td></tr>`; return; } body.innerHTML = rows.map(row => `<tr>${row.map((cell, index) => `<td class="${index === row.length - 1 ? "result-good" : ""}">${index === 0 ? `<strong>${escapeHtml(cell)}</strong>` : escapeHtml(cell)}</td>`).join("")}</tr>`).join(""); }

function renderPilot(key) {
  const p = pilots[key]; if (!p) return;
  document.querySelector("#pilot-name").textContent = p.name; document.querySelector("#pilot-meta").textContent = `${p.id} · ${p.dates} · ${p.location}`; document.querySelector("#pilot-workflow").textContent = p.workflow; document.querySelector("#workspace-source").textContent = p.source; document.querySelector("#workspace-badge").textContent = p.badge; document.querySelector("#kpi-cycles").textContent = p.cycles || "—"; document.querySelector("#kpi-orders").textContent = p.orders || "—"; document.querySelector("#kpi-skus").textContent = p.skus || "—"; document.querySelector("#kpi-lines").textContent = p.lines || "—"; document.querySelector("#kpi-risk").textContent = p.atRisk || "0"; document.querySelector("#kpi-rating").textContent = p.operatorRating ? `${p.operatorRating.toFixed(2)}/5` : "—";
  document.querySelector("#planning-label").textContent = `${minutes(p.planningBefore)} → ${minutes(p.planningAfter)}`; document.querySelector("#planning-bar").style.width = `${Math.min(Math.max(p.planningReduction || 0, 0), 100)}%`; document.querySelector("#planning-value").textContent = pct(p.planningReduction); document.querySelector("#energy-label").textContent = `${fixed(p.baselineEnergy, 1, " kWh")} → ${fixed(p.optimizedEnergy, 1, " kWh")}`; document.querySelector("#energy-bar").style.width = `${Math.min(Math.max((p.energyReduction || 0) * 6, p.energyReduction ? 14 : 0), 100)}%`; document.querySelector("#energy-value").textContent = pct(p.energyReduction); document.querySelector("#peak-label").textContent = `${fixed(p.baselinePeak, 1, " kW")} → ${fixed(p.optimizedPeak, 1, " kW")}`; document.querySelector("#peak-bar").style.width = `${Math.min(Math.max((p.peakReduction || 0) * 5, p.peakReduction ? 14 : 0), 100)}%`; document.querySelector("#peak-value").textContent = pct(p.peakReduction); document.querySelector("#sequence-value").textContent = p.sequenceChanges ? `${p.sequenceChanges} changes recorded` : "No changes supplied"; document.querySelector("#team-text").textContent = p.team; document.querySelector("#operator-notes").innerHTML = (p.notes || []).map(note => `<li>${escapeHtml(note)}</li>`).join("") || "<li>No notes supplied.</li>"; document.querySelector("#plan-table-status").textContent = p.planSource; document.querySelector("#order-table-status").textContent = p.uploaded ? "Calculated from uploaded orders" : "Risk-prioritized"; renderRows("#order-rows", p.sampleOrders || [], 5); renderRows("#plan-rows", p.samplePlans || [], 4); document.querySelector("#data-quality").innerHTML = (p.quality || []).map(([type, text]) => `<span class="quality-chip ${escapeHtml(type)}">${escapeHtml(text)}</span>`).join("");
}

function renderEvidence() { document.querySelector("#evidence-list").innerHTML = evidence.map(item => `<li><div><b>${escapeHtml(item[0])}</b><br><small>${escapeHtml(item[1])}</small></div><span class="${item[2]}">${item[2] === "available" ? "AVAILABLE" : "PENDING"}</span></li>`).join(""); }
function renderUploadPreview(workspaces, fileName) { const preview = document.querySelector("#upload-preview"), first = workspaces[0]; preview.classList.remove("hidden"); document.querySelector("#preview-title").textContent = workspaces.length > 1 ? `${workspaces.length} workspaces detected in ${fileName}` : `${first.name} · ${fileName}`; document.querySelector("#preview-confidence").textContent = first.warnings.length ? "Review warnings" : "Ready to add"; const uniqueSheets = [...new Map(workspaces.flatMap(workspace => workspace.detectedSheets || []).map(item => [item[0], item])).values()]; document.querySelector("#detected-sheets").innerHTML = uniqueSheets.length ? uniqueSheets.map(([name, label]) => `<span class="sheet-chip good">${escapeHtml(label)} · ${escapeHtml(name)}</span>`).join("") : `<span class="sheet-chip warn">No standard BatchWatt sheet names detected</span>`; document.querySelector("#preview-summary").innerHTML = [["Workspaces", workspaces.length], ["Orders", Math.round(sum(workspaces.map(workspace => workspace.orders))) || "—"], ["Risks", Math.round(sum(workspaces.map(workspace => workspace.atRisk))) || "0"], ["Planning cycles", Math.round(sum(workspaces.map(workspace => workspace.cycles))) || "—"]].map(([label, value]) => `<div class="preview-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join(""); const warnings = [...new Set(workspaces.flatMap(workspace => workspace.warnings || []))]; document.querySelector("#preview-warnings").innerHTML = warnings.length ? warnings.map(warning => `<div class="warning-item">${escapeHtml(warning)}</div>`).join("") : `<div class="quality-chip good">The main BatchWatt operational tables were detected.</div>`; }

async function readSelectedFile() { if (!selectedFile) return; if (!window.XLSX) throw new Error("The Excel parser did not load. Refresh the page and try again."); const suppliedName = document.querySelector("#company-name").value.trim(), data = await selectedFile.arrayBuffer(), workbook = XLSX.read(data, { type: "array", cellDates: true }), workspaces = parseWorkbook(workbook, selectedFile.name, suppliedName); if (!workspaces.length) throw new Error("No usable operational rows were detected in this file."); parsedUpload = workspaces; renderUploadPreview(workspaces, selectedFile.name); return workspaces; }
function addParsedWorkspaces(workspaces) { let firstKey = ""; workspaces.forEach((workspace, index) => { const slug = normalize(workspace.name).replaceAll(" ", "-").replace(/[^a-z0-9-]/g, "").slice(0, 34) || `upload-${Date.now()}`; let key = `upload-${slug}`; while (pilots[key]) key = `${key}-${index + 1}-${Math.floor(Math.random() * 1000)}`; pilots[key] = workspace; if (!firstKey) firstKey = key; }); persistUploads(); refreshSelector(firstKey); renderPilot(firstKey); document.querySelector("#pilot-select").value = firstKey; document.querySelector("#operations").scrollIntoView({ behavior: "smooth", block: "start" }); }
function downloadActiveReport() { const key = document.querySelector("#pilot-select").value, pilot = pilots[key]; if (!pilot) return; const report = { generatedAt: new Date().toISOString(), product: "BatchWatt", workspace: pilot, claimBoundary: pilot.uploaded ? "Calculated locally from a user-selected file. External verification and company approval are not implied." : "Calculated from the supplied BatchWatt pilot workbook. External verification and publication approval remain separate." }, blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }), link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${normalize(pilot.name).replaceAll(" ", "-") || "batchwatt"}-operational-summary.json`; link.click(); URL.revokeObjectURL(link.href); }
function clearUploads() { Object.keys(pilots).filter(key => pilots[key].uploaded).forEach(key => delete pilots[key]); localStorage.removeItem(STORAGE_KEY); parsedUpload = null; selectedFile = null; document.querySelector("#file-input").value = ""; document.querySelector("#company-name").value = ""; document.querySelector("#process-file").disabled = true; document.querySelector("#upload-preview").classList.add("hidden"); setUploadStatus("Uploaded workspaces were cleared from this browser.", "good"); refreshSelector("rkg"); renderPilot("rkg"); }
function setUploadStatus(message, type = "") { const status = document.querySelector("#upload-status"); status.textContent = message; status.className = `upload-status${type ? ` ${type}` : ""}`; }
function chooseFile(file) { if (!file) return; const extension = file.name.split(".").pop().toLowerCase(); if (!["xlsx", "xls", "csv"].includes(extension)) { selectedFile = null; document.querySelector("#process-file").disabled = true; setUploadStatus("Choose an .xlsx, .xls or .csv file.", "error"); return; } selectedFile = file; parsedUpload = null; document.querySelector("#process-file").disabled = false; setUploadStatus(`${file.name} selected · ${(file.size / 1024).toFixed(1)} KB`, "good"); }

document.addEventListener("DOMContentLoaded", () => {
  restoreUploads(); refreshSelector("rkg"); renderEvidence(); renderPilot(document.querySelector("#pilot-select").value);
  const selector = document.querySelector("#pilot-select"); selector.addEventListener("change", event => renderPilot(event.target.value)); document.querySelector("#download-report").addEventListener("click", downloadActiveReport); document.querySelector("#clear-uploads").addEventListener("click", clearUploads);
  const fileInput = document.querySelector("#file-input"), dropZone = document.querySelector("#drop-zone"); dropZone.addEventListener("click", () => fileInput.click()); dropZone.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); fileInput.click(); } }); fileInput.addEventListener("change", event => chooseFile(event.target.files[0])); ["dragenter", "dragover"].forEach(type => dropZone.addEventListener(type, event => { event.preventDefault(); dropZone.classList.add("dragging"); })); ["dragleave", "drop"].forEach(type => dropZone.addEventListener(type, event => { event.preventDefault(); dropZone.classList.remove("dragging"); })); dropZone.addEventListener("drop", event => chooseFile(event.dataTransfer.files[0]));
  document.querySelector("#process-file").addEventListener("click", async () => { const button = document.querySelector("#process-file"); button.disabled = true; setUploadStatus("Reading workbook and calculating operational KPIs…"); try { const workspaces = parsedUpload || await readSelectedFile(); addParsedWorkspaces(workspaces); setUploadStatus(`${workspaces.length} operational workspace${workspaces.length === 1 ? "" : "s"} added to this browser.`, "good"); } catch (error) { console.error(error); setUploadStatus(error.message || "The file could not be processed.", "error"); } finally { button.disabled = !selectedFile; } });
  fileInput.addEventListener("change", async () => { if (!selectedFile) return; try { setUploadStatus("Inspecting file structure…"); const workspaces = await readSelectedFile(); setUploadStatus(`${workspaces.length} workspace${workspaces.length === 1 ? "" : "s"} detected. Review the preview, then process the data.`, "good"); } catch (error) { parsedUpload = null; setUploadStatus(error.message || "The file could not be inspected.", "error"); } });
});
