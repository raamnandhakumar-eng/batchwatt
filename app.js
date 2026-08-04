const pilots = {
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
    samplePlans: [
      ["Bulk Ghee 5 litre", "Filling & Packing", "Avoid simultaneous high-load heating", "Reviewed; adjusted"],
      ["Cow Ghee 1 litre", "Heating & Filtration", "Reduce changeover and idle time", "Accepted and executed"],
      ["Cow Ghee 100 ml", "Filling & Packing", "Use available material before replenishment", "Accepted and executed"],
      ["Buffalo Ghee 500 ml", "Heating & Filtration", "Group same cleaning family", "Accepted"],
      ["Cow Ghee 200 ml", "Filling & Packing", "Prioritize near-due order", "Accepted with timing adjustment"]
    ],
    notes: [
      "High-load equipment shifted outside the peak window.",
      "Material shortage surfaced before line start.",
      "Similar SKUs were grouped to reduce cleaning and changeover.",
      "Urgent dispatch recommendations were adjusted after supervisor review."
    ]
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
    samplePlans: [
      ["Snack Mix 250 g", "Roasting / Cooking", "Use available material before replenishment", "Accepted"],
      ["Ready Rice Mix 1 kg", "Packing", "Group same cleaning family", "Accepted with timing adjustment"],
      ["Idli/Dosa Mix 500 g", "Blending", "Reduce changeover and idle time", "Accepted and executed"],
      ["Idli/Dosa Mix 200 g", "Roasting / Cooking", "Use available material before replenishment", "Accepted and executed"],
      ["Rice Flour 1 kg", "Packing", "Prioritize near-due order", "Reviewed; adjusted"]
    ],
    notes: [
      "High-load equipment shifted outside the peak window.",
      "Similar SKUs were grouped to reduce cleaning and changeover.",
      "Recommendations were adjusted for urgent dispatches.",
      "Material checks were completed before machine allocation."
    ]
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

function pct(value) {
  return `${value.toFixed(1)}%`;
}

function minutes(value) {
  return `${value.toFixed(1)} min`;
}

function renderPilot(key) {
  const p = pilots[key];
  document.querySelector("#pilot-name").textContent = p.name;
  document.querySelector("#pilot-meta").textContent = `${p.id} · ${p.dates} · ${p.location}`;
  document.querySelector("#pilot-workflow").textContent = p.workflow;
  document.querySelector("#kpi-cycles").textContent = p.cycles;
  document.querySelector("#kpi-orders").textContent = p.orders;
  document.querySelector("#kpi-skus").textContent = p.skus;
  document.querySelector("#kpi-lines").textContent = p.lines;
  document.querySelector("#kpi-risk").textContent = p.atRisk;
  document.querySelector("#kpi-rating").textContent = `${p.operatorRating.toFixed(2)}/5`;

  document.querySelector("#planning-label").textContent = `${minutes(p.planningBefore)} → ${minutes(p.planningAfter)}`;
  document.querySelector("#planning-bar").style.width = `${p.planningReduction}%`;
  document.querySelector("#planning-value").textContent = pct(p.planningReduction);

  document.querySelector("#energy-label").textContent = `${p.baselineEnergy.toFixed(1)} → ${p.optimizedEnergy.toFixed(1)} kWh`;
  document.querySelector("#energy-bar").style.width = `${Math.max(p.energyReduction * 6, 16)}%`;
  document.querySelector("#energy-value").textContent = pct(p.energyReduction);

  document.querySelector("#peak-label").textContent = `${p.baselinePeak.toFixed(1)} → ${p.optimizedPeak.toFixed(1)} kW`;
  document.querySelector("#peak-bar").style.width = `${Math.max(p.peakReduction * 5, 16)}%`;
  document.querySelector("#peak-value").textContent = pct(p.peakReduction);

  document.querySelector("#sequence-value").textContent = `${p.sequenceChanges} changes recorded`;
  document.querySelector("#team-text").textContent = p.team;
  document.querySelector("#operator-notes").innerHTML = p.notes.map(note => `<li>${note}</li>`).join("");
  document.querySelector("#plan-rows").innerHTML = p.samplePlans.map(row => `
    <tr>
      <td><strong>${row[0]}</strong></td>
      <td>${row[1]}</td>
      <td>${row[2]}</td>
      <td class="result-good">${row[3]}</td>
    </tr>`).join("");
}

function renderEvidence() {
  document.querySelector("#evidence-list").innerHTML = evidence.map(item => `
    <li>
      <div><b>${item[0]}</b><br><small>${item[1]}</small></div>
      <span class="${item[2]}">${item[2] === "available" ? "AVAILABLE" : "PENDING"}</span>
    </li>`).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  const selector = document.querySelector("#pilot-select");
  selector.addEventListener("change", event => renderPilot(event.target.value));
  renderEvidence();
  renderPilot(selector.value);
});
