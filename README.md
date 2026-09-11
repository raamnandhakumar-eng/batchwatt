# BatchWatt

**A simple factory decision console: what to make, when to make it, what to buy, and what it costs.**

BatchWatt turns customer orders, inventory, production capacity, purchasing needs, and electricity constraints into one practical shift plan.

**[Open BatchWatt](https://batchwatt.vercel.app/)**

## New in V3.8

- Edit customer orders without removing and re-entering them.
- Search by customer, product, or order ID and filter orders that need attention.
- Record partial material deliveries; inventory increases only by the received quantity.
- Compare recommended load against the baseline on the energy chart.
- See blocked production alongside scheduled runs, with a direct action to resolve it.

## The simple flow

Daily operators mainly use three places:

1. **Today** — the main decision console. See what needs attention, what to produce, when to run it, energy cost/peak insights, and whether the shift is ready to release.
2. **Orders** — add one order, paste rows, or import Excel/CSV order data.
3. **Buying** — see material shortages, recommended purchases, purchase orders, and receipts.

Two supporting tabs stay separate:

- **Pilot Results** — read-only locked pilot/resume facts plus the two one-click demos.
- **More** — factory and shift settings plus the detailed V2 planner.

## Today screen

The Today screen is intentionally one integrated dashboard instead of a separate analytics page.

### Decision Console

Shows the operating sequence in plain language:

- Orders — what needs attention.
- Produce — the next product and recommended start time.
- Buy — material actions required.
- Release — whether the shift can be approved.

### Energy Insights

Shows:

- planned peak kW versus the operating target;
- estimated shift energy cost;
- modeled electricity + conditional demand-charge saving versus the baseline schedule;
- number of production runs shifted for lower modeled cost;
- a 15-minute load chart with the peak tariff window and peak target;
- a short plain-English recommendation explaining what the energy position means.

Energy assumptions such as background load, peak target, monthly peak, off-peak/peak tariff, demand charge, and peak window remain editable but are collapsed by default.

### What to make and when

For each required production run, BatchWatt shows:

- product and quantity;
- production line;
- recommended start and end time;
- why that timing was selected;
- modeled run-energy cost;
- whether it was shifted from the baseline schedule.

The scheduling objective remains deliberately ordered:

1. Protect supplied customer due times.
2. Avoid peak-demand target breaches.
3. Minimize modeled electricity and conditional demand-charge cost.
4. Use finished stock before scheduling new production.
5. Keep material shortages and replenishment cost visible.
6. Include line changeover time.

## Two demos

The **Pilot Results** tab contains two one-click illustrative workspaces:

- **RKG Ghee — peak-load + dispatch pressure**
- **PR Food Products — procurement + production coordination**

The demo workspaces are illustrative. They remain separate from the historical pilot evidence.

## Customer order inputs

Orders can enter BatchWatt in three ways:

1. Add one customer order manually.
2. Paste rows copied from Excel or a structured WhatsApp order list.
3. Upload an `.xlsx`, `.csv`, or `.tsv` file.

BatchWatt auto-detects common headers such as Customer, Product, Quantity, Due, Priority, and Order/Reference. It validates products, quantities, due dates, priorities, and duplicates before import.

## What stays under the hood

V3.8 keeps the production, procurement, inventory, and energy planning engines while presenting them through one simpler operator console. The detailed V2 planner remains available for recipes, suppliers, lines, products, and deeper configuration. The original V1 is preserved on `archive/batchwatt-v1`.

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
