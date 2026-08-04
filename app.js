const STORAGE_KEY = "batchwatt_simple_workspaces_v1";

const baseWorkspaces = {
  rkg: {
    id: "BW-RKG-001",
    name: "RKG Ghee",
    dates: "Jul 7–20, 2026",
    location: "Tamil Nadu",
    badge: "Operational pilot record",
    source: "Workbook-derived pilot data",
    workflow: "Review urgent dispatches, reserve material, group compatible SKUs and avoid simultaneous high-load heating.",
    cycles: 10,
    ordersCount: 32,
    skus: 6,
    lines: 2,
    atRisk: 9,
    planningReduction: 64.2,
    energyReduction: 8.8,
    peakReduction: 11.7,
    sequenceChanges: 7,
    operatorRating: 4.34,
    orders: [
      { id: "RKG-ORD-023", customer: "Retail account 23", product: "Cow Ghee 200 ml", qty: 149, unit: "bottles", due: "Jul 9", priority: "High", stock: 0, shortage: 149, risk: true, action: "Advance batch and reserve bottles" },
      { id: "RKG-ORD-001", customer: "Retail account 01", product: "Bulk Ghee 5 litre", qty: 21, unit: "tins", due: "Jul 9", priority: "Standard", stock: 0, shortage: 21, risk: true, action: "Reserve material and move filling earlier" },
      { id: "RKG-ORD-029", customer: "Retail account 29", product: "Cow Ghee 1 litre", qty: 25, unit: "jars", due: "Jul 11", priority: "Standard", stock: 18, shortage: 7, risk: true, action: "Produce the 7-jar shortage after urgent orders" },
      { id: "RKG-ORD-031", customer: "Retail account 31", product: "Buffalo Ghee 500 ml", qty: 23, unit: "jars", due: "Jul 10", priority: "High", stock: 23, shortage: 0, risk: false, action: "Dispatch from stock" }
    ],
    plans: [
      { priority: 1, product: "Cow Ghee 200 ml", line: "Filling & Packing", recommendation: "Run first; reserve bottles and confirm dispatch time", status: "Accepted with timing adjustment" },
      { priority: 2, product: "Bulk Ghee 5 litre", line: "Heating / Filling", recommendation: "Stagger heating and filling to avoid the peak window", status: "Reviewed; adjusted" },
      { priority: 3, product: "Cow Ghee 1 litre", line: "Heating & Filtration", recommendation: "Group with the same cleaning family to reduce changeover", status: "Accepted and executed" }
    ]
  },
  pr: {
    id: "BW-PRF-001",
    name: "PR Food Products",
    dates: "Jul 14–25, 2026",
    location: "Tamil Nadu",
    badge: "Operational pilot record",
    source: "Workbook-derived pilot data",
    workflow: "Consolidate orders, check material, assign machines, group compatible products and confirm urgent dispatches.",
    cycles: 9,
    ordersCount: 41,
    skus: 8,
    lines: 3,
    atRisk: 7,
    planningReduction: 62.3,
    energyReduction: 6.7,
    peakReduction: 9.0,
    sequenceChanges: 7,
    operatorRating: 4.26,
    orders: [
      { id: "PRF-ORD-040", customer: "Distributor 40", product: "Idli/Dosa Mix 500 g", qty: 85, unit: "packs", due: "Jul 17", priority: "Urgent", stock: 0, shortage: 85, risk: true, action: "Advance blending and reserve packing capacity" },
      { id: "PRF-ORD-011", customer: "Retail account 11", product: "Sambar Powder 200 g", qty: 10, unit: "packs", due: "Jul 18", priority: "Urgent", stock: 0, shortage: 10, risk: true, action: "Add to the first packing window" },
      { id: "PRF-ORD-023", customer: "Distributor 23", product: "Snack Mix 250 g", qty: 49, unit: "packs", due: "Jul 17", priority: "Standard", stock: 34, shortage: 15, risk: true, action: "Use available stock and produce the remaining 15 packs" },
      { id: "PRF-ORD-001", customer: "Retail account 01", product: "Sambar Powder 200 g", qty: 94, unit: "packs", due: "Jul 15", priority: "High", stock: 94, shortage: 0, risk: false, action: "Dispatch from stock" }
    ],
    plans: [
      { priority: 1, product: "Idli/Dosa Mix 500 g", line: "Blending", recommendation: "Run first and protect the urgent dispatch", status: "Accepted and executed" },
      { priority: 2, product: "Sambar Powder 200 g", line: "Packing", recommendation: "Reserve the first packing slot", status: "Accepted" },
      { priority: 3, product: "Snack Mix 250 g", line: "Roasting / Cooking", recommendation: "Use available material before replenishment", status: "Accepted" }
    ]
  }
};

