# BatchWatt

BatchWatt reads a small food factory's existing WhatsApp orders and stock sheets, tells them what to produce first so dispatch doesn't fail, and shows the hidden energy cost of that plan, including peak-load spikes from starting heavy machines together. It's the daily planning layer before ERP.

## What it does

Small food factories often run production through WhatsApp, Excel, phone calls, and memory. Orders arrive in messy messages. Stock sits in spreadsheets. Electricity bills and LPG receipts are reviewed after the fact. The result is missed dispatches, rushed production, avoidable small batches, and hidden energy waste.

BatchWatt automates that daily planning loop.

It ingests:

- WhatsApp order messages
- Existing Excel or Google Sheets stock files
- Electricity bills
- LPG receipts
- Optional meter logs and production records

It outputs:

- What to make first today
- What can be dispatched from finished stock
- Which orders are at risk
- A machine schedule
- LPG needed
- kWh estimate
- Peak-load comparison
- Usage savings for this run
- Demand-charge savings only when today's run would set a new billing-month peak
- A copy-ready WhatsApp summary for the floor team

## Core insight

The obvious problem is dispatch. The hidden problem is the energy cost created by bad sequencing.

A factory owner may know which orders are urgent, but they usually cannot calculate the cost of starting the kettle, compressor, filler, and labeler together. BatchWatt makes that invisible peak-load risk visible.

## Product flow

1. **Setup once**
   - Configure SKU names, machine loads, startup spikes, tariff rules, LPG assumptions, stock-sheet mapping, and currency code.

2. **Automate daily inputs**
   - Orders arrive through WhatsApp.
   - Stock syncs from the existing sheet.
   - Bills and receipts are parsed when received.
   - The owner only reviews exceptions.

3. **Generate the plan**
   - Rank orders by dispatch deadline and available stock.
   - Decide what to make first.
   - Compare fast schedule vs peak-aware schedule.
   - Split energy savings into usage savings and demand-charge savings.

4. **Send the floor-ready message**
   - The result is a clean WhatsApp summary the owner or floor manager can copy and send.

## Energy model

BatchWatt separates two types of savings:

| Savings type | Applies to | How it is shown |
|---|---|---|
| Usage savings | Most factories | LPG/kWh saved this run from smarter batching or sequencing |
| Demand-charge savings | Only factories with demand-charge tariffs | Monthly avoided charge only if today's run would set a new billing-month peak |

Demand-charge savings are not shown as daily savings. The app tracks the billing month's peak so far and only flags avoided monthly demand charges when the fast schedule would exceed that peak.

Example:

```text
Peak load: 84 kW fast -> 72 kW staggered
Month peak so far: 78 kW
Usage saving this run: ~900 to 1,300 LOCAL
Demand-charge saving: avoids ~4,000 to 6,000 LOCAL per billing month if this run would set the monthly peak
```

## Current status

This repo contains a YC-ready MVP prototype:

- Static Vercel demo
- Serverless API route sketches
- Core planning engine
- Supabase schema
- n8n automation workflow sketch
- Sample payloads and outputs
- Spreadsheet planning dashboard
- YC application draft

The current version is automation-ready, not fully production-integrated. To run with a real factory, connect Meta WhatsApp Cloud API, Supabase, stock-sheet sync, bill/receipt ingestion, and optional meter logs.

## Local development

```bash
npm install
npm run test:plan
npm run dev
```

## Repository About

Dispatch-first daily production planner for small food factories, with peak-load energy insights.

## Suggested GitHub topics

`production-planning` `manufacturing` `food-industry` `energy-optimization` `whatsapp-automation` `streamlit` `smb` `scheduling` `demand-charge`
