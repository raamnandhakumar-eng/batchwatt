# BatchWatt

**A simple factory decision console: what to make, when to make it, what to buy, and what it costs.**

BatchWatt turns customer orders, inventory, production capacity, purchasing needs, and electricity constraints into one practical shift plan.

**[Open BatchWatt](https://batchwatt.vercel.app/)**

## V4.0: orders → sequence → energy → release

The default Today screen is built around three questions an operator needs answered quickly:

1. **What should we produce?** BatchWatt converts orders and available stock into a prioritized production sequence.
2. **When should we run it?** Each scheduled run shows the product, quantity, line, start and finish time, and the reason for the timing decision.
3. **What does that do to energy and peak load?** Each run shows machine kW, estimated kWh and modeled energy cost, while the shift view shows planned facility peak and headroom against the configured target.

The workflow is deliberately simple: **Orders → Sequence → Energy → Release**. Buying and detailed setup remain supporting workflows instead of dominating the daily decision screen.

The planner protects due times first, reduces peak-target breaches second, and minimizes modeled electricity plus conditional demand cost third. It uses a sequential scheduling heuristic, not a guarantee of a globally optimal schedule. An infeasible peak target remains visible and blocks release; it is not silently treated as a safe operating limit.

The **Pilots** tab preserves the supplied historical description and figures separately from illustrative demos and current modeled results. The original V1 remains on `archive/batchwatt-v1`.

### Integration design

Orders, finished stock, recipes, raw materials, production lines, and electricity assumptions feed the same validated planning model. The console connects material shortages and dispatch risk to production timing, electricity cost, peak-load exposure, and supervisor release. Changes invalidate an earlier release so the updated plan must be reviewed again.

Data is saved in the current browser. This app does not imply a live meter, enterprise data pipeline, or cloud synchronization. The detailed planner remains available for product, line, supplier, and recipe configuration.

## Customer order inputs

Orders can enter BatchWatt in three ways:

1. Add one customer order manually.
2. Paste rows copied from Excel or a structured WhatsApp order list.
3. Upload an `.xlsx`, `.csv`, or `.tsv` file.

BatchWatt auto-detects common headers such as Customer, Product, Quantity, Due, Priority, and Order/Reference. It validates products, quantities, due dates, priorities, and duplicates before import.

## What stays under the hood

V4.0 keeps the production, procurement, inventory, and energy planning engines while presenting them through a simpler operator decision console. The detailed V2 planner remains available for recipes, suppliers, lines, products, and deeper configuration. The original V1 is preserved on `archive/batchwatt-v1`.

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

The canonical resume/application wording and claim boundaries are preserved in `docs/RESUME_CLAIMS_LOCK.md`. New product capabilities must not be retroactively represented as capabilities deployed in the two 2026 pilots unless separately verified.

## Pilot evidence

The repository preserves pilot documentation for **RKG Ghee** and **PR Food Products**. Pilot records remain separate from the synthetic live demos.

## Important note

BatchWatt is decision-support software. It does not directly control machines, read live meters, send supplier orders, or make payments. Energy and savings outputs are modeled estimates. A supervisor should review the operating plan before release.
