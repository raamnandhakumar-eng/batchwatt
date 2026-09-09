# V2 energy model

## Objective

Make peak demand and the cost of simultaneous machine operation visible before a factory releases its production plan. Energy is the lead decision, while dispatch deadlines and resource feasibility constrain the recommendation.

## Inputs

Orders have stable IDs, product IDs, quantities, priorities and exact local due times. Each product has one assigned line, units per hour, finished stock and packaging stock. Each line has operating kW and a product changeover time. The shift specifies a planning date and same-day start/end in 15-minute increments.

Energy inputs are background kW, a peak target, the maximum demand already recorded this month, off-peak/peak energy prices, a peak tariff window and a linear monthly demand rate. The currency is a three-letter display code. There is no automatic tariff lookup or meter connection.

## Allocation and scheduling

1. Sort by due time, then urgency, then stable order ID.
2. Reserve finished stock and packaging once across each product's orders.
3. Hold orders with packaging shortages. Do not silently schedule them.
4. Baseline: schedule each eligible order at its line's earliest available time.
5. Candidate: scan 15-minute start slots. Prefer less lateness, less target exceedance, then lower incremental energy charge plus modeled monthly demand exposure. Reserve enough remaining line time for later orders.
6. Include product changeovers at line operating power; round short runs/changeovers up to a full interval.
7. Reject the candidate if the scheduled order set differs from the baseline, any order's lateness increases, or combined modeled shift cost and demand exposure increases.

This greedy heuristic does not guarantee a global optimum. A rejected candidate falls back to the baseline, with a visible explanation. Even a retained plan can exceed an infeasible target; the app flags that condition rather than inventing a feasible answer.

## Bill calculations

For each interval:

`kWh = total operating kW × 0.25 hours`

`Shift energy charge = sum(interval kWh × applicable price per kWh)`

`Incremental demand exposure = max(0, modeled shift peak − month peak so far) × monthly demand rate`

`Conditional demand saving = baseline exposure − proposed exposure`

The final monthly peak can be set by another day. Demand savings are therefore conditional, not daily recurring savings. The interface displays the energy-charge comparison and conditional demand-charge comparison separately. Moving the same operating load between time slots does not itself save kWh; a plan can have a small increase in shift energy cost while avoiding a much larger conditional demand charge.

## Boundaries that affect a factory decision

- Validate operating loads and tariff values against meter and bill records.
- The tariff model excludes ratchets, minimum billed demand, power-factor adjustments, penalties and taxes.
- One line per product; multi-stage dependencies, raw materials, labor, safety and detailed process constraints are not scheduled.
- Startup transients are not represented as billing-interval demand. Changeovers run at the configured line kW.
- Quantities retain each product's own unit; unlike SKUs are not summed into a misleading physical output measure.
- Blocked work remains in the dispatch report; it is not counted as energy savings.
- Plans need supervisor review. No equipment-control or WhatsApp delivery command is issued.

## Data and review

The browser uses the same `createEnergyPlan` implementation as the stateless Vercel API. Browser calculations stay on the device. Drafts and up to eight reviewed snapshots use browser storage, with explicit export and restore. Any input edit clears the current review checkbox. Saved snapshots retain their inputs, output, demo status and review timestamp.

Device storage is not a multi-user production database or immutable audit log. Cloud synchronization, live metering, authenticated approvals and real WhatsApp intake remain separate future integrations.
