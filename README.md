# BatchWatt

**Dispatch-first production planning for small food factories, with energy-aware sequencing and pilot evidence.**

BatchWatt reads the order and stock records a factory already uses, identifies what must be produced first so dispatch does not fail, and compares the energy and peak-load effect of alternative production sequences. It is designed as the daily planning layer before ERP.

## Product website

The repository includes a pilot-ready static product website with selectable workspaces for:

- **RKG Ghee**
- **PR Food Products**

The website presents pilot scope, planning-time results, dispatch-risk flags, production-sequencing decisions, modeled energy outcomes, operator feedback, and the current evidence status.

## What it does

BatchWatt ingests or models:

- customer orders from WhatsApp or order books;
- finished-goods and material stock sheets;
- production lines, machine capacities, and changeover constraints;
- electricity bills, LPG records, and optional meter logs.

It outputs:

- a dispatch-prioritized production plan;
- orders or dispatches at risk;
- recommended batch and machine sequence;
- material and packaging exceptions;
- baseline versus optimized kWh;
- baseline versus optimized peak load;
- a floor-ready summary for the factory team.

## Operational pilot records

The supplied BatchWatt pilot workbook records two operational pilots using order, stock, production, and energy data.

| Pilot | Period | Cycles | Orders | SKUs | Lines / stages | Planning-time reduction | Estimated energy reduction | Peak-load reduction | Operator rating |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| RKG Ghee | Jul 7–20, 2026 | 10 | 32 | 6 | 2 | 64.2% | 8.8% | 11.7% | 4.34 / 5 |
| PR Food Products | Jul 14–25, 2026 | 9 | 41 | 8 | 3 | 62.3% | 6.7% | 9.0% | 4.26 / 5 |

Across the two datasets, BatchWatt records **19 planning cycles**, **73 orders**, **16 orders or dispatches flagged at risk**, and **14 production-sequencing changes**.

### Pilot documentation

- [`docs/pilots/rkg-ghee-pilot.md`](docs/pilots/rkg-ghee-pilot.md)
- [`docs/pilots/pr-food-products-pilot.md`](docs/pilots/pr-food-products-pilot.md)
- [`docs/pilots/pilot-methodology.md`](docs/pilots/pilot-methodology.md)

## Evidence and claim boundary

The supplied workbook contains anonymized order tables, daily metrics, production recommendations, and factory-team responses. It also records that the following evidence remains pending:

- original anonymized source spreadsheets;
- timestamped BatchWatt run logs;
- screenshots tied to planning cycles;
- written company confirmation;
- permission to publish company names or feedback quotes.

Therefore, the safe claim is:

> BatchWatt contains operational pilot records for RKG Ghee and PR Food Products using order, stock, production, and energy data. Results shown are calculated from the supplied pilot workbook; external verification and publication permissions are tracked separately.

Do not describe the results as independently verified, customer-approved, or a fully integrated production deployment until the supporting evidence is obtained.

## Energy model

BatchWatt separates operational energy effects from tariff-specific demand-charge effects.

| Savings type | Applies to | How it is shown |
|---|---|---|
| Usage savings | Most factories | LPG or kWh reduction associated with batching and sequencing |
| Peak-load reduction | Factories with concurrent high-load equipment | Baseline versus optimized maximum demand |
| Demand-charge savings | Only factories with demand-charge tariffs | Monthly avoided charge only when the plan would otherwise set a new billing-month peak |

Energy reductions in the pilot summaries are labeled **estimated** unless independently supported by meter data.

## Repository components

- Static Vercel-compatible product website
- Core planning engine and sample test runner
- Supabase schema
- n8n automation workflow sketch
- Sample payloads and outputs
- Spreadsheet planning dashboard
- Operational pilot summaries and methodology

## Local development

```bash
npm install
npm run test:plan
npm run dev
```

## Current status

BatchWatt is a pilot-ready product prototype with two operational pilot datasets. The public website and documentation are complete; live WhatsApp, stock-sheet, meter, and factory-system integrations remain deployment work.

## Repository About

Dispatch-first production planner for small food factories, with energy-aware sequencing and documented operational pilots.

## Suggested GitHub topics

`production-planning` `manufacturing` `food-industry` `energy-optimization` `whatsapp-automation` `smb` `scheduling` `demand-charge` `pilot-study`