let workspaces = { ...baseWorkspaces };
let selectedFile = null;
let activeKey = "rkg";

const $ = (id) => document.getElementById(id);
const normalize = (value) => String(value ?? "").trim().toLowerCase().replace(/[\s_]+/g, " ").replace(/[^a-z0-9 /()&-]/g, "");
const number = (value, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? "").replace(/[,%₹$]/g, "").trim());
  return Number.isFinite(parsed) ? parsed : fallback;
};
const percent = (value) => {
  const n = number(value, 0);
  return n !== 0 && Math.abs(n) <= 1 ? n * 100 : n;
};
const average = (values) => {
  const nums = values.map((value) => number(value, NaN)).filter(Number.isFinite);
  return nums.length ? nums.reduce((total, value) => total + value, 0) / nums.length : 0;
};
const total = (values) => values.reduce((sum, value) => sum + number(value, 0), 0);
const maximum = (values) => {
  const nums = values.map((value) => number(value, NaN)).filter(Number.isFinite);
  return nums.length ? Math.max(...nums) : 0;
};
const uniqueCount = (values) => new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean)).size;
const escapeHtml = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const pct = (value) => Number.isFinite(value) && value !== 0 ? `${value.toFixed(1)}%` : "—";

function saveUploads() {
  const uploaded = Object.fromEntries(Object.entries(workspaces).filter(([, workspace]) => workspace.uploaded));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(uploaded));
}

function restoreUploads() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (saved && typeof saved === "object") workspaces = { ...workspaces, ...saved };
  } catch (error) {
    console.warn("Could not restore uploaded BatchWatt workspaces", error);
  }
}

function refreshWorkspaceSelector(preferredKey = activeKey) {
  const select = $("workspace-select");
  select.innerHTML = Object.entries(workspaces).map(([key, workspace]) => `<option value="${escapeHtml(key)}">${escapeHtml(workspace.name)}${workspace.uploaded ? " · uploaded" : ""}</option>`).join("");
  activeKey = workspaces[preferredKey] ? preferredKey : Object.keys(workspaces)[0];
  select.value = activeKey;
}

function riskRank(order) {
  const priority = normalize(order.priority);
  return (order.risk ? 0 : 10) + (priority.includes("urgent") ? 0 : priority.includes("high") ? 1 : 2) - Math.min(number(order.shortage, 0) / 1000, 0.9);
}

function topAction(workspace) {
  const firstRisk = [...(workspace.orders || [])].sort((a, b) => riskRank(a) - riskRank(b))[0];
  if (!firstRisk) return "No order data is available. Upload or paste new orders.";
  if (!firstRisk.risk) return `Dispatch ${firstRisk.product} from available stock.`;
  return `${firstRisk.action}.`;
}

