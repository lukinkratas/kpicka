# Politics KPIs

Dashboard app for politics KPIs in the Czech Republic.

  - **Tech Stack:** TypeScript + React + Vite + Tailwind CSS + Recharts, Cloudflare (Pages, Pages Functions, Worker on cron, R2), Terraform, Playwright

  - **Backend:** public APIs of ČSÚ, ČSSZ, ČNB and MF (cached in R2)

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

Data is cached in our infra, so the dashboard survives source outages and we stay a polite API consumer. How each source is loaded depends on whether it allows browser (CORS) requests:

| Source | Page load | Fallback |
| --- | --- | --- |
| ČSÚ, ČSSZ (CORS allowed) | `fetch()` directly from the source API | R2 copy via `/api` |
| ČNB, MF (no CORS) | R2 copy via `/api` | – |

- `worker/cron.ts` – Cloudflare Worker with a daily cron trigger (05:00 UTC). Downloads the raw responses of all sources (plus ČSÚ JSON-stat metadata) into the R2 bucket as `data/<metric>` and `metadata/<metric>`. A failed source keeps its previous copy.
- `functions/api/[[path]].ts` – Pages Function serving the R2 objects same-origin (`/api/data/<metric>`, `/api/metadata/<metric>`), so the bucket needs no public access or CORS.
- `src/data.ts` (`loadMetric`) – picks the path from the table above. Each chart shows "Staženo ze zdroje": the fetch time for a direct load, the cron download time (`Last-Modified`) for an R2 copy.
- In `npm run dev`, `/api` is proxied to the deployed Pages project.
- Deploy infra + worker: `make deploy` (bundles the worker, then `terraform apply`). The Pages site and its functions deploy from GitHub.

**ČSÚ, ČSSZ** – direct fetch, R2 copy as fallback

Cron (daily):

```text
 ┌───────────┐      ┌─────────────┐      ┌───────────┐
 │ ČSÚ, ČSSZ │ ───▶ │ Cron Worker │ ───▶ │ R2 bucket │
 └───────────┘      └─────────────┘      └───────────┘
```

Page load:

```text
 ┌───────────────────┐ direct fetch ┌───────────┐ fallback ┌────────────────┐      ┌───────────┐
 │ Dashboard (React) │ ───────────▶ │ ČSÚ, ČSSZ │ ───────▶ │ Pages Function │ ───▶ │ R2 bucket │
 └───────────────────┘              └───────────┘          │ /api/*         │      └───────────┘
                                                           └────────────────┘
```

**ČNB, MF** – R2 copy only

Cron (daily):

```text
 ┌───────────┐      ┌─────────────┐      ┌───────────┐
 │ ČNB, MF   │ ───▶ │ Cron Worker │ ───▶ │ R2 bucket │
 └───────────┘      └─────────────┘      └───────────┘
```

Page load:

```text
 ┌───────────────────┐      ┌────────────────┐      ┌───────────┐
 │ Dashboard (React) │ ───▶ │ Pages Function │ ───▶ │ R2 bucket │
 └───────────────────┘      │ /api/*         │      └───────────┘
                            └────────────────┘
```
