# BatchWatt

**Factory operations control for production, procurement, dispatch, and energy.**

BatchWatt helps small factories turn orders, material availability, machine capacity, and electricity constraints into one operational shift plan.

**[Open BatchWatt](https://batchwatt-git-improve-business-flow-usd-whatsapp-ciel5.vercel.app)**

## Current version

The latest version is an operations control console built around one question: **is the shift ready to run?**

It brings production planning, procurement, dispatch risk, and energy into one screen so a supervisor can see blockers before releasing the plan.

## What it does

- Builds a production plan from customer orders, inventory, recipes, machines, and shift capacity.
- Identifies material shortages and procurement actions before production starts.
- Flags blocked orders, late-dispatch risk, overdue inbound materials, and other operational exceptions.
- Tracks planned electrical demand against a configured peak-demand target.
- Shows dispatch readiness, open exceptions, blocked orders, and peak-demand headroom.
- Prevents shift-plan release when critical blockers or peak-limit breaches remain.
- Records a released plan fingerprint so later changes to orders, stock, tariffs, or setup make the release visibly stale.
- Maintains a local audit trail for operational actions and plan releases.
- Uses USD for the current demo and planning workflow.

## Operations workflow

1. Load customer orders and factory inputs.
2. Calculate the production and energy plan.
3. Review the operational work queue.
4. Resolve procurement, dispatch, capacity, or energy exceptions.
5. Recalculate the plan.
6. Release the shift only when hard blockers are cleared.

## Energy layer

BatchWatt treats energy as an operating constraint, not just a reporting metric.

The planner compares machine schedules with the factory's peak-demand target and highlights when the proposed shift would exceed that limit. This lets the operator adjust timing while still protecting production and dispatch requirements.

The synthetic demo includes a case where peak demand is reduced from **82 kW to 40 kW** while completing the same production work with no late dispatches. Actual savings depend on the factory, tariff structure, and operating conditions.

## Pilot context

The project includes work developed from two pilot environments:

- RKG Ghee
- PR Food Products

Pilot context is used to make the workflow realistic while the public demo uses controlled example inputs.

## Architecture

The current application combines:

- a production and energy planning engine
- procurement and inventory logic
- an operational exception engine
- supervisor release controls
- dispatch and run-board views
- local-first saved state and audit history

No API keys or database credentials are required for the current public version.

## Version history

The original BatchWatt V1 is preserved separately in the repository on the `archive/batchwatt-v1` branch.

The current `main` branch contains the latest operations-control version.

## Important note

BatchWatt is decision-support software. It does not control machines, read live meters, place supplier orders, or send payments. A supervisor should review operational plans before use.
