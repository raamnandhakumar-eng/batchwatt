# BatchWatt V9 Automation Architecture

## Core principle

Do not ask the factory owner to type daily data.

The system automates data collection from sources the factory already uses. The owner only reviews exceptions.

## One-time setup

Configured during onboarding:

- Factory name
- Currency code
- SKU alias map
- Stock-sheet columns
- Machine list
- Machine average kW
- Machine startup spike kW
- Fast schedule assumptions
- Peak-aware schedule assumptions
- LPG coefficient per kg output
- kWh coefficient per kg output
- Electricity tariff rules
- Demand charge rules
- Contracted demand limit
- Demand-charge tariff eligibility
- Current billing-month peak so far

## Daily automated inputs

| Source | Automation path | What is extracted |
|---|---|---|
| WhatsApp | WhatsApp Cloud API webhook | customer, SKU, quantity, due date |
| Stock sheet | Google Sheets / Excel sync | finished stock, packaging stock, last-known flag |
| Electricity bill | Email/PDF/text parser | kWh, current monthly peak, rate, demand charge, contract demand, demand-charge eligibility |
| LPG receipt | Email/photo/text parser | kg delivered, price per kg, refill date |
| Meter logs | Optional manual/sensor upload | kW peak, kWh, timestamp |

## Planning flow

1. Receive new orders.
2. Parse and normalize SKUs.
3. Pull latest stock snapshot.
4. Pull latest tariff and fuel assumptions.
5. Generate dispatch-first plan.
6. Build fast schedule peak profile.
7. Build staggered schedule peak profile.
8. Estimate LPG and kWh.
9. Show usage savings per run and demand-charge savings only when today would set a new billing-month peak.
10. Generate owner-ready WhatsApp output.
11. Send exceptions for human review.

## Exception logic

The system should not silently guess.

Examples:

- Unknown SKU: flag for correction.
- Unknown quantity: flag for correction.
- Missing stock row: use zero and flag.
- Last-known stock: use value and flag.
- Missing bill: use setup tariff and mark modeled.
- Missing LPG receipt: estimate from refill minus batches since refill.

## Production deployment

Recommended stack:

- Vercel for frontend and serverless API routes
- Supabase Postgres for database
- WhatsApp Cloud API for inbound orders and outbound summaries
- Google Sheets API or Drive sync for stock files
- Gmail/Drive/parser pipeline for bills and receipts
- Optional n8n/Zapier/Make for fast pilot automation

## Human-in-the-loop rule

Automation is allowed to draft plans. It should not blindly execute high-risk production decisions.

Before sending the floor plan, the owner or floor manager should review exceptions and confirm the plan.
