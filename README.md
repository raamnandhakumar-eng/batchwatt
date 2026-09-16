# BatchWatt

**Energy-aware production planning for dairy manufacturers, starting with ghee production.**

BatchWatt answers one operating question:

> **What should we produce today?**

It combines **orders + inventory + production capacity + energy** to recommend a feasible production and energy plan. Each production requirement is expressed as **RUN**, **SHIFT**, or **HOLD**, with the recommended time, production line, and reason.

**[Open BatchWatt](https://batchwatt.vercel.app/)**

## Dairy manufacturing focus

BatchWatt is positioned specifically for **dairy production**, with **ghee manufacturing as the proven starting use case**.

The current product experience is designed around practical ghee-production decisions such as:

- Customer orders for pack-size and bulk ghee products
- Finished-goods stock
- Raw-material and packaging availability
- Batch heating / processing and packing capacity
- Production-line availability and rates
- Electricity tariffs and peak-load periods
- Production sequencing under delivery, material, capacity, and energy constraints

The underlying scheduling engine remains technically generic enough to support additional manufacturing configurations later. BatchWatt does **not** claim validation across all dairy manufacturing processes.

## Proven starting point: two operational pilots

BatchWatt grew out of **two operational factory pilots in 2026: RKG Ghee and PR Food Products**.

The pilots used supplied **order, stock, production, and energy data** from the operating environments. The underlying workflows were fragmented across **WhatsApp, Excel, phone calls, and operator memory**, and BatchWatt was used to bring those inputs into a more structured dispatch and production-planning workflow.

Across the two supplied pilot workbooks:

- **2 operational pilots**
- **19 planning cycles**
- **73 orders**
- **16 at-risk orders / dispatch risks surfaced**
- **14 production-sequencing changes recorded**
- **62–64% planning-time reduction**
- **6.7–8.8% estimated energy reduction**
- **9.0–11.7% peak-load reduction**

The strongest proven starting point is **ghee production**, with RKG Ghee providing the clearest dairy manufacturing use case. The current product has since evolved beyond the exact feature set used during those pilots, so historical pilot results are kept separate from newer capabilities.

These figures are derived from supplied pilot workbooks and operational records. They are **not independently audited results**, and newer BatchWatt functionality must not be retroactively described as having been deployed during the historical pilots.

## Core workflow

The primary workflow is intentionally short:

1. **Load orders and plant data**, or use the one-click ghee sample.
2. **Generate Plan.**
3. Review the **RUN / SHIFT / HOLD production schedule**.
4. Review the associated **energy impact**.

The live interface is organized around five areas:

**Plan | Orders | Energy | Pilots | Settings**

The Plan screen focuses on three questions:

- **What should we produce?**
- **When should we produce it?**
- **What happens to peak load and cost?**

## RUN / SHIFT / HOLD

Every production requirement uses one action vocabulary:

- **RUN**: keep the recommended feasible production-line and time assignment.
- **SHIFT**: move production to another feasible time and/or eligible line when the overall plan improves without worsening protected delivery.
- **HOLD**: do not schedule the requirement until a feasibility constraint is resolved.

HOLD reasons can include raw-material, packaging, missing-data/BOM, and capacity constraints. Unreceived material is never treated as physically available inventory.

## Energy impact

For each 15-minute interval, BatchWatt models:

**facility load = background / baseline load + scheduled production and changeover load**

The Plan and Energy views surface:

- Peak kW before → after
- Modeled electricity cost before → after
- Planned kWh
- Conditional demand-charge exposure
- Recommended load curve

Moving the same production run to another time does not inherently reduce kWh. Timing benefits come from tariff periods and peak-demand exposure. If the planner selects another eligible production line, modeled kWh may also change because production rate and line power can differ.

The current demand model is:

`incremental demand exposure = max(0, planned peak - monthly peak so far) × demand rate`

Utility-specific ratchets, coincident peaks, minimum billed demand, taxes, and power-factor penalties are outside the current model unless separately implemented.

## Energy decision review

The Energy tab compares the earliest-feasible baseline and recommended schedule for the same shift:

- Peak demand, kWh, usage cost and conditional demand exposure
- On-time orders (including eligible finished stock), late production orders and HOLDs
- Both 15-minute load curves on the same kW scale, with the peak target and configured peak tariff hours
- Configured tariff assumptions, imported-data coverage and stock-count freshness

The comparison flags changes in the set of scheduled production orders, so lower consumption from doing less work is not presented as pure efficiency savings. Usage-cost differences and conditional monthly demand differences are shown separately. These are modeled outcomes, not proof of execution or bill savings.

Stock-count timestamps are user supplied, scoped to the daily workspace and assessed against shift start. Counts more than 24 hours old are flagged for review; an absent date is unknown, not a pass. Supplied machine power and tariff values are not represented as meter-verified inputs.

The Pilots tab includes per-pilot baseline values and methodology links. Historical workbook outcomes remain separate from current planning outputs and illustrative samples.

## Ghee sample

The one-click sample is designed to make the dairy use case immediately understandable.

It uses ghee-focused production concepts already supported by BatchWatt, including pack-size and bulk ghee orders, finished stock, production timing, heating/filling capacity, and configured peak-load periods.

The sample is illustrative. It is **not** represented as a replay of the historical pilot workbooks.

## Factory and workspace model

BatchWatt separates reusable plant configuration from daily operating state:

```text
Dairy plant
├── Products and pack sizes
├── Eligible production / packing lines
├── Line kW and production rates
├── Raw materials, packaging and BOMs
├── Shift and tariff defaults
└── Workspaces
    ├── Today
    ├── Tomorrow
    ├── Scenario A
    └── Scenario B
```

Each factory can have multiple isolated workspaces. Orders, interval energy data, inventory state, planning state, release state, and learned factory signals remain separated by workspace/factory as appropriate.

A product may be eligible for more than one production line with different rates and power requirements. Optional line downtime and product-to-product changeover assumptions refine feasibility when supplied.

## Data intake

### Orders

Orders can enter BatchWatt by:

1. Manual entry
2. Pasting structured rows from Excel or another source
3. Uploading an `.xlsx`, `.csv`, or `.tsv` file

BatchWatt maps fields such as Customer, Product, Quantity, Due, Priority, and Order/Reference, then validates product matches, quantities, dates, priorities, and duplicates.

### Energy

Energy data can enter through spreadsheet upload or pasted rows.

For 15-minute load profiles, typical columns are:

`Time | Facility kW | Tariff rate (optional)`

Imported `Facility kW` represents **background / baseline facility demand before BatchWatt adds schedulable production-line loads**. This prevents production-machine power from being counted twice.

A one-row energy-settings file can update:

`Base kW | Peak target kW | Monthly peak kW | Off-peak rate | Peak rate | Peak start | Peak end | Demand charge | Currency`

## Scheduling engine

The current planner evaluates the whole shift rather than treating each order as an isolated decision.

Its decision hierarchy is:

1. Minimize **HOLDs**, with stronger protection for higher-priority work.
2. Minimize priority-weighted lateness and total late minutes.
3. Avoid the configured peak-demand target.
4. Minimize modeled electricity cost and conditional incremental demand-charge exposure.
5. Reduce changeover burden after delivery and energy requirements are protected.

The implementation uses a **bounded deterministic beam-search heuristic** across eligible lines and 15-minute start times. This technical detail is intentionally kept in the repository rather than exposed in the primary product UI. It searches materially more of the shift decision space than the earlier sequential scheduler, but it is not claimed to guarantee a globally optimal solution.

## Factory learning

BatchWatt preserves per-factory learning data and uses learned signals where they can improve future planning.

Learning is deliberately not a primary navigation destination. The main operator workflow stays focused on the production decision, while deeper learned signals remain available through secondary product detail.

## Historical ghee-factory pilot evidence

The **Pilots** tab is separate from live planning.

Preserved supplied pilot evidence:

| Metric | Historical supplied result |
| --- | ---: |
| Pilots | **2** |
| Planning cycles | **19** |
| Orders | **73** |
| Risks found | **16** |
| Sequencing changes | **14** |
| Planning-time reduction | **62–64%** |
| Estimated energy reduction | **6.7–8.8%** |
| Peak-load reduction | **9.0–11.7%** |

These figures come from **supplied ghee-factory operational records / pilot workbooks**. They are not independently audited results.

Historical pilot evidence is kept separate from synthetic demos and current modeled outputs. New BatchWatt capabilities must not be retroactively attributed to the historical pilots unless separately supported by evidence.

The canonical resume/application wording and evidence boundaries remain preserved in `docs/RESUME_CLAIMS_LOCK.md`.

## Product boundaries

BatchWatt is currently a **decision-support tool**, not autonomous plant control.

The portfolio implementation stores data in the browser. It does not imply:

- Live meter integration
- Direct PLC or machine control
- Enterprise cloud synchronization
- Automatically executed production releases
- Validation across every dairy manufacturing process

Energy, scheduling, and savings outputs are modeled from supplied plant configuration and operating data.

**Decision-support tool. Supervisor review required before release.**
