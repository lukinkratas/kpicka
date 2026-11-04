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

### Target architecture

- Cache the data in our infra rather than proxying every user request to the ČSÚ API. This protects from outages and keeps a polite API consumer.
- A daily cron Worker (`etl/`) copies every source into R2; the dashboard reads it through a Pages Function (`functions/api/`). In `npm run dev`, the Vite proxy serves the same `/api/<host><path>` route live from the sources.

 ┌──────────┐  cron/daily   ┌─────────────┐      ┌──────────┐
 │ ČSÚ API  │ ───────────▶  │ ETL (Worker)│ ───▶ │ R2       │
 │ DataStat │ CSV/JSON-STAT └─────────────┘      │ bucket   │
 └──────────┘                                    └─────┬────┘
                                                       │
                                              ┌────────▼──────────┐
                                              │ Dashboard (React) │
                                              │ footer: "Zdroj:   │
                                              │ ČSÚ" + link       │
                                              └───────────────────┘

