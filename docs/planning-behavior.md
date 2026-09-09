# Planning behavior and limitations

## What this version solves

BatchWatt turns supplied orders into a reviewable dispatch queue. The automated planning engine allocates limited finished stock and packaging, exposes shortages, and produces a structured explanation and local reports. The browser supports flexible products, pilot review, intake validation and complete visual and tabular outputs.

This is decision support. It does not yet schedule finite machine capacity, check recipes, account for cleaning constraints or guarantee delivery times.

## Two input contracts

| Path | Stock meaning | Ordering | Output |
| --- | --- | --- | --- |
| Browser paste / workbook | Finished stock reserved for each individual order | Orders needing attention first; earliest recognized due date next; urgency breaks ties | Order coverage chart, recorded performance, CSV, JSON and full floor message |
| API / local report | Shared finished and packaging stock per SKU | Due today, tomorrow, then assumed two days; customer breaks ties | Shared-stock allocation, packaging blockers, per-order reasons, modeled energy and complete reports |

Do not paste a shared stock balance into every browser row for the same SKU. Reserve it across those rows first, or use the API/local report with a single SKU stock balance. Repeated products display a browser warning.

The API consumes the existing sample JSON contract. `schemaVersion`, `summary`, `planningMethod`, per-order `decision`, `reasons`, and `packagingReservedUnits` extend the existing response without removing previous fields. Packaging shortages now count as review exceptions, so confidence can change to `review needed`.

## Input review

- Browser quantity must be positive; stock must be non-negative. A bad row blocks generation so it cannot disappear among valid rows.
- Missing browser stock is treated as zero and disclosed. Supply `0` explicitly when confirmed.
- The API rejects unrecognized SKU/quantity lines into its exception list. Pack sizes such as `500 ml` are not order quantities.
- API cases currently assume 24 units per case and create a review exception. Configure a product-specific pack-size model before operational automation.
- Duplicate API stock rows keep the first balance and require review. Invalid balances use zero pending correction.
- Browser dates accept today, tomorrow, weekdays, or complete dates. Prefer `YYYY-MM-DD`. Relative dates are anchored to intake time when a workspace is created. Historical pilot dates without years remain flagged.
- API dates currently recognize today and tomorrow language. Other dates are assumed to be two days out and flagged. Do not rely on this parser for exact future scheduling.

## Charts and claims

Stock charts represent loaded rows, not every order in a pilot's summary. Each bar shows coverage as a percentage of that order, with its own quantities and unit. The full CSV contains the corresponding order values.

Performance charts show supplied or workbook-derived changes relative to baseline, with missing measurements unavailable. They are not a prediction of future savings. Negative percentages mean an increase. Bars cap at 100% in length; the printed value remains the reported value.

API energy receipts remain illustrative estimates using configured/default product mass factors, machine windows and usage-saving assumptions. Volume-to-mass conversion, equipment load, tariff details and actual production must be calibrated for each factory. Startup peaks are illustrative, not billing-interval meter measurements. The engine returns no production-machine profile when orders are fully covered by stock. This does not imply the factory has zero background electricity consumption.

## Verification

`node --test tests/*.test.js` checks inventory allocation, packaging blockers, ambiguous input, missing metrics, relative dates, complete outputs, chart escaping and spreadsheet formula protection. The GitHub workflow runs those checks and the sample report on pushes and pull requests. Browser visual testing and a production deployment are separate steps.

## Next engineering priorities

1. Unify the browser and API around one typed order and inventory model with stable SKU identifiers.
2. Add configurable case sizes, exact due dates, units and recipe/material requirements.
3. Add line rates, shift calendars and cleaning/changeover times to test whether a plan can finish before dispatch.
4. Record supervisor approval and actual completion to compare planned versus actual outcomes.
5. Connect authenticated factory workspaces and real WhatsApp intake only after the above contracts are validated.
