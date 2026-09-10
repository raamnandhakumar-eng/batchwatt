# BatchWatt

**Simple daily factory operations: know what to do next.**

BatchWatt turns customer orders, inventory, production capacity, purchasing needs, and electricity constraints into a practical shift plan for small manufacturers.

**[Open BatchWatt](https://batchwatt-git-improve-business-flow-usd-whatsapp-ciel5.vercel.app)**

## Try it in 2 minutes

1. Open one of the two working demos on the **Today** screen.
2. Change an order, material position, or energy input and watch the plan recalculate.
3. Review what to buy, what to produce, dispatch status, and any operating holds.
4. Release the shift when hard blockers are cleared.
5. Export the current plan, or download the order template and import your own `.xlsx`, `.csv`, or pasted Excel rows.

## The app is built around four screens

- **Today** — one recommended next action, today’s production runs, visible energy controls, issues, demos, and shift release.
- **Orders** — customer demand and dispatch status, with manual, pasted, Excel, and CSV intake.
- **Buying** — materials to replenish, purchase orders, and receipts.
- **More** — energy check, shift settings, workspace tools, and the detailed planner.

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
3. Review the run sequence and energy position.
4. Release the shift plan.
5. Dispatch stock orders, run production, and receive purchased material as it arrives.
6. Export the current operating plan when needed.

BatchWatt keeps energy practical. It checks peak demand and tariff timing after production and delivery constraints are protected.

## What stays under the hood

The V3.5 operator MVP still uses the full production, procurement, inventory, and energy planning engines. The detailed V2 planner remains available for recipes, suppliers, lines, products, and deeper configuration. The original V1 is preserved on `archive/batchwatt-v1`.

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

## Pilot evidence

The repository preserves pilot documentation for **RKG Ghee** and **PR Food Products**. Pilot records remain separate from the synthetic live demo.

## Important note

BatchWatt is decision-support software. It does not directly control machines, read live meters, send supplier orders, or make payments. Energy and savings outputs are modeled estimates. A supervisor should review the operating plan before release.
