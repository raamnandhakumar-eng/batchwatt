# BatchWatt

**A simple operations + energy decision console: unify fragmented inputs, validate a shared model, prioritize risk, sequence production, and understand peak-load impact.**

BatchWatt turns customer orders, inventory, production capacity, purchasing needs, and electricity data into one practical shift plan.

**[Open BatchWatt](https://batchwatt.vercel.app/)**

## V4.9: Orders Excel/CSV + Energy Excel/CSV → shared model → decisions

The operating workflow is:

**Orders Excel / CSV / pasted rows + Energy Excel / CSV → validation + field mapping → shared operational model → feasibility + scheduling → peak / cost optimization → production plan**

The Planner screen answers three questions quickly:

1. **What needs attention?** BatchWatt validates incoming order data, checks stock, materials and production feasibility, and surfaces dispatch risk.
2. **What should run next?** It recommends a production sequence using due times, stock, materials, line capacity, the facility load profile, peak target and tariff data.
3. **What does that do to energy and peak load?** The shift view compares the earliest-feasible baseline with the recommended schedule and shows facility peak, headroom, estimated kWh and modeled energy / demand exposure.

The scheduler protects supplied due times first, avoids peak-target breaches second, and minimizes modeled electricity plus conditional demand cost third. It uses a sequential scheduling heuristic, not a guarantee of a globally optimal schedule.

The **Pilots** tab preserves supplied historical description and figures separately from synthetic demos and current modeled results. The original V1 remains on `archive/batchwatt-v1`.

## Data integration

### Order data

Orders can enter BatchWatt in three ways:

1. Add an order manually.
2. Paste rows copied from Excel or another structured source.
3. Upload an `.xlsx`, `.csv`, or `.tsv` file.

BatchWatt maps common fields such as Customer, Product, Quantity, Due, Priority and Order/Reference, then validates product matches, quantities, dates, priorities and duplicates before adding rows to the plan.

### Energy data

Energy can now enter BatchWatt through `.xlsx`, `.csv`, `.tsv`, or pasted spreadsheet rows in two forms.

**15-minute load profile**

Typical columns:

`Time | Facility kW | Tariff rate (optional)`

- Times must align to 15-minute intervals.
- BatchWatt validates duplicate timestamps and numeric load / rate values.
- The import preview shows valid rows, rejected rows and shift coverage.
- Imported facility kW overrides the configured base load at matching shift intervals.
- An imported interval tariff rate overrides the configured tariff at that matching interval.
- Missing intervals fall back to configured base load and tariff settings.

The imported facility kW should represent **background / baseline facility load before BatchWatt adds the schedulable production-line loads**. This avoids double counting machine power.

**Energy settings**

A one-row spreadsheet can update mapped fields such as:

`Base kW | Peak target kW | Monthly peak kW | Off-peak rate | Peak rate | Peak start | Peak end | Demand charge | Currency`

Only mapped fields are updated, so an already imported interval profile can remain in place.

## How energy affects scheduling

For each 15-minute slot, BatchWatt builds the facility load from:

**baseline/background load + scheduled production-line kW**

The planner evaluates feasible start times in this order:

1. Protect order due times.
2. Avoid exceeding the configured peak-demand target.
3. Minimize modeled energy plus incremental demand-charge exposure.
4. Prefer the earliest time when the higher-priority criteria are tied.

A recommended schedule is only used when it preserves the same scheduled work, does not worsen delivery performance, and does not increase the modeled total operating bill. Otherwise BatchWatt retains the baseline schedule.

The visible decision trace shows the shared-model health, blockers, baseline vs recommended peak and cost, shifted runs, and the reason each run was kept or moved.

## Integration design

Orders, finished stock, recipes, raw materials, production lines, electricity settings, and optional 15-minute load / tariff data feed one validated operational model. The console connects material shortages and dispatch risk to production timing, electricity cost, peak-load exposure, and supervisor release.

Data is saved in the current browser. BatchWatt does not imply a live meter, enterprise data pipeline, cloud synchronization, or direct machine control. The detailed planner remains available for product, line, supplier and recipe configuration.

## Operational pilot facts

These historical pilot claims remain unchanged and are kept separate from newer product capabilities:

- **Two operational factory pilots in 2026:** RKG Ghee and PR Food Products.
- Used real **order, stock, production, and energy data** from the pilot environments.
- Mapped workflows that ran through **WhatsApp, Excel, phone calls, and memory** into a dispatch-first planning product.
- Across **19 planning cycles and 73 orders**, BatchWatt surfaced **16 dispatch risks** and recorded **14 production-sequencing changes**.
- Factory teams accepted **44 of 59 recorded recommendations in some form**.
- Recorded planning-time reduction: approximately **62–64%** across the two pilots.
- Estimated energy reduction: **6.7–8.8%**.
- Recorded peak-load reduction: **9.0–11.7%**.
- Direct WhatsApp API integration was **planned**, not represented as fully deployed in the pilot evidence.

The pilot records are calculated from supplied pilot workbooks. Independent external verification and publication permissions remain pending.

The canonical resume/application wording and claim boundaries are preserved in `docs/RESUME_CLAIMS_LOCK.md`. New product capabilities must not be retroactively represented as capabilities deployed in the two 2026 pilots unless separately verified.

## Important note

BatchWatt is decision-support software. Energy and savings outputs are modeled estimates. A supervisor should review the operating plan before release.
