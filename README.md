# BatchWatt

**Know what to buy, what to produce, when to run it, and what the energy impact is.**

BatchWatt is a factory decision console for small manufacturers. It turns customer orders, finished stock, raw-material availability, supplier lead times, production capacity, and electricity tariffs into one daily operating plan.

**[Open BatchWatt](https://batchwatt-git-improve-business-flow-usd-whatsapp-ciel5.vercel.app)**

## Core workflow

1. **Buy** — identifies materials to purchase, quantity, supplier, lead time, recommended timing, and estimated spend.
2. **Produce** — sequences production by order due time, material availability, line capacity, changeovers, and operating constraints.
3. **Dispatch** — separates orders ready from finished stock, scheduled for production, late, or blocked.
4. **Energy** — shows peak demand, tariff-window exposure, modeled shift energy cost, and energy-aware timing changes.

Energy is an insight layer, not the primary objective. BatchWatt protects production and dispatch first. It only keeps an energy-aware schedule when committed work remains scheduled, lateness does not worsen, and the modeled bill does not increase.

## Decision console

The current V3.1 console puts the daily decisions first:

- immediate procurement actions
- what should run next
- a detailed production sequence
- supplier and material timing
- dispatch readiness
- production blockers and exceptions
- peak-demand headroom
- peak-tariff overlap by production run
- supervisor release controls
- local audit history

## Pilots

The app keeps recorded pilot evidence from **RKG Ghee** and **PR Food Products** separate from the synthetic live demo.

**RKG Ghee**
- 32 orders across 10 pilot cycles
- recorded planning-time reduction: 64.2%
- recorded energy reduction: 8.8%
- recorded peak reduction: 11.7%

**PR Food Products**
- 41 orders across 9 pilot cycles
- recorded planning-time reduction: 62.3%
- recorded energy reduction: 6.7%
- recorded peak reduction: 9.0%

The pilot view also keeps example production decisions and sequencing recommendations from both environments.

## Previous versions

The original BatchWatt V1 remains preserved on the `archive/batchwatt-v1` branch. The detailed V2 planner also remains in the current build while V3.1 is the default console.

## Important note

BatchWatt is decision-support software. It does not control machines, read live meters, send supplier orders, or make payments. Energy and savings outputs are modeled estimates. A supervisor should review the operating plan before release.
