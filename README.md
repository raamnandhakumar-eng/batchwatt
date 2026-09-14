# BatchWatt

**A production + energy decision-support tool that turns fragmented operating data into a feasible, peak-aware shift plan.**

BatchWatt combines customer orders, inventory, materials, production capacity and electricity data, then recommends what should **RUN**, **SHIFT**, or **HOLD**.

**[Open BatchWatt](https://batchwatt.vercel.app/)**

## V6: whole-shift production + energy scheduling

The operating workflow is:

**Factory profile + workspace data → validation → feasibility → whole-shift scheduling → energy / peak evaluation → RUN / SHIFT / HOLD**

A factory profile contains reusable master data such as products, eligible production lines, line power, production rates, materials, BOMs, shift defaults and energy settings. Each factory can have multiple isolated workspaces for daily plans or scenarios; orders, interval energy, inventory state and plan/release state stay separate by workspace.

The V6 scheduler no longer evaluates each order only as an isolated greedy decision. It builds candidate whole-shift schedules across eligible machines and 15-minute start times, then compares the resulting plan using this decision hierarchy:

1. Minimize orders placed on **HOLD**, with higher penalties for higher-priority work.
2. Minimize **priority-weighted late minutes** and total late minutes.
3. Avoid the configured **peak-demand target**.
4. Minimize modeled electricity cost plus conditional incremental demand-charge exposure.
5. Reduce changeover burden after service and energy requirements are protected.

V6 uses a **bounded deterministic beam-search heuristic**. It searches materially more of the whole-shift decision space than the earlier sequential scheduler, but it is not represented as a guaranteed globally optimal mathematical solution.

### RUN / SHIFT / HOLD

Every production requirement is expressed through one action vocabulary:

- **RUN** — keep the recommended feasible machine/time assignment.
- **SHIFT** — change time and/or eligible line because the whole-shift plan improves without worsening protected delivery.
- **HOLD** — do not schedule the order until a feasibility constraint is resolved.

HOLD reasons are structured, including material, packaging, missing-data/BOM and capacity constraints. Material holds can show a modeled earliest replenishment date from confirmed inbound purchase orders or configured supplier lead time, while unreceived material is never treated as physically available stock.

## Factory and workspace model

BatchWatt separates reusable factory configuration from daily operating state:

```text
Factory
├── Products and eligible lines
├── Line kW / product-specific production rates
├── Materials and BOMs
├── Shift and tariff defaults
└── Workspaces
    ├── Today
    ├── Tomorrow
    ├── Scenario A
    └── Scenario B
```

A product may be eligible for more than one line with a different production rate on each line. The planner can therefore compare alternatives such as a faster, higher-power machine against a slower, lower-power machine when both can meet the production requirement.

The engine also supports optional line downtime and product-to-product changeover matrices. These refine feasibility and setup time when supplied; legacy single-line products and fixed line changeovers remain supported.

## Data integration

### Order data

Orders can enter BatchWatt in three ways:

1. Add an order manually.
2. Paste rows copied from Excel or another structured source.
3. Upload an `.xlsx`, `.csv`, or `.tsv` file.

BatchWatt maps common fields such as Customer, Product, Quantity, Due, Priority and Order/Reference, then validates product matches, quantities, dates, priorities and duplicates before adding rows to the plan.

### Energy data

Energy can enter BatchWatt through `.xlsx`, `.csv`, `.tsv`, or pasted spreadsheet rows in two forms.

**15-minute load profile**

Typical columns:

`Time | Facility kW | Tariff rate (optional)`

- Times must align to 15-minute intervals.
- BatchWatt validates duplicate timestamps and numeric load / rate values.
- The import preview shows valid rows, rejected rows and shift coverage.
- Imported facility kW overrides configured background load at matching shift intervals.
- An imported interval tariff rate overrides the configured tariff at that matching interval.
- Missing intervals fall back to configured background load and tariff settings.

The imported `Facility kW` must represent **background / baseline facility demand before BatchWatt adds schedulable production-line loads**. V6 makes this assumption explicit in the import workflow and blocks total-meter interval data when it is identified as including the production machines, preventing machine power from being counted twice.

**Energy settings**

A one-row spreadsheet can update mapped fields such as:

`Base kW | Peak target kW | Monthly peak kW | Off-peak rate | Peak rate | Peak start | Peak end | Demand charge | Currency`

Only mapped fields are updated, so an already imported interval profile can remain in place.

## How energy affects scheduling

For each 15-minute slot, BatchWatt models:

**facility load = background / baseline load + scheduled production and changeover load**

The planner compares an **earliest-feasible baseline** against the whole-shift candidate plan. It reports modeled peak kW, kWh, usage cost, conditional demand-charge exposure, late orders, shifted jobs and HOLDs.

Moving the same machine run to another time does **not** by itself reduce kWh. Savings from timing changes come from tariff timing and peak-demand exposure. If V6 selects a different eligible production line, modeled kWh can also change because that line may have a different power rating and production rate.

The current demand model is intentionally simple:

`incremental demand exposure = max(0, planned peak - monthly peak so far) × demand rate`

Utility-specific ratchets, minimum billed demand, coincident peaks, taxes and power-factor penalties are outside the current model unless separately implemented.

## Release behavior

A material or capacity HOLD on one order does not automatically mean every runnable production job must stop. The V6 browser workflow can show a **partial release** when feasible jobs can proceed while constrained orders remain visibly on HOLD. A critical energy/peak condition can still block release.

## Integration design

Orders, finished stock, recipes, raw materials, eligible production lines, machine downtime, electricity settings, optional 15-minute load/tariff data and workspace state feed one planning model. The console connects material shortages and dispatch risk to production timing, electricity cost, peak-load exposure and supervisor release.

Data is currently saved in the browser for the portfolio implementation. BatchWatt does not imply a live meter, enterprise data pipeline, cloud synchronization or direct machine control.

The **Pilots** tab preserves supplied historical description and figures separately from synthetic demos and current modeled results. The original V1 remains on `archive/batchwatt-v1`.

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

BatchWatt is decision-support software. Energy, scheduling and savings outputs are modeled estimates from supplied configuration and operating data. A supervisor should review the operating plan before release.
