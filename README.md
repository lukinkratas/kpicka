# Politics KPIs

Dashboard app for politics KPIs in the Czech Republic.

**Tech Stack:** Typescript React + Recharts
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
- Prototype will be done with proxy API calls.

 ┌──────────┐  cron/daily   ┌─────────────┐      ┌──────────┐
 │ ČSÚ API  │ ───────────▶  │ ETL (Python)│ ───▶ │ DB /     │
 │ DataStat │ CSV/JSON-STAT └─────────────┘      │ S3 cache │
 └──────────┘                                    └─────┬────┘
                                                       │
                                              ┌────────▼──────────┐
                                              │ Dashboard (React) │
                                              │ footer: "Zdroj:   │
                                              │ ČSÚ" + link       │
                                              └───────────────────┘

