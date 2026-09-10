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

## Pilot evidence

The repository preserves pilot documentation for **RKG Ghee** and **PR Food Products**. Pilot records remain separate from the synthetic live demo.

## Important note

BatchWatt is decision-support software. It does not directly control machines, read live meters, send supplier orders, or make payments. Energy and savings outputs are modeled estimates. A supervisor should review the operating plan before release.
