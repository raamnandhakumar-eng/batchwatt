# Draft: BatchWatt

## Company

BatchWatt

## What are you making?

BatchWatt automatically reads order messages, stock sheets, electricity bills, and LPG receipts for small food factories. It tells them what to make first so dispatch does not fail, then shows the hidden energy win: lower usage cost from smarter batching, and demand-charge upside only when a run would set a new monthly peak.

We are starting with ghee and dairy factories. These factories run daily production through messages, Excel, calls, and memory. The owner is trying to avoid missed dispatches while also managing LPG, electricity, packaging, and finished stock.

The product is not a full ERP. It is the daily planning layer before ERP. It ingests the inputs the factory already creates, flags uncertain data, creates a dispatch-first production plan, and gives the owner a copy-ready summary.

## What is new or non-obvious?

Most owners know to dispatch existing stock first. What they cannot calculate in their head is the peak-load problem: starting the kettle, compressor, filler, and labeler together may create a costly demand-charge spike, but only if the factory is on a demand-charge tariff and the run exceeds the billing-month peak so far. BatchWatt connects dispatch urgency with machine sequencing and shows a peak-load-aware plan.

## How far along are you?

We have a working demo, spreadsheet model, planning engine, and Vercel-ready automation skeleton. V9 includes webhook endpoints for order ingestion, stock-sheet ingestion, bill/LPG parsing, exception review, and dispatch-first plan generation.

The current savings estimates are modeled. Usage savings are shown per run. Demand-charge savings are shown only when the bill has a demand charge and today would set a new billing-month peak. During pilots, estimates are calibrated using electricity bills, LPG refill logs, meter readings, and production records.

## Who needs this?

Small and mid-sized batch manufacturers that have daily dispatch pressure and meaningful energy costs. We start with Indian food factories: ghee, dairy, snacks, spices, bakery, cold storage, and co-packers. The same workflow later applies to any small batch manufacturer with deadlines, machines, and peak-load exposure.

## Why now?

Small factories already run on digital exhaust: order messages, Excel stock sheets, email bills, and digital receipts. AI can now parse those messy inputs well enough to create a planning layer without forcing the owner to adopt a heavy ERP.

## Why you?

I have operated a food business, understand ghee/CPG operations, and have an electrical/power systems background. That combination matters because the product is not just software. It connects factory floor decisions with power demand, LPG use, and dispatch risk.

## First metric

For the first pilots, the goal is to reduce missed-dispatch risk and show modeled usage savings and correctly gated monthly demand-charge savings without creating daily data-entry work for the owner.
