# BatchWatt

**Simple daily factory operations: know what to do next.**

BatchWatt turns customer orders, inventory, production capacity, purchasing needs, and electricity constraints into a practical shift plan for small manufacturers.

**[Open BatchWatt](https://batchwatt-git-improve-business-flow-usd-whatsapp-ciel5.vercel.app)**

## Try it in 2 minutes

1. Open one of the two working demos on the **Today** screen.
2. Change an order, material position, or energy input and watch the plan recalculate.
3. Open **Dashboard** to see order health, production, procurement, energy, release status, and operating risks in one view.
4. Review **What to produce and when**. BatchWatt protects supplied due times first, then avoids peak-limit breaches and chooses the lowest modeled electricity + conditional demand-charge cost among feasible schedules.
5. Release the shift when hard blockers are cleared, then export the operating plan or dashboard.

## The app is built around five screens

- **Today** — one recommended next action, today’s production runs, visible energy controls, issues, demos, and shift release.
- **Dashboard** — integrated management view of order health, production, procurement, energy, release readiness, source coverage, and top risks.
- **Orders** — customer demand and dispatch status, with manual, pasted, Excel, and CSV intake.
- **Buying** — materials to replenish, purchase orders, and receipts.
- **More** — energy check, shift settings, workspace tools, and the detailed planner.

## What to produce and when

For each production order, BatchWatt now shows the recommended start/end time, line, quantity, customer due time, priority, changeover time, modeled run-energy cost, whether the job was shifted versus the baseline schedule, and the reason for the recommendation.

The scheduling objective is deliberately ordered:

1. Protect supplied order due times.
2. Avoid peak-demand target breaches.
3. Minimize modeled electricity and conditional demand-charge cost.
4. Use finished stock before scheduling new production.
5. Keep material shortages and replenishment cost visible.
6. Include line changeover time in the schedule.

BatchWatt also reports usage-cost change, conditional demand saving, peak reduction, and the number of jobs shifted. Demand savings are conditional on the compared schedules setting the final monthly peak; the tool does not present them as guaranteed bill savings.

## Two working demos

- **RKG Ghee — peak-load + dispatch pressure.** A complete illustrative workspace for urgent orders, production sequencing, energy constraints, and shift release.
- **PR Food Products — procurement + production coordination.** A complete illustrative workspace for material availability, incoming supply, machine sequencing, energy exposure, and shift release.

The one-click demo workspaces are illustrative operating scenarios. Recorded pilot metrics are shown as pilot context and remain separate from the synthetic demo inputs.

## Customer order inputs

Orders can enter BatchWatt in three simple ways:

1. Add one customer order manually.
2. Paste rows copied directly from Excel or a structured WhatsApp order list.
3. Upload an `.xlsx`, `.csv`, or `.tsv` file.

BatchWatt auto-detects common headers such as Customer, Product, Quantity, Due, Priority, and Order/Reference. You can correct the column mapping before import. The preview validates products, quantities, due dates, priorities, and duplicates. Valid rows can be imported even when other rows are rejected.

## Daily flow

1. Add or import customer orders.
2. Fix any material or production blocker BatchWatt flags.
3. Review the cost-aware production sequence and integrated dashboard.
4. Review the energy position and peak-demand headroom.
5. Release the shift plan.
6. Dispatch stock orders, run production, and receive purchased material as it arrives.
7. Export the current operating plan or dashboard when needed.

## What stays under the hood

The V3.6 operator MVP uses the production, procurement, inventory, and energy planning engines behind a simple operating console. The detailed V2 planner remains available for recipes, suppliers, lines, products, and deeper configuration. The original V1 is preserved on `archive/batchwatt-v1`.

## Operational pilot facts

These are the same BatchWatt facts used in the Meta resume/application materials and should remain unchanged:

- **Two operational factory pilots in 2026:** RKG Ghee and PR Food Products.
- Used real **order, stock, production, and energy data** from the pilot environments.
- Mapped workflows that ran through **WhatsApp, Excel, phone calls, and memory** into a dispatch-first planning product.
- Across **19 planning cycles and 73 orders**, BatchWatt surfaced **16 dispatch risks** and recorded **14 production-sequencing changes**.
- Factory teams accepted **44 of 59 recorded recommendations in some form**.
- Recorded planning-time reduction: approximately **62–64%** across the two pilots.
- Estimated energy reduction: **6.7–8.8%**.
- Recorded peak-load reduction: **9.0–11.7%**.
- Direct WhatsApp API integration was **planned**, not represented as fully deployed in the pilot evidence.

The pilot records are calculated from the supplied pilot workbooks. Independent external verification and publication permissions remain pending.

The canonical resume/application wording and claim boundaries are preserved in `docs/RESUME_CLAIMS_LOCK.md`. New V3.6 capabilities must not be retroactively represented as capabilities deployed in the two 2026 pilots unless separately verified.

## Pilot evidence

The repository preserves pilot documentation for **RKG Ghee** and **PR Food Products**. Pilot records remain separate from the synthetic live demo.

## Important note

BatchWatt is decision-support software. It does not directly control machines, read live meters, send supplier orders, or make payments. Energy and savings outputs are modeled estimates. A supervisor should review the operating plan before release.
