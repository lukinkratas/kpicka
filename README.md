# Politics KPIs

Dashboard app for politics KPIs in the Czech Republic.

**Tech Stack:** Typescript React + Recharts
**Backend:** CSU public API

## Prototype dashboard

```sh
npm install
npm run dev
```

All four comparison charts use the same axis from **1 January 2010 to the current date**.
The charts display only observations actually supplied by the selected source;
shorter series leave an empty section rather than fabricating history.

Requests are forwarded on demand through the Vite development/preview proxy
(`/api/csu`, `/api/mf`, `/api/cssz`, `/api/cnb`) because the providers do not all allow browser
CORS. There is no database, scheduled ingestion, local storage, or response cache.
The static production build requires equivalent proxy routes on its serving host;
`npm run preview` provides these routes locally. Infrastructure is unchanged.

- Interest rate: ČNB 2-week repo rate, effective-date history drawn as a step curve.
- Inflation: monthly year-on-year consumer price change (ČSÚ).
- Absolute GDP: ČSÚ NUC06QT01, quarterly nominal GDP at current prices,
  converted from CZK millions to billions. Shown with state debt; quarterly
  output and a debt stock are different quantities, not a debt/GDP ratio.
- GDP growth: seasonally adjusted year-on-year volume index, converted to growth by
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
all nine data series, the common time axis, party/term filters, mobile overflow, and recovery from a
failed source request. Playwright starts the development server automatically.

The four charts compare inflation/wages/pensions, inflation/energy/housing,
state debt/nominal GDP, and unemployment/GDP growth/repo rate/inflation, in that order. Units use
separate labeled axes; dash styles identify indicators, party colors identify
government terms. Design colors live in `src/tokens.css`; CSS and Recharts use the same custom properties.
Party mappings in `src/premiers.ts` reference those tokens. Fischer and Rusnok are
classified as nonpartisan caretaker prime ministers, not as their former parties.
The shared timeline and party buttons combine to fade excluded periods without
changing the time axis or deleting observations. Boundary interpolation is solely
for drawing continuous color transitions and is excluded from tooltip readings.

Chart details load ČSÚ JSON metadata alongside CSV observations on demand, without
caching. Dataset titles, selected dimension/indicator labels, source units, time
grouping, notes, and update timestamps retain the API wording. Other providers
show file headers and constant selected values. Application GDP calculations are
labeled separately outside the source metadata sections.
