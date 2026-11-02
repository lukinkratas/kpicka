import { useCallback, useEffect, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  END,
  START,
  loadMetric,
  metrics,
  sourcePages,
  sources,
  type Metric,
  type MetricData,
} from "./data";
import { partyColors, premiers, type Party } from "./premiers";
import { splitByTerm } from "./chartData";
import "./App.css";

const format = (n: number, digits = 0) =>
  new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: digits }).format(n);
const date = (time: number) => new Date(time).toLocaleDateString("cs-CZ", { timeZone: "UTC" });
const ticks = Array.from(
  { length: Math.floor((new Date(END).getUTCFullYear() - 2010) / 2) + 1 },
  (_, i) => Date.UTC(2010 + i * 2, 0, 1),
);
const groups: { id: string; title: string; ids: Metric[]; units: string[] }[] = [
  {
    id: "income",
    title: "Inflace, mzdy a důchody",
    ids: ["inflation", "wages", "pensions"],
    units: ["%", "Kč"],
  },
  {
    id: "prices",
    title: "Inflace, energie a bydlení",
    ids: ["inflation", "energy", "gas", "housing"],
    units: ["%", "Kč/MWh", "Kč/m²"],
  },
  { id: "debt", title: "Státní dluh a HDP", ids: ["debt", "gdpAbsolute"], units: ["mld. Kč"] },
  {
    id: "employment",
    title: "Nezaměstnanost a růst HDP",
    ids: ["unemployment", "gdp", "interest", "inflation"],
    units: ["%"],
  },
];
const dashes = ["", "7 4", "2 4", "10 3 2 3"];
const termsOfUse = [
  ["ČSÚ", "https://csu.gov.cz/podminky_pro_vyuzivani_a_dalsi_zverejnovani_statistickych_udaju_csu"],
  ["MF ČR", sourcePages.debt],
  ["ČSSZ", "https://data.cssz.cz/web/otevrena-data/podminky-uziti"],
  [
    "ČNB",
    "https://www.cnb.cz/cs/ochrana-osobnich-udaju-a-pravni-ujednani/podminky-uzivani-internetovych-stranek-cnb/",
  ],
];
type Result = MetricData & { loaded: number };
type Results = Partial<Record<Metric, Result>>;

function DataFormatLinks({ id }: { id: Metric }) {
  const title = metrics.find((m) => m.id === id)!.title;
  if (!sources[id].startsWith("https://data.csu.gov.cz/")) {
    const format = id === "interest" ? "TXT" : "CSV";
    return (
      <>
        {" · "}
        <a href={sources[id]} target="_blank" rel="noreferrer" aria-label={`${title} – ${format}`}>
          {format} ↗
        </a>
      </>
    );
  }
  return (
    <>
      {" · "}
      <a
        href={sources[id].replace("?format=CSV", "")}
        target="_blank"
        rel="noreferrer"
        aria-label={`${title} – JSON`}
      >
        JSON ↗
      </a>
      {" · "}
      <a href={sources[id]} target="_blank" rel="noreferrer" aria-label={`${title} – CSV`}>
        CSV ↗
      </a>
    </>
  );
}

