# Product Spec: BatchWatt V9

## Product

BatchWatt is an automation-first dispatch planner for small food factories with a monthly-peak-aware energy receipt.

## User

Small food factory owner or floor manager.

## First vertical

Ghee and dairy factories.

## Core job

Tell the factory what to make first so dispatch does not fail, while avoiding unnecessary usage cost and peak-load spikes.

## Daily input

No daily typing.

The system ingests:

- WhatsApp order messages
- Existing stock sheets
- Electricity bill data
- LPG receipt data
- Optional meter readings

## One-time setup

- SKU aliases
- Product weights
- Machine load profiles
- Tariff model
- Whether the bill has a demand charge
- Current billing-month peak so far
- LPG assumptions
- Currency code
- Stock-sheet mapping

## Output order

1. Dispatch plan
2. At-risk orders
3. What to produce first
4. What can be dispatched from stock
5. Energy receipt
6. Peak-load visual
7. Copy-ready WhatsApp message

## Energy receipt

Show two separate energy wins:

### 1. Usage reduction

Applies to every factory.

Show:

- LPG needed, kg
- Electricity, kWh
- Energy cost per kg
- Modeled usage-saving range for this run

### 2. Demand-charge reduction

Applies only if the factory has a demand-charge tariff and today's fast schedule would set a new billing-month peak.

Show:

- Current billing-month peak so far, kW
- Fast schedule peak, kW
- Peak-aware schedule peak, kW
- Demand-charge saving today: 0 if there is no demand charge or if today does not exceed the monthly peak so far
- Modeled monthly demand-charge saving range only when today threatens a new monthly peak

Never show fake-precise savings.

Correct format:

`Peak load: 84 kW fast -> 72 kW staggered. Month peak so far: 78 kW. Usage saving this run: ~900 to 1,300 LOCAL. Demand-charge saving: avoids ~4,000 to 6,000 LOCAL per billing month if this run would set the monthly peak. Modeled — sharpens after your first bills/refills.`

If there is no demand charge tariff:

`Demand-charge saving today: 0. No demand-charge tariff detected on this bill.`

If today's run does not exceed the monthly peak so far:

`Demand-charge saving today: 0. Today does not exceed this billing month's peak so far.`

## V9 success metric

First beta success:

- reduce missed dispatches or at-risk dispatch decisions, and
- reduce usage cost from smarter batching without asking the owner to type daily data.

Secondary metrics:

- less manual planning time
- fewer emergency LPG purchases
- lower modeled energy cost per kg
- fewer small inefficient batches
- lower monthly demand charge only for factories on demand-charge tariffs and only on peak-setting days

## What V9 does not claim

- Not a full ERP.
- Not a full MES.
- Not exact electricity-bill optimization yet.
- Not fully sensor-based yet.
- Demand-charge savings are monthly, not daily.
- Savings are modeled until calibrated by real bills, refill logs, meter readings, and production records.
