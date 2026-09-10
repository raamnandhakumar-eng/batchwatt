# BatchWatt

**Simple daily factory operations: know what to do next.**

BatchWatt turns customer orders, inventory, production capacity, purchasing needs, and electricity constraints into a practical shift plan for small manufacturers.

**[Open BatchWatt](https://batchwatt-git-improve-business-flow-usd-whatsapp-ciel5.vercel.app)**

## The app is built around four screens

- **Today** — one recommended next action, today’s production runs, issues, and shift release.
- **Orders** — customer demand and dispatch status.
- **Buying** — materials to replenish, purchase orders, and receipts.
- **More** — energy check, shift settings, demo tools, and the detailed planner.

## Daily flow

1. Add customer orders.
2. Fix any material or production blocker BatchWatt flags.
3. Review the run sequence.
4. Release the shift plan.
5. Dispatch stock orders, run production, and receive purchased material as it arrives.

BatchWatt keeps energy practical. It checks peak demand and tariff timing after production and delivery constraints are protected.

## What stays under the hood

The simplified V3.2 console still uses the full production, procurement, inventory, and energy planning engines. The detailed V2 planner remains available for recipes, suppliers, lines, products, and deeper configuration. The original V1 is preserved on `archive/batchwatt-v1`.

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
