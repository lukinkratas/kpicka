# Politics KPIs

Dashboard app for politics KPIs in the Czech Republic.

**Tech Stack:** Typescript React + Recharts
**Backend:** CSU public API

## Prototype dashboard

```sh
npm install
npm run dev
```

All eight charts use the same axis from **1 January 2010 to the current date**.
The charts display only observations actually supplied by the selected source;
shorter series leave an empty section rather than fabricating history.

Requests are forwarded on demand through the Vite development/preview proxy
(`/api/csu`, `/api/mf`, `/api/cssz`) because the providers do not all allow browser
CORS. There is no database, scheduled ingestion, local storage, or response cache.
The static production build requires equivalent proxy routes on its serving host;
`npm run preview` provides these routes locally. Infrastructure is unchanged.

- Inflation: monthly year-on-year consumer price change (ČSÚ).
- GDP: seasonally adjusted year-on-year volume index, converted to growth by
  subtracting 100. Uses the whole WNUC01B dataset, not its rolling table selection.
- Unemployment: general unemployment rate, both sexes, ages 15–64 (ČSÚ).
- State debt: Ministry of Finance state debt, in CZK billions. The supplied CSV
  is a dated release (March 2026), not an automatically discovered latest release.
  It uses Windows-1250 encoding and mixed number formats.
- Energy: half-year household electricity and gas **price-list prices**, all
  consumption bands; these are not the separate realized-price series.
- Housing: annual average apartment purchase price per square metre (ČSÚ).
- Wages: annual median gross monthly wages, both sexes (ČSÚ).
- Pensions: ČSSZ Q50, PK_OLDAGE_S6a, solo old-age pensions excluding SR/SRN pensions.

Prime minister markers use the dates their **governments took office**, not
parliamentary election dates. Portraits are the main images from the linked Czech
Wikipedia articles; those pages link to the image credits and licenses.

```sh
npm run build
npm run lint
npm test
```

Browser tests use an installed Google Chrome and live provider APIs. They check
all eight series, the common time axis, mobile overflow, and recovery from a
failed source request. Playwright starts the development server automatically.
