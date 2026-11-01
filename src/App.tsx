import { useEffect, useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { END, START, loadMetric, metrics, sources, type Point } from './data'
import { premiers } from './premiers'
import './App.css'

const format = (n: number, digits = 0) => new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n)
const date = (time: number) => new Date(time).toLocaleDateString('cs-CZ', { timeZone: 'UTC' })
const ticks = Array.from({ length: Math.floor((new Date(END).getUTCFullYear() - 2010) / 2) + 1 }, (_, i) => Date.UTC(2010 + i * 2, 0, 1))

function MetricCard({ metric }: { metric: typeof metrics[number] }) {
  const [result, setResult] = useState<{ points: Point[]; loaded: number }>()
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(new Error('Časový limit načítání vypršel.')), 45000)
    loadMetric(metric.id, controller.signal).then(points => {
      if (!controller.signal.aborted) setResult({ points, loaded: Date.now() })
    }).catch((e: Error) => {
      if (controller.signal.reason !== 'unmount') setError(e.message || 'Data se nepodařilo načíst.')
    }).finally(() => clearTimeout(timeout))
    return () => { clearTimeout(timeout); controller.abort('unmount') }
  }, [metric.id, attempt])
  const latest = result?.points.at(-1)
  const digits = metric.unit === '%' ? 1 : metric.id === 'debt' ? 2 : 0
  return <article className="metric-card" id={metric.id}>
    <div className="card-top"><span className="eyebrow">{metric.source} / ČESKÁ REPUBLIKA</span><span className="unit">{metric.unit}</span></div>
    <h2>{metric.title}</h2><p className="subtitle">{metric.subtitle}</p>
    <div className="reading"><strong>{latest ? format(latest.value, digits) : '—'}<small>{metric.unit}</small></strong><span>{latest ? `Období: ${latest.period}` : 'Čekáme na zdroj dat'}</span></div>
    {metric.id === 'energy' && <div className="legend"><span>● Elektřina</span><span>● Plyn{latest?.gas !== undefined ? ` · ${format(latest.gas)} Kč/MWh` : ''}</span></div>}
    {result ? <>
      <div className="premier-strip" aria-label="Předsedové vlád v zobrazeném období">
        {premiers.map((p, i) => {
          const left = Math.max(START, p.time)
          const right = premiers[i + 1]?.time ?? END
          return <a key={p.start} href={p.wiki} target="_blank" rel="noreferrer" style={{ left: `${(left - START) / (END - START) * 100}%`, width: `${(right - left) / (END - START) * 100}%` }} title={`${p.name} · vláda od ${date(p.time)} · portrét a licence na Wikipedii`}><img src={p.image} alt={p.name} /><span>{p.name.split(' ').map(n => n[0]).join('')}</span></a>
        })}
      </div>
      <div className="chart" role="img" aria-label={`${metric.title}: ${result.points.length} hodnot od ${result.points[0].period} do ${latest?.period}. Poslední hodnota ${latest ? format(latest.value, digits) : ''} ${metric.unit}.`}>
        <ResponsiveContainer width="100%" height={225}>
          <LineChart data={result.points} margin={{ left: 0, right: 16, top: 6, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#e1e5df" strokeDasharray="3 4" />
            <XAxis type="number" dataKey="time" domain={[START, END]} ticks={ticks} tickFormatter={t => String(new Date(t).getUTCFullYear()).slice(2)} tickLine={false} axisLine={false} fontSize={11} tickMargin={12} />
            <YAxis width={58} tickFormatter={v => Math.abs(v) >= 10000 ? `${format(v / 1000)} tis.` : format(v, metric.unit === '%' ? 1 : 0)} axisLine={false} tickLine={false} fontSize={10} domain={['auto', 'auto']} />
            {premiers.filter(p => p.time >= START).map(p => <ReferenceLine key={p.start} x={p.time} stroke="#a9bcaa" strokeDasharray="3 4" />)}
            <Tooltip labelFormatter={t => date(Number(t))} formatter={(v, name) => [`${format(Number(v), digits)} ${metric.unit}`, name]} contentStyle={{ border: '1px solid #a9bcaa', borderRadius: 8, fontSize: 12 }} />
            <Line name={metric.id === 'energy' ? 'Elektřina' : metric.title} type="linear" dataKey="value" stroke="#192C26" strokeWidth={2.4} dot={result.points.length < 20 ? { r: 2, fill: '#192C26' } : false} activeDot={{ r: 5 }} isAnimationActive={false} />
            {metric.id === 'energy' && <Line name="Plyn" type="linear" dataKey="gas" stroke="#6E6347" strokeWidth={2.4} dot={{ r: 2 }} isAnimationActive={false} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="coverage">Dostupná řada: {result.points[0].period} – {latest?.period}. Chybějící historii nedoplňujeme.</p>
    </> : <div className="chart-placeholder" role="status">{error ? <><span>Data se nepodařilo načíst.</span><small>{error}</small><button onClick={() => { setError(''); setAttempt(attempt + 1) }}>Zkusit znovu ↻</button></> : <><span className="loading-dot" />Načítáme data ze zdroje…</>}</div>}
    <details><summary>Co přesně graf ukazuje</summary><p>{metric.note}</p><p>Čárkované čáry označují nástup vlád do funkce. Časová souvislost sama o sobě nedokazuje vliv vlády na ukazatel. Roční a pololetní údaje jsou umístěné na konci období.</p></details>
    <footer className="card-footer"><div>Zdroj: {metric.source} · <a href={sources[metric.id]} target="_blank" rel="noreferrer">API / CSV ↗</a>{metric.id === 'energy' && <> · <a href={sources.gas} target="_blank" rel="noreferrer">Plyn ↗</a></>}<span>{result ? `Načteno: ${new Date(result.loaded).toLocaleString('cs-CZ')}` : 'Zatím bez platného načtení'}</span></div></footer>
  </article>
}

function App() {
  return <>
    <header className="site-header"><a className="brand" href="#"><span className="brand-mark">▥</span> Česko v číslech<span className="prototype">PROTOTYP</span></a><a href="#zdroje">O datech <span>↗</span></a></header>
    <main>
      <section className="intro"><div className="eyebrow">EKONOMIKA V SOUVISLOSTECH</div><h1>Jak se žije v Česku<span>?</span></h1><p>Osm ukazatelů. Jedna časová osa. Prohlédněte si vývoj české ekonomiky<br className="desktop-break" /> a životní úrovně v kontextu jednotlivých vlád.</p><div className="intro-bottom"><span className="period"><span>◷</span> 1. ledna 2010 — {date(END)}</span><span className="live"><i /> Živá data z veřejných zdrojů</span></div></section>
      <nav className="metric-nav" aria-label="Ukazatele">{metrics.map(m => <a key={m.id} href={`#${m.id}`}>{m.title}</a>)}</nav>
      <div className="section-heading"><h2>Přehled ukazatelů</h2><span>ČSÚ · MF ČR · ČSSZ</span></div>
      <section className="dashboard" aria-label="Ekonomické ukazatele">{metrics.map(m => <MetricCard key={m.id} metric={m} />)}</section>
      <section className="about" id="zdroje"><h2>Veřejná data. Otevřený kontext.</h2><p>Grafy načítáme přímo z veřejných zdrojů při otevření stránky, bez ukládání do cache. Každý ukazatel má vlastní četnost a datum posledního pozorování. Prázdná část grafu znamená, že použitý zdroj pro dané období neposkytuje data.</p><p>Portréty premiérů pocházejí z hlavních obrázků české Wikipedie. Kliknutím na portrét otevřete příslušný článek s informacemi o obrázku a jeho licenci.</p></section>
    </main>
    <footer className="site-footer"><strong>Česko v číslech</strong><p>Zdroj dat: Český statistický úřad (ČSÚ), Ministerstvo financí ČR a Česká správa sociálního zabezpečení.</p><p><a href="https://csu.gov.cz/podminky_pro_vyuzivani_a_dalsi_zverejnovani_statistickych_udaju_csu" target="_blank" rel="noreferrer">Podmínky užití dat ČSÚ ↗</a> · Tato aplikace není spojena s ČSÚ ani ostatními poskytovateli dat.</p></footer>
  </>
}
export default App
