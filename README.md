# BatchWatt

**Plan production. Reduce peak load. Keep dispatch on time.**

BatchWatt connects procurement, inventory, production and energy planning in one workspace for small factories.

**[Open the latest verified Vercel preview](https://batchwatt-git-improve-business-flow-usd-whatsapp-ciel5.vercel.app)** · **[Vercel project](https://vercel.com/ciel5/batchwatt)** · **[Import the repo into Vercel](https://vercel.com/new)**

## Two pilots in the app

Open **Start & pilots**, then choose **RKG Ghee** or **PR Food Products** to see recorded results, example orders and production decisions. Your current factory draft stays intact.

The working demo and new factory workspaces use **US dollars (USD)** by default.

## What you can do

- **Plan around energy:** compare peak demand, machine load charts, electricity costs and tariff windows.
- **Protect deliveries:** build a production schedule around orders, deadlines, available stock and machine capacity.
- **Manage procurement:** add suppliers, materials and recipes; create purchase records and record partial or full deliveries.
- **Catch shortages:** see missing materials, packaging and capacity before releasing a plan.
- **Save and share:** save reviewed plans, download charts and CSV reports, back up inputs, or copy a message for the floor team.

## WhatsApp

- **Incoming orders:** copy orders from WhatsApp and use **Paste WhatsApp orders** in the app. It shows the expected format and validates the rows.
- **Floor plan:** click **Open in WhatsApp**, choose a contact or group, review the draft and send it.
- Automatic inbox sync and unattended sending are not connected.

## A simple daily routine

The app opens on your **Shift plan**: orders ready from stock, orders needing attention, buying actions, first planned run and estimated electricity cost. Use **Add customer order**, follow the next-step buttons, then review and share the floor plan. Charts and detailed comparisons are under **Explore energy chart, costs and assumptions**.

Set up machines, products, materials, recipes and USD electricity prices once. The setup checklist links straight to each form. Existing rupee demo prices update to the USD demo assumptions. Other saved currencies require an explicit exchange rate before price conversion; original inputs are backed up.

## Start in five steps

1. Open the app and load the demo to explore.
2. Enter your products, machines, suppliers, materials and recipes.
3. Set your shift hours, electricity tariffs and peak-demand target.
4. Add customer orders, review buying requirements and record materials received.
5. Review the proposed schedule, energy chart and dispatch warnings, then save or export your plan.

## Why energy matters

Running several machines together can create an expensive demand peak. BatchWatt compares an earliest-start schedule with one that staggers machine loads while protecting dispatch deadlines.

The synthetic demo models **82 kW peak demand reduced to 40 kW**, with the same production work and no late dispatches.

![Demo: baseline and proposed electricity load](docs/examples/energy-load-comparison.svg)

These are modeled demo results. Actual savings depend on your factory and tariff. Moving production to another time does not automatically reduce total kWh. Monthly demand savings also depend on the peak already reached that month.

## Vercel setup

Use the `main` branch of [this repository](https://github.com/raamnandhakumar-eng/batchwatt).

| Setting | Value |
|---|---|
| Framework preset | Other |
| Root directory | Repository root |
| Build command | `node scripts/build.js` |
| Output directory | `dist` |
| API keys or database credentials | None required for V2 |

The build settings are included in `vercel.json`. The published app includes V2 code, selected pilot summaries and synthetic demo inputs. Raw pilot workbooks are excluded.

## Version 1

The complete original project is preserved in the **[BatchWatt V1 archive](https://github.com/raamnandhakumar-eng/batchwatt/tree/archive/batchwatt-v1)**.

## Data and review

Drafts and saved plans stay in your browser. Export a backup to move them between devices. A supervisor should review each plan before use. Purchase records do not send supplier orders or payments, and BatchWatt does not control machines or read live meters.

## Run locally

With Node.js 22 or later:

```bash
npm install
npm run dev
```

To run tests or generate the sample energy report:

```bash
npm test
npm run demo:energy
```

Read more: [Energy model](docs/energy-model.md) · [Version history](docs/version-history.md).
