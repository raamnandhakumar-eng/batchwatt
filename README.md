# BatchWatt

**A simple operations + energy decision console: unify fragmented inputs, prioritize risk, sequence production, and understand peak-load impact.**

BatchWatt turns customer orders, inventory, production capacity, purchasing needs, and electricity constraints into one practical shift plan through a shared operational model.

**[Open BatchWatt](https://batchwatt.vercel.app/)**

## V4.4.1: inputs → shared model → decisions

The default Planner screen is built around three questions an operator needs answered quickly:

1. **What needs attention?** BatchWatt validates incoming order data, checks inventory and production feasibility, and surfaces dispatch risk.
2. **What should we run next?** It recommends a production sequence using due times, stock, materials, line capacity, and configured power constraints.
3. **What does that do to energy and peak load?** The shift view shows planned facility peak, headroom against the configured target, estimated kWh, and modeled energy charge.

The visible workflow stays simple: **Orders → Attention → Production → Energy**. The underlying data pipeline remains available under **Data integration + planning logic**.

The planner protects due times first, reduces peak-target breaches second, and minimizes modeled electricity plus conditional demand cost third. It uses a sequential scheduling heuristic, not a guarantee of a globally optimal schedule. An infeasible peak target remains visible and blocks release; it is not silently treated as a safe operating limit.

The **Pilots** tab preserves supplied historical description and figures separately from illustrative demos and current modeled results. The original V1 remains on `archive/batchwatt-v1`.

### Integration design

Excel/CSV uploads, pasted orders, finished stock, recipes, raw materials, production lines, and electricity assumptions feed one validated operational model. The console connects material shortages and dispatch risk to production timing, electricity cost, peak-load exposure, and supervisor release. Changes invalidate an earlier release so the updated plan must be reviewed again.

Data is saved in the current browser. This app does not imply a live meter, enterprise data pipeline, or cloud synchronization. The detailed planner remains available for product, line, supplier, and recipe configuration.

## Customer order inputs

Orders can enter BatchWatt in three ways:

1. Add one customer order manually.
2. Paste rows copied from Excel or a structured WhatsApp order list.
3. Upload an `.xlsx`, `.csv`, or `.tsv` file.

BatchWatt auto-detects common headers such as Customer, Product, Quantity, Due, Priority, and Order/Reference. It validates products, quantities, due dates, priorities, and duplicates before import.

## What stays under the hood

BatchWatt keeps the production, procurement, inventory, and energy planning engines while presenting them through a simple operator decision console. The detailed V2 planner remains available for recipes, suppliers, lines, products, and deeper configuration. The original V1 is preserved on `archive/batchwatt-v1`.

## Operational pilot facts

These are the same BatchWatt facts used in resume and application materials and should remain unchanged:

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

The canonical resume/application wording and claim boundaries are preserved in `docs/RESUME_CLAIMS_LOCK.md`. New product capabilities must not be retroactively represented as capabilities deployed in the two 2026 pilots unless separately verified.

## Pilot evidence

The repository preserves pilot documentation for **RKG Ghee** and **PR Food Products**. Pilot records remain separate from the synthetic live demos.

## Important note

BatchWatt is decision-support software. It does not directly control machines, read live meters, send supplier orders, or make payments. Energy and savings outputs are modeled estimates. A supervisor should review the operating plan before release.