function ComparisonCard({
  group,
  results,
  errors,
  retry,
  active,
}: {
  group: (typeof groups)[number];
  results: Results;
  errors: Partial<Record<Metric, string>>;
  retry: (id: Metric) => void;
  active: boolean[];
}) {
  const series = group.ids.map((id) => ({
    ...metrics.find((m) => m.id === id)!,
    points: results[id]?.points ?? [],
  }));
  const chartData = [...new Set(series.flatMap((s) => s.points.map((p) => p.time)))]
    .sort((a, b) => a - b)
    .map((time) => ({ time }));
  return (
    <article className="metric-card" id={group.id}>
      <div className="card-heading">
        <div className="card-top">
          <span className="eyebrow">ČESKÁ REPUBLIKA / SROVNÁNÍ</span>
          <span className="unit">2010 — {new Date(END).getUTCFullYear()}</span>
        </div>
        <h2>{group.title}</h2>
        <p className="subtitle">
          {group.units.length > 1
            ? "Různé jednotky mají samostatné osy. Výšky křivek nelze přímo porovnávat."
            : group.id === "debt"
              ? "Stav dluhu a HDP za poslední 4 čtvrtletí v běžných cenách · mld. Kč"
              : "Nezaměstnanost, růst HDP, 2T repo sazba ČNB a inflace · %"}
        </p>
      </div>
      <div className="series-readings">
        {series.map((s, i) => {
          const latest = s.points.at(-1);
          return (
            <div key={s.title}>
              <span>
                <svg width="30" height="10" aria-hidden="true">
                  <line
                    x1="0"
                    x2="30"
                    y1="5"
                    y2="5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray={dashes[i]}
                  />
                </svg>
                {s.title}
              </span>
              <strong>
                {latest
                  ? format(latest.value, s.id === "interest" ? 2 : s.unit === "%" ? 1 : 0)
                  : "—"}{" "}
                <small>{s.unit}</small>
              </strong>
              <small>{latest?.period ?? "Čekáme na zdroj dat"}</small>
            </div>
          );
        })}
      </div>
      <div className="legend" aria-label="Legenda ukazatelů">
        {series.map((s, i) => (
          <span key={s.title}>
            <svg width="30" height="10" aria-hidden="true">
              <line
                x1="0"
                x2="30"
                y1="5"
                y2="5"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray={dashes[i]}
              />
            </svg>
            {s.title} ({s.unit})
          </span>
        ))}
      </div>
      <div className="card-chart">
        {chartData.length > 0 && (
          <div
            className="chart"
            role="img"
            aria-label={`${group.title}, od 1. ledna 2010 do ${date(END)}`}
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ left: 0, right: 0, top: 12, bottom: 0 }}>
                <CartesianGrid
                  vertical={false}
                  stroke="var(--color-chart-grid)"
                  strokeDasharray="3 4"
                />
                <XAxis
                  type="number"
                  dataKey="time"
                  domain={[START, END]}
                  ticks={ticks}
                  tickFormatter={(t) => String(new Date(t).getUTCFullYear()).slice(2)}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tickMargin={12}
                />
                {group.units.map((unit, i) => (
                  <YAxis
                    key={unit}
                    yAxisId={unit}
                    orientation={i === 0 ? "left" : "right"}
                    width={unit === "%" ? 40 : 58}
                    tickFormatter={(v) =>
                      Math.abs(v) >= 10000
                        ? `${format(v / 1000)} tis.`
                        : format(v, unit === "%" ? 1 : 0)
                    }
                    label={{
                      value: unit,
                      angle: -90,
                      position: i === 0 ? "insideLeft" : "insideRight",
                      fontSize: 10,
                    }}
                    axisLine={false}
                    tickLine={false}
                    fontSize={10}
                    domain={["auto", "auto"]}
                  />
                ))}
                {premiers
                  .filter((p) => p.time >= START)
                  .map((p) => (
                    <ReferenceLine
                      key={p.start}
                      yAxisId={group.units[0]}
                      x={p.time}
                      stroke={partyColors[p.party]}
                      strokeOpacity={0.3}
                      strokeDasharray="3 4"
                    />
                  ))}
                <Tooltip
                  content={({ active: visible, label }) => {
                    if (!visible) return null;
                    const time = Number(label);
                    const term = premiers.findLastIndex((p) => p.time <= time);
                    return (
                      <div className="chart-tooltip">
                        <strong>{date(time)}</strong>
                        <p>
                          {premiers[term]?.name} · {premiers[term]?.party}
                        </p>
                        {series.map((s) => {
                          // The repo rate in force applies until the next change.
                          const point =
                            s.id === "interest"
                              ? s.points.findLast((p) => p.time <= time)
                              : s.points.find((p) => p.time === time);
                          return (
                            point && (
                              <p key={s.title}>
                                {s.title}:{" "}
                                {format(
                                  point.value,
                                  s.id === "interest" ? 2 : s.unit === "%" ? 1 : 0,
                                )}{" "}
                                {s.unit}
                              </p>
                            )
                          );
                        })}
                      </div>
                    );
                  }}
                />
                {series.flatMap((s, i) =>
                  splitByTerm(s.points, s.id === "interest").map((points, term) => (
                    <Line
                      key={`${s.title}-${term}`}
                      data={points}
                      yAxisId={s.unit}
                      name={s.title}
                      type={s.id === "interest" ? "stepAfter" : "linear"}
                      dataKey="value"
                      stroke={partyColors[premiers[term].party]}
                      strokeOpacity={active[term] ? 1 : 0.12}
                      strokeDasharray={dashes[i]}
                      strokeWidth={2.3}
                      dot={false}
                      activeDot={false}
                      isAnimationActive={false}
                    />
                  )),
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        {group.ids.map((id) =>
          errors[id] ? (
            <div className="source-error" role="status" key={id}>
              <span>
                {metrics.find((m) => m.id === id)!.title}: Data se nepodařilo načíst. {errors[id]}
              </span>
              <button onClick={() => retry(id)}>Zkusit znovu ↻</button>
            </div>
          ) : (
            !results[id] && (
              <p role="status" key={id}>
                Načítáme {metrics.find((m) => m.id === id)!.title.toLocaleLowerCase("cs")} ze
                zdroje…
              </p>
            )
          ),
        )}
      </div>
      <div className="card-notes">
        <details>
          <summary>Co přesně graf ukazuje</summary>
          {group.ids.map((id) => {
            const result = results[id];
            const metadata = result?.metadata;
            return (
              <section key={id} className="source-metadata">
                <h3>{metrics.find((m) => m.id === id)!.title}</h3>
                {metadata ? (
                  <>
                    {metadata.label && <p>{metadata.label}</p>}
                    <dl>
                      {metadata.fields.map((field, i) => (
                        <div key={i}>
                          <dt>{field.label}</dt>
                          <dd>{field.value}</dd>
                        </div>
                      ))}
                    </dl>
                    {metadata.notes.map((note) => (
                      <p key={note}>{note}</p>
                    ))}
                  </>
                ) : (
                  <p>{result ? "Metadata zdroje nejsou dostupná." : "Načítáme metadata zdroje…"}</p>
                )}
                {result && (
                  <p>
                    Zobrazené období: {result.points[0].period} – {result.points.at(-1)!.period}
                  </p>
                )}
              </section>
            );
          })}
        </details>
        {group.ids.includes("gdp") && (
          <p className="calculation-note">
            Vlastní výpočet aplikace: růst HDP = objemový index ČSÚ − 100.
          </p>
        )}
        {group.ids.includes("gdpAbsolute") && (
          <p className="calculation-note">
            Vlastní výpočet aplikace: HDP v mld. Kč = součet údajů ČSÚ za poslední 4 čtvrtletí v
            mil. Kč ÷ 1 000.
          </p>
        )}
      </div>
      <footer className="card-footer">
        {group.ids.map((id) => (
          <div key={id}>
            Dostupné na: {metrics.find((m) => m.id === id)!.source} ·{" "}
            <a href={sourcePages[id]} target="_blank" rel="noreferrer">
              {metrics.find((m) => m.id === id)!.title} ↗
            </a>
            <DataFormatLinks id={id} />
            <span>
              {results[id]
                ? `Načteno: ${new Date(results[id]!.loaded).toLocaleString("cs-CZ")}`
                : "Zatím bez platného načtení"}
            </span>
          </div>
        ))}
      </footer>
    </article>
  );
}

function App() {
  const [results, setResults] = useState<Results>({});
  const [errors, setErrors] = useState<Partial<Record<Metric, string>>>({});
  const [excludedTerms, setExcludedTerms] = useState<string[]>([]);
  const [excludedParties, setExcludedParties] = useState<Party[]>([]);
  // In-flight requests per source, so a retry never restarts other sources.
  const requests = useRef(new Map<Metric, AbortController>());
  const load = useCallback((id: Metric) => {
    const controller = new AbortController();
    requests.current.set(id, controller);
    const timeout = setTimeout(
      () => controller.abort(new Error("Časový limit načítání vypršel.")),
      45000,
    );
    loadMetric(id, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setResults((previous) => ({ ...previous, [id]: { ...data, loaded: Date.now() } }));
          setErrors((previous) => ({ ...previous, [id]: undefined }));
        }
      })
      .catch((error: Error) => {
        if (controller.signal.reason !== "unmount")
          setErrors((previous) => ({ ...previous, [id]: error.message }));
      })
      .finally(() => {
        clearTimeout(timeout);
        if (requests.current.get(id) === controller) requests.current.delete(id);
      });
  }, []);
  useEffect(() => {
    const inFlight = requests.current;
    metrics.forEach((metric) => load(metric.id));
    return () => inFlight.forEach((controller) => controller.abort("unmount"));
  }, [load]);
  const active = premiers.map(
    (p) => !excludedTerms.includes(p.start) && !excludedParties.includes(p.party),
  );
  return (
    <>
      <main>
        <section className="intro">
          <h1>KPIčka</h1>
          <p className="intro-quote">
            „Ono se to nějak vyvrbí. Ještě nikdy nebylo, aby nějak nebylo.“ - Dobrý voják Švejk
          </p>
          <p>Prohlédněte si vývoj české ekonomiky v kontextu jednotlivých vlád.</p>
        </section>
        <section className="filters" aria-label="Filtry vlád a politických stran">
          <div className="filter-heading">
            <h2>Vlády v čase</h2>
            <button
              onClick={() => {
                setExcludedTerms([]);
                setExcludedParties([]);
              }}
            >
              Zobrazit vše ↻
            </button>
          </div>
          <p>
            Kliknutím na období nebo stranu ztlumíte odpovídající části všech grafů. Časová osa
            zůstává stejná.
          </p>
          <div className="timeline-scroll">
            <div className="premier-strip">
              {premiers.map((p, i) => {
                const start = Math.max(START, p.time),
                  end = premiers[i + 1]?.time ?? END;
                return (
                  <button
                    key={p.start}
                    className={active[i] ? "" : "faded"}
                    aria-pressed={!excludedTerms.includes(p.start)}
                    aria-label={`${p.name} · ${p.party} · ${date(start)} – ${date(end)}`}
                    title={`${p.name} · ${p.party} · vláda od ${date(p.time)} do ${date(end)}`}
                    style={{
                      left: `${((start - START) / (END - START)) * 100}%`,
                      width: `${((end - start) / (END - START)) * 100}%`,
                      borderColor: partyColors[p.party],
                    }}
                    onClick={() =>
                      setExcludedTerms((previous) =>
                        previous.includes(p.start)
                          ? previous.filter((t) => t !== p.start)
                          : [...previous, p.start],
                      )
                    }
                  >
                    <img src={p.image} alt={p.name} />
                    <span>{p.name}</span>
                    <small>{p.party}</small>
                  </button>
                );
              })}
              <div className="timeline-years">
                {ticks.map((time) => (
                  <span key={time} style={{ left: `${((time - START) / (END - START)) * 100}%` }}>
                    {new Date(time).getUTCFullYear()}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="party-filters" aria-label="Politické strany">
            <strong>Strany premiérů</strong>
            {(Object.keys(partyColors) as Party[]).map((party) => (
              <button
                key={party}
                aria-pressed={!excludedParties.includes(party)}
                className={excludedParties.includes(party) ? "faded" : ""}
                onClick={() =>
                  setExcludedParties((previous) =>
                    previous.includes(party)
                      ? previous.filter((p) => p !== party)
                      : [...previous, party],
                  )
                }
              >
                <i style={{ background: partyColors[party] }} />
                {party}
              </button>
            ))}
          </div>
          <p className="filter-note">
            Období vymezujeme nástupem vlád do funkce, nikoli datem voleb. Nestr. = nestranický
            premiér úřednické vlády. Filtry se kombinují; zvýrazněná jsou období povolená oběma
            filtry.
          </p>
        </section>
        <nav className="metric-nav" aria-label="Ukazatele">
          {groups.map((g) => (
            <a key={g.id} href={`#${g.id}`}>
              {g.title}
            </a>
          ))}
        </nav>
        <div className="section-heading">
          <h2>Přehled ukazatelů</h2>
          <span>ČSÚ · MF ČR · ČSSZ · ČNB</span>
        </div>
        <section className="dashboard" aria-label="Ekonomické ukazatele">
          {groups.map((group) => (
            <ComparisonCard
              key={group.id}
              group={group}
              results={results}
              errors={errors}
              active={active}
              retry={(id) => {
                setErrors((previous) => ({ ...previous, [id]: undefined }));
                load(id);
              }}
            />
          ))}
        </section>
        <section className="about" id="zdroje">
          <h2>Veřejná data. Otevřený kontext.</h2>
          <p>
            Grafy načítáme přímo z veřejných zdrojů při otevření stránky, bez ukládání do cache.
            Každý ukazatel má vlastní četnost a datum posledního pozorování. Prázdná část grafu
            znamená, že použitý zdroj pro dané období neposkytuje data.
          </p>
          <p>
            Portréty premiérů pocházejí z hlavních obrázků české Wikipedie. Informace o obrázcích a
            jejich licencích:{" "}
            {premiers
              .filter((p, i) => premiers.findIndex((other) => other.name === p.name) === i)
              .map((p) => (
                <a key={p.name} href={p.wiki} target="_blank" rel="noreferrer">
                  {p.name} ↗{" "}
                </a>
              ))}
          </p>
        </section>
      </main>
      <footer className="site-footer">
        <strong>Česko v číslech</strong>
        <p>
          Zdroj dat: Český statistický úřad (ČSÚ), Ministerstvo financí ČR, Česká správa sociálního
          zabezpečení a Česká národní banka (ČNB).
        </p>
        <p>
          Podmínky užití dat:{" "}
          {termsOfUse.map(([provider, href], i) => (
            <span key={provider}>
              {i > 0 && " · "}
              <a href={href} target="_blank" rel="noreferrer">
                {provider} ↗
              </a>
            </span>
          ))}
        </p>
        <p>Tato aplikace není spojena s ČSÚ ani ostatními poskytovateli dat.</p>
      </footer>
    </>
  );
}
export default App;
