# BatchWatt

**Dispatch-first production planning for small food factories, with energy-aware sequencing and operational data ingestion.**

BatchWatt reads the records a factory already uses, identifies what must be produced first so dispatch does not fail, and compares the operational and energy effect of alternative production sequences. It is designed as the daily planning layer before ERP.

## Operational website

The static web application contains:

- preloaded operational workspaces for **RKG Ghee** and **PR Food Products**;
- an Excel/CSV upload workflow for adding another factory;
- automatic detection of Pilot Summary, Orders, Daily Metrics, Production Plan, and Evidence Checklist sheets;
- dispatch-risk prioritization from due dates, priority, stock and shortages;
- planning-time, energy and peak-load KPI calculations;
- workbook-derived production recommendations when supplied;
- rules-based draft recommendations when only order data is available;
- downloadable JSON operational summaries;
- local browser persistence for calculated uploaded workspaces.

Uploaded `.xlsx`, `.xls`, and `.csv` files are processed in the browser with SheetJS. Raw files are not transmitted to BatchWatt or committed to this public repository. Only the calculated workspace summary is retained in the user's local browser storage.

## Supported input structure

BatchWatt works best with the same structure as the supplied pilot workbook:

| Sheet | Important fields |
|---|---|
| Pilot Summary | Company, period, cycles, orders, SKUs, lines, planning time, energy, peak load, rating |
| Orders | Order ID, product or SKU, quantity, due date, priority, stock, shortage, line and risk |
| Daily Metrics | Cycle, orders reviewed, risk count, sequence changes, planning time, kWh, peak and rating |
| Production Plan | Product, line, baseline and recommended sequence, reason, team response and status |
| Evidence Checklist | Evidence item, status, owner, verification standard and external-use approval |

A simpler order-only spreadsheet can also be uploaded. In that case BatchWatt calculates order counts, unique SKUs, lines and shortage-based risks, then creates **rules-based draft recommendations** that require supervisor review.

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

## What the dashboard shows

- dispatch-prioritized orders requiring attention;
- calculated stock shortages and recorded risk status;
- production recommendations and factory responses;
- planning time before and with BatchWatt;
- baseline versus optimized energy;
- baseline versus optimized peak load;
- operator or supervisor notes;
- data-quality warnings when expected sheets are missing.

## Evidence and claim boundary

The supplied workbook contains anonymized order tables, daily metrics, production recommendations, and factory-team responses. The following evidence remains separate or pending:

- original anonymized source spreadsheets;
- timestamped BatchWatt run logs;
- screenshots tied to planning cycles;
- written company confirmation;
- permission to publish company names or feedback quotes.

The safe public claim is:

> BatchWatt contains operational pilot records for RKG Ghee and PR Food Products using order, stock, production, and energy data. Results shown are calculated from the supplied pilot workbook; external verification and publication permissions are tracked separately.

Uploaded workspaces are calculated from files selected by the browser user. Their presence in the application does not imply independent verification, customer approval, or a completed production integration.

## Energy model

BatchWatt separates operational energy effects from tariff-specific demand-charge effects.

| Savings type | Applies to | How it is shown |
|---|---|---|
| Usage savings | Most factories | LPG or kWh reduction associated with batching and sequencing |
| Peak-load reduction | Factories with concurrent high-load equipment | Baseline versus optimized maximum demand |
| Demand-charge savings | Only factories with demand-charge tariffs | Monthly avoided charge only when the plan would otherwise set a new billing-month peak |

Energy reductions in pilot and uploaded summaries should be labeled **estimated** unless independently supported by meter data.

## Local development

```bash
npm install
npm run test:plan
npm run dev
```

The website itself is static and Vercel-compatible. Excel parsing is loaded client-side from the SheetJS browser build.

## Current status

BatchWatt is an operational browser prototype with two preloaded pilot datasets and local spreadsheet ingestion. Live WhatsApp, shared database, user authentication, meter, stock-sheet and factory-system integrations remain deployment work.

## Repository components

- Operational Vercel-compatible website
- Browser-based Excel/CSV ingestion
- Core planning engine and sample test runner
- Supabase schema
- n8n automation workflow sketch
- Sample payloads and outputs
- Spreadsheet planning dashboard
- Operational pilot summaries and methodology