function renderOrders(workspace) {
  const rows = [...(workspace.orders || [])].sort((a, b) => riskRank(a) - riskRank(b));
  $("order-rows").innerHTML = rows.length ? rows.map((order) => `
    <tr>
      <td><strong>${escapeHtml(order.id)}</strong></td>
      <td>${escapeHtml(order.customer || "—")}</td>
      <td>${escapeHtml(order.product)}</td>
      <td>${escapeHtml(order.due || "—")} · ${escapeHtml(order.priority || "Standard")}</td>
      <td class="${order.risk ? "risk" : "ok"}">${order.shortage ? `${escapeHtml(order.shortage)} ${escapeHtml(order.unit || "units")} short` : "Ready from stock"}</td>
      <td>${escapeHtml(order.action || "Supervisor review")}</td>
    </tr>`).join("") : '<tr><td class="empty-row" colspan="6">No order records are available.</td></tr>';
}

function renderPlans(workspace) {
  const plans = workspace.plans || [];
  $("plan-rows").innerHTML = plans.length ? plans.map((plan, index) => `
    <tr>
      <td><strong>${escapeHtml(plan.priority || index + 1)}</strong></td>
      <td>${escapeHtml(plan.product)}</td>
      <td>${escapeHtml(plan.line || "Supervisor assignment")}</td>
      <td>${escapeHtml(plan.recommendation)}</td>
      <td>${escapeHtml(plan.status || "Review required")}</td>
    </tr>`).join("") : '<tr><td class="empty-row" colspan="5">No production recommendations are available.</td></tr>';
}

