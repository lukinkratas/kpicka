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
  usePlotArea,
  useXAxisScale,
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
import svejk from "./assets/svejk.webp";

const format = (n: number, digits = 0) =>
  new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: digits }).format(n);
const date = (time: number) => new Date(time).toLocaleDateString("cs-CZ", { timeZone: "UTC" });
const ticks = Array.from(
  { length: Math.floor((new Date(END).getUTCFullYear() - 2010) / 2) + 1 },
  (_, i) => Date.UTC(2010 + i * 2, 0, 1),
);
const groups: { id: string; title: string; subtitle?: string; ids: Metric[]; units: string[] }[] = [
  {
    id: "income",
    title: "Inflace, mzdy a důchody",
    ids: ["inflation", "wages", "pensions"],
    units: ["%", "Kč"],
  },
  {
    id: "energy",
    title: "Energie",
    subtitle: "Ceníkové ceny elektřiny a plynu pro domácnosti · Kč/MWh",
    ids: ["energy", "gas"],
    units: ["Kč/MWh"],
  },
  {
    id: "housing",
    title: "Bydlení",
    subtitle: "Průměrná kupní cena bytů v Česku · Kč/m²",
    ids: ["housing"],
    units: ["Kč/m²"],
  },
  {
    id: "debt",
    title: "Státní dluh a HDP",
    subtitle: "Stav dluhu a HDP za poslední 4 čtvrtletí v běžných cenách · mld. Kč",
    ids: ["debt", "gdpAbsolute"],
    units: ["mld. Kč"],
  },
  {
    id: "rates",
    title: "Úroková sazba a inflace",
    subtitle: "2T repo sazba ČNB a meziroční inflace · %",
    ids: ["interest", "inflation"],
    units: ["%"],
  },
  {
    id: "unemployment",
    title: "Nezaměstnanost",
    subtitle: "Obecná míra nezaměstnanosti · %",
    ids: ["unemployment"],
    units: ["%"],
  },
  {
    id: "gdp",
    title: "Růst HDP",
    subtitle: "Meziroční reálný růst HDP · sezonně očištěno · %",
    ids: ["gdp"],
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
type Results = Partial<Record<Metric, MetricData>>;

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

// Premier portraits above the plot area, centered on each term.
// Clicking a portrait toggles the same global term filter as the timeline.
function PremierAvatars({
  chartId,
  active,
  toggleTerm,
}: {
  chartId: string;
  active: boolean[];
  toggleTerm: (start: string) => void;
}) {
  const scale = useXAxisScale();
  const plot = usePlotArea();
  if (!scale || !plot) return null;
  const r = 11;
  return (
    <g aria-hidden="true">
      {premiers.map((p, i) => {
        const x = (scale(Math.max(START, p.time))! + scale(premiers[i + 1]?.time ?? END)!) / 2;
        // The scale is not ready on the first render.
        if (!Number.isFinite(x)) return null;
        const y = plot.y - r - 6;
        const clip = `avatar-${chartId}-${i}`;
        return (
          <g
            key={p.start}
            opacity={active[i] ? 1 : 0.3}
            style={{ cursor: "pointer" }}
            onClick={() => toggleTerm(p.start)}
          >
            <title>{`${p.name} · ${p.party} · kliknutím zapnete nebo ztlumíte období`}</title>
            <clipPath id={clip}>
              <circle cx={x} cy={y} r={r} />
            </clipPath>
            <image
              href={p.image}
              x={x - r}
              y={y - r}
              width={r * 2}
              height={r * 2}
              preserveAspectRatio="xMidYMin slice"
              clipPath={`url(#${clip})`}
            />
            <circle cx={x} cy={y} r={r} fill="none" stroke={partyColors[p.party]} strokeWidth={2} />
          </g>
        );
      })}
    </g>
  );
}

function ComparisonCard({
  group,
  results,
  errors,
  retry,
  active,
  toggleTerm,
}: {
  group: (typeof groups)[number];
  results: Results;
  errors: Partial<Record<Metric, string>>;
  retry: (id: Metric) => void;
  active: boolean[];
  toggleTerm: (start: string) => void;
}) {
  // Series muted in this chart only; they stay plotted so axes do not rescale.
  const [hiddenSeries, setHiddenSeries] = useState<Metric[]>([]);
  const series = group.ids.map((id) => ({
    ...metrics.find((m) => m.id === id)!,
    points: results[id]?.points ?? [],
  }));
  const chartData = [...new Set(series.flatMap((s) => s.points.map((p) => p.time)))]
    .sort((a, b) => a - b)
    .map((time) => ({ time }));
  return (
    <article
      className="metric-card row-span-6 mb-4 grid min-w-0 scroll-mt-5 grid-cols-1 grid-rows-subgrid gap-y-0 overflow-hidden rounded-xl border border-t-4 border-border border-t-text-muted bg-surface px-4.5 pt-5.25 even:border-t-accent nth-[4n+3]:border-t-ochre md:mb-5 md:px-6.25 md:pt-6.25"
      id={group.id}
    >
      <div>
        <div className="mb-3 flex items-center justify-between">
          <span className="rounded-sm border border-ochre bg-ochre px-2 py-0.75 text-[10px] font-semibold text-text">
            2010 — {new Date(END).getUTCFullYear()}
          </span>
        </div>
        <h2 className="font-display text-[22px] font-[550] tracking-[-0.6px]">{group.title}</h2>
        <p className="mt-1 text-[12px] text-text-muted">
          {group.units.length > 1
            ? "Různé jednotky mají samostatné osy. Výšky křivek nelze přímo porovnávat."
            : group.subtitle}
        </p>
      </div>
      <div className="series-readings my-5.5 grid grid-cols-2 content-start gap-3">
        {series.map((s, i) => {
          const latest = s.points.at(-1);
          return (
            <div
              key={s.title}
              className="group flex min-w-0 flex-col gap-1.75 rounded-lg border border-t-3 border-sage border-t-text-muted bg-sage/28 p-2.75 even:border-accent/35 even:border-t-accent even:bg-accent/10 md:p-3.5"
            >
              <span className="flex items-center gap-1.5 text-[11px]">
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
              <strong className="font-display text-[21px] font-medium tracking-[-0.8px] tabular-nums group-even:text-accent md:text-[25px]">
                {latest
                  ? format(latest.value, s.id === "interest" ? 2 : s.unit === "%" ? 1 : 0)
                  : "—"}{" "}
                <small className="font-sans text-[10px] font-normal tracking-normal text-text-muted">
                  {s.unit}
                </small>
              </strong>
              <small className="text-[10px] text-text-muted">
                {latest?.period ?? "Čekáme na zdroj dat"}
              </small>
            </div>
          );
        })}
      </div>
      <div
        className="legend mb-3 flex min-h-7.5 flex-wrap gap-x-4 gap-y-2 text-[10px]"
        aria-label="Legenda ukazatelů"
      >
        {series.map((s, i) => (
          <button
            key={s.title}
            aria-pressed={!hiddenSeries.includes(s.id)}
            className={`flex items-center gap-1.5 ${hiddenSeries.includes(s.id) ? "opacity-25" : ""}`}
            onClick={() =>
              setHiddenSeries((previous) =>
                previous.includes(s.id)
                  ? previous.filter((id) => id !== s.id)
                  : [...previous, s.id],
              )
            }
          >
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
          </button>
        ))}
      </div>
      <div>
        {chartData.length > 0 && (
          <div
            className="chart -mx-1.25"
            role="img"
            aria-label={`${group.title}, od 1. ledna 2010 do ${date(END)}`}
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ left: 0, right: 0, top: 36, bottom: 0 }}>
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
                  tickFormatter={(t) => String(new Date(t).getUTCFullYear())}
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
                    domain={group.id === "housing" ? [0, "auto"] : ["auto", "auto"]}
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
                <PremierAvatars chartId={group.id} active={active} toggleTerm={toggleTerm} />
                <Tooltip
                  content={({ active: visible, label }) => {
                    if (!visible) return null;
                    const time = Number(label);
                    const term = premiers.findLastIndex((p) => p.time <= time);
                    return (
                      <div className="rounded-lg border border-t-3 border-sage border-t-ochre bg-surface p-2.5 text-[11px] leading-[1.8]">
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
                      strokeOpacity={active[term] && !hiddenSeries.includes(s.id) ? 1 : 0.12}
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
            <div
              className="flex flex-col items-start gap-2.5 py-3 text-[11px] text-text-muted md:flex-row md:items-center"
              role="status"
              key={id}
            >
              <span>
                {metrics.find((m) => m.id === id)!.title}: Data se nepodařilo načíst. {errors[id]}
              </span>
              <button
                className="shrink-0 rounded-md border border-border bg-surface px-3 py-1.75"
                onClick={() => retry(id)}
              >
                Zkusit znovu ↻
              </button>
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
      <div>
        <details className="border-t border-border-subtle py-3 text-[11px] text-text-muted [&_p]:pt-2 [&_p]:leading-[1.7]">
          <summary className="cursor-pointer">Co přesně graf ukazuje</summary>
          {group.ids.map((id) => {
            const result = results[id];
            const metadata = result?.metadata;
            return (
              <section key={id} className="source-metadata">
                <h3 className="mt-3 text-[12px] font-bold">
                  {metrics.find((m) => m.id === id)!.title}
                </h3>
                {metadata ? (
                  <>
                    {metadata.label && <p>{metadata.label}</p>}
                    <dl className="my-2">
                      {metadata.fields.map((field, i) => (
                        <div key={i} className="mt-1.5">
                          <dt className="font-semibold">{field.label}</dt>
                          <dd className="wrap-anywhere">{field.value}</dd>
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
          <p className="pb-3 text-[10px] text-text-muted">
            Vlastní výpočet aplikace: růst HDP = objemový index ČSÚ − 100.
          </p>
        )}
        {group.ids.includes("gdpAbsolute") && (
          <p className="pb-3 text-[10px] text-text-muted">
            Vlastní výpočet aplikace: HDP v mld. Kč = součet údajů ČSÚ za poslední 4 čtvrtletí v
            mil. Kč ÷ 1 000.
          </p>
        )}
      </div>
      <footer className="card-footer -mx-4.5 border-t border-sage bg-sage/20 px-4.5 py-3 text-[10px] text-text-muted md:-mx-6.25 md:px-6.25 md:py-3.25 [&_a]:underline-offset-3">
        {group.ids.map((id) => (
          <div key={id} className="flex flex-wrap items-center gap-1 not-first:mt-2">
            Dostupné na: {metrics.find((m) => m.id === id)!.source} ·{" "}
            <a href={sourcePages[id]} target="_blank" rel="noreferrer">
              {metrics.find((m) => m.id === id)!.title} ↗
            </a>
            <DataFormatLinks id={id} />
            <span className="w-full text-[9px] md:ml-auto md:w-auto">
              {results[id]
                ? `Staženo ze zdroje: ${new Date(results[id]!.loaded).toLocaleString("cs-CZ")}`
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
          setResults((previous) => ({ ...previous, [id]: data }));
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
  const toggleTerm = (start: string) =>
    setExcludedTerms((previous) =>
      previous.includes(start) ? previous.filter((t) => t !== start) : [...previous, start],
    );
  const active = premiers.map(
    (p) => !excludedTerms.includes(p.start) && !excludedParties.includes(p.party),
  );
  return (
    <>
      <main className="mx-auto max-w-[1272px] px-4 md:px-6">
        <section className="grid grid-cols-[minmax(0,1fr)_96px] items-center gap-x-4 pt-9.5 pb-6 md:grid-cols-[minmax(0,1fr)_auto] md:gap-x-10 md:pt-15.5 md:pb-8.75">
          <h1 className="col-1 mt-4 mb-4.5 font-display text-[length:clamp(36px,4.7vw,62px)] leading-[1.15] font-[550] tracking-[-1.6px] after:mt-2.5 after:block after:h-1.5 after:w-18 after:rounded-[3px] after:bg-ochre md:tracking-[-2.7px]">
            KPIčka
          </h1>
          <p className="col-1 mb-5 max-w-[680px] border-l-3 border-ochre py-1.5 pl-4.5 font-[Georgia,serif] text-[length:clamp(19px,2.3vw,25px)] leading-[1.6] text-accent italic">
            „Ono se to nějak vyvrbí. Ještě nikdy nebylo, aby nějak nebylo.“ - Dobrý voják Švejk
          </p>
          <p className="col-1 text-[14px] leading-[1.8] text-text-muted md:text-[16px]">
            Prohlédněte si vývoj české ekonomiky v kontextu jednotlivých vlád.
          </p>
          <img
            className="col-2 row-1 h-auto w-24 md:row-[1/span_3] md:w-[clamp(180px,22vw,280px)]"
            src={svejk}
            alt=""
            width={560}
            height={613}
          />
        </section>
        <section
          className="mb-6 rounded-xl border border-sage bg-sage/35 px-3 py-4.5 md:p-6"
          aria-label="Filtry vlád a politických stran"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-[18px] font-[550]">Vlády v čase</h2>
            <button
              className="rounded-md border border-text-muted bg-text-muted px-3 py-1.75 text-[11px] text-surface hover:border-ochre hover:bg-ochre hover:text-text"
              onClick={() => {
                setExcludedTerms([]);
                setExcludedParties([]);
              }}
            >
              Zobrazit vše ↻
            </button>
          </div>
          <p className="mt-2 mb-4 text-[12px] leading-[1.7] text-text-muted">
            Kliknutím na období nebo stranu ztlumíte odpovídající části všech grafů. Časová osa
            zůstává stejná.
          </p>
          <div className="overflow-x-auto pt-2 pb-2.5">
            <div className="premier-strip relative mx-7.5 h-37.5 min-w-240">
              {premiers.map((p, i) => {
                const start = Math.max(START, p.time),
                  end = premiers[i + 1]?.time ?? END;
                return (
                  <button
                    key={p.start}
                    className={`absolute top-0 flex h-28.75 flex-col items-center justify-start gap-1 border-b-4 px-0.5 text-[10px] transition-opacity duration-150 ${active[i] ? "" : "faded opacity-25"}`}
                    aria-pressed={!excludedTerms.includes(p.start)}
                    aria-label={`${p.name} · ${p.party} · ${date(start)} – ${date(end)}`}
                    title={`${p.name} · ${p.party} · vláda od ${date(p.time)} do ${date(end)}`}
                    style={{
                      left: `${((start - START) / (END - START)) * 100}%`,
                      width: `${((end - start) / (END - START)) * 100}%`,
                      borderColor: partyColors[p.party],
                    }}
                    onClick={() => toggleTerm(p.start)}
                  >
                    <img
                      className="size-11.5 rounded-[10px] border-3 object-cover object-[center_20%] ring-1 ring-border"
                      src={p.image}
                      alt={p.name}
                      style={{ borderColor: partyColors[p.party] }}
                    />
                    <span className="font-display">{p.name}</span>
                    <small className="text-[9px]">{p.party}</small>
                  </button>
                );
              })}
              <div className="absolute top-31.25 w-full text-[10px] text-text-muted">
                {ticks.map((time) => (
                  <span
                    key={time}
                    className="absolute -translate-x-1/2"
                    style={{ left: `${((time - START) / (END - START)) * 100}%` }}
                  >
                    {new Date(time).getUTCFullYear()}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div
            className="mt-3.5 flex flex-wrap items-center gap-2.5 text-[12px]"
            aria-label="Politické strany"
          >
            <strong className="mr-2 font-medium">Strany premiérů</strong>
            {(Object.keys(partyColors) as Party[]).map((party) => (
              <button
                key={party}
                aria-pressed={!excludedParties.includes(party)}
                className={`flex items-center gap-1.75 rounded-md border border-border bg-surface px-3 py-1.75 aria-pressed:border-text-muted aria-pressed:bg-surface/75 ${excludedParties.includes(party) ? "opacity-25" : ""}`}
                onClick={() =>
                  setExcludedParties((previous) =>
                    previous.includes(party)
                      ? previous.filter((p) => p !== party)
                      : [...previous, party],
                  )
                }
              >
                <i className="size-2.5 rounded-full" style={{ background: partyColors[party] }} />
                {party}
              </button>
            ))}
          </div>
          <p className="mt-3.5 text-[10px] leading-[1.7] text-text-muted">
            Období vymezujeme nástupem vlád do funkce, nikoli datem voleb. Nestr. = nestranický
            premiér úřednické vlády. Filtry se kombinují; zvýrazněná jsou období povolená oběma
            filtry.
          </p>
        </section>
        <nav
          className="flex flex-wrap gap-1.5 border-y border-border py-3.5 md:gap-2 md:py-4.5"
          aria-label="Ukazatele"
        >
          {groups.map((g) => (
            <a
              key={g.id}
              href={`#${g.id}`}
              className="rounded-md border border-text bg-text px-2.25 py-1.5 text-[11px] text-surface no-underline hover:border-ochre hover:bg-ochre hover:text-text md:px-3.25 md:py-1.75 md:text-[12px]"
            >
              {g.title}
            </a>
          ))}
        </nav>
        <div className="mt-7.75 mb-4.5 flex items-center justify-between">
          <h2 className="font-display text-[18px] font-[550] tracking-[-0.4px]">
            Přehled ukazatelů
          </h2>
          <span className="text-[9px] tracking-[1px] text-text-muted md:text-[10px]">
            ČSÚ · MF ČR · ČSSZ · ČNB
          </span>
        </div>
        <section
          className="grid grid-cols-1 md:grid-cols-2 md:gap-x-5"
          aria-label="Ekonomické ukazatele"
        >
          {groups.map((group) => (
            <ComparisonCard
              key={group.id}
              group={group}
              results={results}
              errors={errors}
              active={active}
              toggleTerm={toggleTerm}
              retry={(id) => {
                setErrors((previous) => ({ ...previous, [id]: undefined }));
                load(id);
              }}
            />
          ))}
        </section>
        <section
          className="max-w-185 py-8.5 before:mb-4.5 before:block before:h-1 before:w-12 before:rounded-xs before:bg-ochre md:pt-13 md:pb-11.5 [&_p]:mt-2.5 [&_p]:text-[12px] [&_p]:leading-[1.9] [&_p]:text-text-muted"
          id="zdroje"
        >
          <h2 className="mb-3.25 font-display text-[22px] font-normal tracking-[-0.6px]">
            Veřejná data. Otevřený kontext.
          </h2>
          <p>
            Data ČSÚ a ČSSZ načítáme přímo ze zdroje při otevření stránky. Ostatní zdroje a záložní
            kopii pro případ výpadku stahujeme jednou denně do vlastní cache. U každého ukazatele
            uvádíme čas posledního úspěšného stažení; každý má vlastní četnost a datum posledního
            pozorování. Prázdná část grafu znamená, že použitý zdroj pro dané období neposkytuje
            data.
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
      <footer className="border-t-4 border-ochre bg-text px-4 py-6 text-[11px] text-sage md:px-[max(24px,calc((100%_-_1224px)/2))] md:pt-7.5 md:pb-9.5 [&_a]:underline-offset-3 [&_p]:mt-1.25">
        <strong className="mb-3.5 block font-display text-[14px] font-normal text-ochre">
          Česko v číslech
        </strong>
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
