# Politics KPIs

Dashboard app for politics KPIs in the Czech Republic.

  - **Tech Stack:** Typescript React + Recharts

**Backend:** CSU public API

```sh
npm install
npm run dev
```

```sh
npm run build
npm run lint
npm test
```

### Architecture

- Data is cached in our infra rather than proxying every user request to the source APIs. This protects from outages and keeps a polite API consumer.
- `worker/cron.ts` – Cloudflare Worker with a daily cron trigger; downloads the raw source responses (and ČSÚ JSON-stat metadata) into the R2 bucket. A failed source keeps its previous copy.
- `functions/api/[[path]].ts` – Pages Function serving R2 objects same-origin (`/api/data/<metric>`, `/api/metadata/<metric>`); `Last-Modified` is the download time shown in each chart.
- In `npm run dev`, `/api` is proxied to the deployed Pages project.
- Deploy infra + worker: `make deploy` (bundles the worker, then `terraform apply`). The Pages site and its functions deploy from GitHub.

 ┌──────────┐  cron/daily   ┌──────────────┐      ┌───────────┐
 │ ČSÚ, ČNB │ ───────────▶  │ Cron Worker  │ ───▶ │ R2 bucket │
 │ MF, ČSSZ │ CSV/JSON-STAT └──────────────┘      └─────┬─────┘
 └──────────┘                                           │
                                              ┌─────────▼─────────┐
                                              │ Pages Function    │
                                              │ /api/*            │
                                              └─────────┬─────────┘
                                              ┌─────────▼─────────┐
                                              │ Dashboard (React) │
                                              │ footer: "Zdroj:   │
                                              │ ČSÚ" + link       │
                                              └───────────────────┘