function createWhatsAppMessage(workspace) {
  const orders = [...(workspace.orders || [])].sort((a, b) => riskRank(a) - riskRank(b));
  const risks = orders.filter((order) => order.risk);
  const lines = [
    `*BATCHWATT PRODUCTION PLAN*`,
    `${workspace.name} · ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
    "",
    `Orders reviewed: ${workspace.ordersCount ?? orders.length}`,
    `Orders at risk: ${workspace.atRisk ?? risks.length}`,
    "",
    "*Run order*"
  ];

  if (!orders.length) {
    lines.push("No order data is available.");
  } else {
    orders.slice(0, 6).forEach((order, index) => {
      const tag = order.risk ? "⚠️" : "✅";
      const quantity = order.shortage ? `produce ${order.shortage} ${order.unit || "units"}` : "dispatch from stock";
      lines.push(`${index + 1}. ${tag} *${order.product}* — ${quantity}; ${order.action || "supervisor review"}. Due: ${order.due || "not supplied"}.`);
    });
  }

  lines.push("", "*Supervisor checks*", "• Confirm raw material and packaging.", "• Confirm line availability and final timing.", "• Approve the sequence before production release.");
  if (workspace.energyReduction) lines.push(`• Estimated energy reduction: ${pct(workspace.energyReduction)}; validate against meter data.`);
  return lines.join("\n");
}

function updateWhatsAppOutput(workspace) {
  const message = createWhatsAppMessage(workspace);
  $("whatsapp-output").value = message;
  const link = $("open-whatsapp");
  link.href = `https://wa.me/?text=${encodeURIComponent(message)}`;
  link.classList.remove("disabled");
}

function renderWorkspace(key) {
  const workspace = workspaces[key];
  if (!workspace) return;
  activeKey = key;
  $("workspace-name").textContent = workspace.name;
  $("workspace-meta").textContent = `${workspace.id || "Workspace"} · ${workspace.dates || "Dates not supplied"} · ${workspace.location || "Location not supplied"}`;
  $("workspace-badge").textContent = workspace.badge || (workspace.uploaded ? "Uploaded browser workspace" : "Operational pilot record");
  $("workspace-workflow").textContent = workspace.workflow || "Review dispatch risk and confirm the production sequence.";
  $("next-action").textContent = topAction(workspace);
  $("kpi-orders").textContent = workspace.ordersCount ?? (workspace.orders || []).length;
  $("kpi-risk").textContent = workspace.atRisk ?? (workspace.orders || []).filter((order) => order.risk).length;
  $("kpi-skus").textContent = workspace.skus ?? uniqueCount((workspace.orders || []).map((order) => order.product));
  $("kpi-planning").textContent = pct(workspace.planningReduction);
  $("kpi-energy").textContent = pct(workspace.energyReduction);
  $("kpi-peak").textContent = pct(workspace.peakReduction);
  $("detail-cycles").textContent = workspace.cycles || "—";
  $("detail-lines").textContent = workspace.lines || "—";
  $("detail-sequences").textContent = workspace.sequenceChanges || "—";
  $("detail-rating").textContent = workspace.operatorRating ? `${number(workspace.operatorRating).toFixed(2)}/5` : "—";
  $("order-source").textContent = workspace.source || "Operational records";
  $("plan-source").textContent = workspace.planSource || (workspace.uploaded ? "Calculated / workbook-derived" : "Pilot workbook recommendations");
  renderOrders(workspace);
  renderPlans(workspace);
  updateWhatsAppOutput(workspace);
}

function parseDue(text) {
  const lower = normalize(text);
  if (lower.includes("tomorrow")) return "Tomorrow";
  if (lower.includes("today")) return "Today";
  const match = text.match(/(?:due|by)\s+([^,|]+)/i);
  return match ? match[1].trim() : "Not supplied";
}

function parseMessageLine(line, index) {
  const clean = line.trim();
  if (!clean) return null;
  const separators = clean.includes("|") ? clean.split("|") : clean.includes(";") ? clean.split(";") : null;
  let customer = "WhatsApp customer";
  let product = "Unspecified product";
  let qty = 0;
  let due = parseDue(clean);
  let priority = /urgent/i.test(clean) ? "Urgent" : /high/i.test(clean) ? "High" : "Standard";
  let stock = 0;
  let unit = "units";

  if (separators && separators.length >= 3) {
    customer = separators[0].trim() || customer;
    product = separators[1].trim() || product;
    qty = number(separators[2], 0);
    due = (separators[3] || due).trim() || due;
    priority = (separators[4] || priority).trim() || priority;
    stock = number((separators[5] || "").replace(/stock/i, ""), 0);
  } else {
    const customerMatch = clean.match(/^(.+?)(?:\s+needs|\s+wants|\s+ordered|\s*:\s*)/i);
    if (customerMatch) customer = customerMatch[1].trim();
    const qtyMatch = clean.match(/(\d+(?:\.\d+)?)\s*(kg|packs?|bottles?|jars?|tins?|boxes?|cartons?|units?|pcs?)?/i);
    if (qtyMatch) {
      qty = number(qtyMatch[1], 0);
      unit = qtyMatch[2] || unit;
    }
    const stockMatch = clean.match(/stock\s*(?:is|:)?\s*(\d+(?:\.\d+)?)/i);
    if (stockMatch) stock = number(stockMatch[1], 0);
    const productMatch = clean.match(/(?:needs|wants|ordered)\s+(?:\d+(?:\.\d+)?\s*(?:kg|packs?|bottles?|jars?|tins?|boxes?|cartons?|units?|pcs?)?\s*(?:of\s+)?)?(.+?)(?:\s+(?:by|due|today|tomorrow|urgent|high|stock)\b|,|$)/i);
    if (productMatch) product = productMatch[1].trim();
  }

  const shortage = Math.max(qty - stock, 0);
  const risk = shortage > 0 || /urgent|high/i.test(priority) || /at risk|late/i.test(clean);
  const action = shortage > 0
    ? (/urgent|high/i.test(priority) ? `Produce ${shortage} ${unit} first and reserve material` : `Schedule ${shortage} ${unit} before the due date`)
    : "Dispatch from available stock";

  return {
    id: `WA-${String(index + 1).padStart(3, "0")}`,
    customer,
    product,
    qty,
    unit,
    due,
    priority,
    stock,
    shortage,
    risk,
    action
  };
}

function createPlansFromOrders(orders) {
  return [...orders].sort((a, b) => riskRank(a) - riskRank(b)).slice(0, 8).map((order, index) => ({
    priority: index + 1,
    product: order.product,
    line: "Supervisor assignment",
    recommendation: order.action,
    status: "Draft from WhatsApp input · review required"
  }));
}

function processWhatsAppOrders() {
  const text = $("whatsapp-input").value.trim();
  const factoryName = $("whatsapp-factory").value.trim() || "WhatsApp intake";
  if (!text) {
    $("whatsapp-status").textContent = "Paste at least one order before generating the plan.";
    $("whatsapp-status").className = "status-line error";
    return;
  }

  const orders = text.split(/\n+/).map(parseMessageLine).filter(Boolean);
  if (!orders.length || orders.every((order) => !order.product || !order.qty)) {
    $("whatsapp-status").textContent = "The messages could not be read. Use: Customer | Product | Quantity | Due | Priority | Stock.";
    $("whatsapp-status").className = "status-line error";
    return;
  }

  const key = `whatsapp-${Date.now()}`;
  const workspace = {
    id: `BW-WA-${String(Date.now()).slice(-6)}`,
    name: factoryName,
    dates: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    location: "WhatsApp browser intake",
    badge: "WhatsApp intake · supervisor review required",
    source: "Pasted WhatsApp messages",
    planSource: "Rules-based draft from WhatsApp input",
    workflow: "Parse incoming orders, calculate shortages, rank dispatch risk and return a copy-ready production message.",
    cycles: 1,
    ordersCount: orders.length,
    skus: uniqueCount(orders.map((order) => order.product)),
    lines: 0,
    atRisk: orders.filter((order) => order.risk).length,
    planningReduction: 0,
    energyReduction: 0,
    peakReduction: 0,
    sequenceChanges: orders.filter((order) => order.risk).length,
    operatorRating: 0,
    orders,
    plans: createPlansFromOrders(orders),
    uploaded: true,
    intakeType: "whatsapp"
  };

  workspaces[key] = workspace;
  saveUploads();
  refreshWorkspaceSelector(key);
  renderWorkspace(key);
  $("whatsapp-status").textContent = `${orders.length} orders processed; ${workspace.atRisk} require attention. The workspace was added to the selector.`;
  $("whatsapp-status").className = "status-line success";
  document.querySelector("#workspace").scrollIntoView({ behavior: "smooth" });
}

function sheetRows(workbook, sheetName) {
  if (!sheetName || !workbook.Sheets[sheetName]) return [];
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "", raw: true });
}

function findSheetName(workbook, terms) {
  const names = workbook.SheetNames;
  return names.find((name) => terms.some((term) => normalize(name).includes(term))) || "";
}

function getField(row, aliases) {
  const normalized = Object.fromEntries(Object.entries(row || {}).map(([key, value]) => [normalize(key), value]));
  for (const alias of aliases) {
    const key = normalize(alias);
    if (Object.prototype.hasOwnProperty.call(normalized, key)) return normalized[key];
  }
  return "";
}

const aliases = {
  company: ["company", "factory", "pilot name"],
  pilotId: ["pilot id", "id"],
  start: ["start date", "pilot start"],
  end: ["end date", "pilot end"],
  location: ["location", "factory / location"],
  cycles: ["planning cycles", "cycles"],
  orders: ["orders processed", "orders"],
  skus: ["skus covered", "skus"],
  lines: ["machines / lines", "machines / stages", "machines", "lines", "production stages"],
  planningBefore: ["avg planning time before (min)", "planning time before (min)", "planning time before"],
  planningAfter: ["avg planning time with batchwatt (min)", "planning time with batchwatt (min)", "planning time after", "planning time with batchwatt"],
  planningReduction: ["planning time reduction", "planning reduction"],
  risk: ["orders / dispatches flagged at risk", "orders flagged at risk", "orders at risk", "risk count"],
  sequences: ["production sequencing changes", "sequence changes"],
  baselineEnergy: ["baseline energy (kwh)", "baseline energy"],
  optimizedEnergy: ["optimized energy (kwh)", "optimized energy"],
  energyReduction: ["estimated energy reduction", "energy reduction"],
  baselinePeak: ["baseline peak (kw)", "baseline peak"],
  optimizedPeak: ["optimized peak (kw)", "optimized peak"],
  peakReduction: ["peak-load reduction", "peak load reduction"],
  rating: ["avg operator rating", "operator rating", "operator rating (1–5)"],
  orderId: ["order id", "order number", "order"],
  customer: ["customer (anonymized)", "customer", "account"],
  product: ["product", "product name", "item", "sku"],
  qty: ["order qty", "order quantity", "quantity", "qty"],
  unit: ["unit", "uom"],
  due: ["due date", "dispatch date", "required date"],
  priority: ["priority"],
  stock: ["opening finished-goods stock", "finished goods stock", "opening stock", "available stock", "stock"],
  shortage: ["shortage qty", "shortage", "short quantity"],
  line: ["assigned line", "line / machine", "line", "machine"],
  riskStatus: ["initial risk", "risk", "risk status"],
  recommendation: ["batchwatt recommendation", "recommendation", "recommended action", "reason for recommendation"],
  status: ["team response", "factory response", "execution status", "status"],
  metricCycle: ["planning cycle", "cycle"],
  metricPlanningBefore: ["planning time before (min)", "planning time before"],
  metricPlanningAfter: ["planning time with batchwatt (min)", "planning time with batchwatt", "planning time after"],
  metricBaselineEnergy: ["baseline energy (kwh)", "baseline energy"],
  metricOptimizedEnergy: ["optimized energy (kwh)", "optimized energy"],
  metricBaselinePeak: ["baseline peak (kw)", "baseline peak"],
  metricOptimizedPeak: ["optimized peak (kw)", "optimized peak"],
  metricRisk: ["orders at risk", "risk count"],
  metricSequence: ["sequence changes"],
  metricRating: ["operator rating", "operator rating (1–5)"]
};

function formatDateValue(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (typeof value === "number" && window.XLSX?.SSF) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function workbookToWorkspace(workbook, fileName, overrideName) {
  const summaryName = findSheetName(workbook, ["summary"]);
  const ordersName = findSheetName(workbook, ["order"]);
  const metricsName = findSheetName(workbook, ["metric"]);
  const planName = findSheetName(workbook, ["production plan", "recommendation", "plan"]);
  const summary = sheetRows(workbook, summaryName)[0] || {};
  const orderRows = sheetRows(workbook, ordersName || workbook.SheetNames[0]);
  const metricRows = sheetRows(workbook, metricsName);
  const planRows = sheetRows(workbook, planName);

  const orders = orderRows.map((row, index) => {
    const qty = number(getField(row, aliases.qty), 0);
    const stock = number(getField(row, aliases.stock), 0);
    const explicitShortage = number(getField(row, aliases.shortage), NaN);
    const shortage = Number.isFinite(explicitShortage) ? explicitShortage : Math.max(qty - stock, 0);
    const priority = String(getField(row, aliases.priority) || "Standard");
    const recordedRisk = String(getField(row, aliases.riskStatus) || "");
    const risk = shortage > 0 || /urgent|high|risk|late/i.test(`${priority} ${recordedRisk}`);
    const unit = String(getField(row, aliases.unit) || "units");
    const action = String(getField(row, aliases.recommendation) || (shortage > 0 ? `Produce ${shortage} ${unit} before the due date` : "Dispatch from available stock"));
    return {
      id: String(getField(row, aliases.orderId) || `ORD-${index + 1}`),
      customer: String(getField(row, aliases.customer) || "Customer not supplied"),
      product: String(getField(row, aliases.product) || "Unspecified product"),
      qty,
      unit,
      due: formatDateValue(getField(row, aliases.due)) || "Not supplied",
      priority,
      stock,
      shortage,
      risk,
      action
    };
  }).filter((order) => order.product !== "Unspecified product" || order.qty > 0);

  const plans = planRows.length ? planRows.slice(0, 12).map((row, index) => ({
    priority: index + 1,
    product: String(getField(row, aliases.product) || "Unspecified product"),
    line: String(getField(row, aliases.line) || "Supervisor assignment"),
    recommendation: String(getField(row, aliases.recommendation) || "Review production sequence"),
    status: String(getField(row, aliases.status) || "Review required")
  })) : createPlansFromOrders(orders);

  const planningBefore = number(getField(summary, aliases.planningBefore), average(metricRows.map((row) => getField(row, aliases.metricPlanningBefore))));
  const planningAfter = number(getField(summary, aliases.planningAfter), average(metricRows.map((row) => getField(row, aliases.metricPlanningAfter))));
  const baselineEnergy = number(getField(summary, aliases.baselineEnergy), total(metricRows.map((row) => getField(row, aliases.metricBaselineEnergy))));
  const optimizedEnergy = number(getField(summary, aliases.optimizedEnergy), total(metricRows.map((row) => getField(row, aliases.metricOptimizedEnergy))));
  const baselinePeak = number(getField(summary, aliases.baselinePeak), maximum(metricRows.map((row) => getField(row, aliases.metricBaselinePeak))));
  const optimizedPeak = number(getField(summary, aliases.optimizedPeak), maximum(metricRows.map((row) => getField(row, aliases.metricOptimizedPeak))));

  const name = overrideName || String(getField(summary, aliases.company) || fileName.replace(/\.[^.]+$/, ""));
  const start = formatDateValue(getField(summary, aliases.start));
  const end = formatDateValue(getField(summary, aliases.end));

  return {
    id: String(getField(summary, aliases.pilotId) || `BW-UP-${String(Date.now()).slice(-6)}`),
    name,
    dates: start || end ? `${start || "Start not supplied"}${end ? ` – ${end}` : ""}` : "Dates not supplied",
    location: String(getField(summary, aliases.location) || "Location not supplied"),
    badge: "Uploaded browser workspace",
    source: `Uploaded locally from ${fileName}`,
    planSource: planRows.length ? "Workbook-derived recommendations" : "Rules-based draft from order data",
    workflow: "Review order shortages, rank dispatch risk, confirm line assignment and release the approved sequence.",
    cycles: number(getField(summary, aliases.cycles), uniqueCount(metricRows.map((row) => getField(row, aliases.metricCycle))) || metricRows.length || 1),
    ordersCount: number(getField(summary, aliases.orders), orders.length),
    skus: number(getField(summary, aliases.skus), uniqueCount(orders.map((order) => order.product))),
    lines: number(getField(summary, aliases.lines), uniqueCount(plans.map((plan) => plan.line))),
    atRisk: number(getField(summary, aliases.risk), orders.filter((order) => order.risk).length || total(metricRows.map((row) => getField(row, aliases.metricRisk)))),
    planningReduction: percent(getField(summary, aliases.planningReduction)) || (planningBefore > 0 ? ((planningBefore - planningAfter) / planningBefore) * 100 : 0),
    energyReduction: percent(getField(summary, aliases.energyReduction)) || (baselineEnergy > 0 ? ((baselineEnergy - optimizedEnergy) / baselineEnergy) * 100 : 0),
    peakReduction: percent(getField(summary, aliases.peakReduction)) || (baselinePeak > 0 ? ((baselinePeak - optimizedPeak) / baselinePeak) * 100 : 0),
    sequenceChanges: number(getField(summary, aliases.sequences), total(metricRows.map((row) => getField(row, aliases.metricSequence))) || plans.length),
    operatorRating: number(getField(summary, aliases.rating), average(metricRows.map((row) => getField(row, aliases.metricRating)))),
    orders,
    plans,
    uploaded: true,
    intakeType: "file"
  };
}

async function processSelectedFile() {
  if (!selectedFile) return;
  $("upload-status").textContent = "Reading the file…";
  $("upload-status").className = "status-line";
  try {
    const buffer = await selectedFile.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    const workspace = workbookToWorkspace(workbook, selectedFile.name, $("upload-factory").value.trim());
    if (!workspace.orders.length && !workspace.plans.length) throw new Error("No usable order or production-plan rows were found.");
    const key = `upload-${Date.now()}`;
    workspaces[key] = workspace;
    saveUploads();
    refreshWorkspaceSelector(key);
    renderWorkspace(key);
    $("upload-status").textContent = `${workspace.ordersCount} orders loaded. The new workspace is ready.`;
    $("upload-status").className = "status-line success";
    document.querySelector("#workspace").scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    $("upload-status").textContent = `Could not process the file: ${error.message}`;
    $("upload-status").className = "status-line error";
  }
}

function downloadSummary() {
  const workspace = workspaces[activeKey];
  if (!workspace) return;
  const payload = {
    ...workspace,
    generatedAt: new Date().toISOString(),
    whatsappOutput: createWhatsAppMessage(workspace)
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${workspace.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "batchwatt"}-summary.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function clearUploads() {
  Object.keys(workspaces).forEach((key) => { if (workspaces[key].uploaded) delete workspaces[key]; });
  localStorage.removeItem(STORAGE_KEY);
  refreshWorkspaceSelector("rkg");
  renderWorkspace("rkg");
  $("upload-status").textContent = "Uploaded and WhatsApp-created workspaces were cleared from this browser.";
  $("upload-status").className = "status-line success";
}

function bindEvents() {
  $("workspace-select").addEventListener("change", (event) => renderWorkspace(event.target.value));
  $("download-summary").addEventListener("click", downloadSummary);
  $("sample-whatsapp").addEventListener("click", () => {
    $("whatsapp-factory").value = "New factory intake";
    $("whatsapp-input").value = "Ravi Stores | Cow Ghee 1 L | 40 | tomorrow | high | stock 10\nAnand Mart | Sambar Powder 200 g | 25 | Friday | urgent | stock 5\nCity Retail | Snack Mix 250 g | 18 | next Monday | standard | stock 18";
  });
  $("process-whatsapp").addEventListener("click", processWhatsAppOrders);
  $("copy-whatsapp").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($("whatsapp-output").value);
      $("copy-whatsapp").textContent = "Copied";
      setTimeout(() => { $("copy-whatsapp").textContent = "Copy message"; }, 1400);
    } catch {
      $("whatsapp-output").select();
      document.execCommand("copy");
    }
  });

  const dropZone = $("drop-zone");
  const fileInput = $("file-input");
  const chooseFile = () => fileInput.click();
  dropZone.addEventListener("click", chooseFile);
  dropZone.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") chooseFile(); });
  ["dragenter", "dragover"].forEach((type) => dropZone.addEventListener(type, (event) => { event.preventDefault(); dropZone.classList.add("dragging"); }));
  ["dragleave", "drop"].forEach((type) => dropZone.addEventListener(type, (event) => { event.preventDefault(); dropZone.classList.remove("dragging"); }));
  dropZone.addEventListener("drop", (event) => {
    selectedFile = event.dataTransfer.files[0] || null;
    $("process-file").disabled = !selectedFile;
    $("upload-status").textContent = selectedFile ? `${selectedFile.name} selected.` : "No file selected.";
  });
  fileInput.addEventListener("change", () => {
    selectedFile = fileInput.files[0] || null;
    $("process-file").disabled = !selectedFile;
    $("upload-status").textContent = selectedFile ? `${selectedFile.name} selected.` : "No file selected.";
  });
  $("process-file").addEventListener("click", processSelectedFile);
  $("clear-uploads").addEventListener("click", clearUploads);
}

document.addEventListener("DOMContentLoaded", () => {
  restoreUploads();
  refreshWorkspaceSelector("rkg");
  bindEvents();
  renderWorkspace("rkg");
});
