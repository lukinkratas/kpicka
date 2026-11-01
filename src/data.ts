export type Row = Record<string, string>
export type Point = { time: number; period: string; value: number; gas?: number }
export const START = Date.UTC(2010, 0, 1)
export const END = Date.now()
const csu = (id: string) => `https://data.csu.gov.cz/api/dotaz/v1/data/vybery/${id}?format=CSV`
export const sources = {
  interest: 'https://www.cnb.cz/cs/casto-kladene-dotazy/.galleries/vyvoj_repo_historie.txt',
  gdpAbsolute: csu('NUC06QT01'), inflation: csu('CEN0101HT02'), gdp: 'https://data.csu.gov.cz/api/dotaz/v1/data/sady/WNUC01B?format=CSV', unemployment: csu('ZAM05T1'),
  debt: 'https://data.mf.gov.cz/katalog/sites/default/files/struktura_a_vyvoj_statniho_dluhu_2026_03.csv',
  energy: csu('CEN0101KT01'), gas: csu('CEN0101IT01'), housing: csu('WCEN04T01'), wages: csu('ZAMG08T1'),
  pensions: 'https://data.cssz.cz/dump/rozlozeni-souboru-duchodcu-podle-vyse-duchodu-v-kvantilovem-vyjadreni.csv',
}
// Public, human-readable data tables alongside the direct API download links.
const csuTable = (id: string) => `https://data.csu.gov.cz/datastat/data/VYBER/${id}?vSel=1`
export const sourcePages = {
  interest: 'https://www.cnb.cz/cs/casto-kladene-dotazy/Jak-se-vyvijela-dvoutydenni-repo-sazba-CNB/',
  gdpAbsolute: csuTable('NUC06QT01'), inflation: csuTable('CEN0101HT02'),
  gdp: csuTable('WNUC01BT01'), unemployment: csuTable('ZAM05T1'),
  debt: 'https://data.mf.gov.cz/katalog/cs/dataset/struktura-vyvoj-statniho-dluhu/resource/33eb66ca-046b-4b52-a1a9-b2cf97d8cb78',
  energy: csuTable('CEN0101KT01'), gas: csuTable('CEN0101IT01'),
  housing: csuTable('WCEN04T01'), wages: csuTable('ZAMG08T1'),
  pensions: 'https://data.cssz.cz/web/otevrena-data/graf-mesicni-vyse-duchodu-podle-roku-kvantilu-a-druhu-duchodu',
}
export type Metric = keyof Omit<typeof sources, 'gas'>
export const metrics: { id: Metric; title: string; subtitle: string; unit: string; source: string }[] = [
  { id: 'interest', title: 'Úroková sazba ČNB', subtitle: 'Dvoutýdenní repo sazba', unit: '%', source: 'ČNB' },
  { id: 'inflation', title: 'Inflace', subtitle: 'Meziroční změna spotřebitelských cen', unit: '%', source: 'ČSÚ' },
  { id: 'gdpAbsolute', title: 'HDP v běžných cenách', subtitle: 'Čtvrtletní HDP · absolutní hodnota', unit: 'mld. Kč', source: 'ČSÚ' },
  { id: 'gdp', title: 'HDP', subtitle: 'Meziroční reálný růst · sezonně očištěno', unit: '%', source: 'ČSÚ' },
  { id: 'unemployment', title: 'Nezaměstnanost', subtitle: 'Obecná míra nezaměstnanosti · celkem', unit: '%', source: 'ČSÚ' },
  { id: 'debt', title: 'Státní dluh', subtitle: 'Celkový státní dluh · stav na konci období', unit: 'mld. Kč', source: 'MF ČR' },
  { id: 'energy', title: 'Cena energií', subtitle: 'Ceníkové ceny pro domácnosti · celkem', unit: 'Kč/MWh', source: 'ČSÚ' },
  { id: 'housing', title: 'Cena bydlení', subtitle: 'Průměrná kupní cena bytů v Česku', unit: 'Kč/m²', source: 'ČSÚ' },
  { id: 'wages', title: 'Medián mezd', subtitle: 'Hrubá měsíční mzda · ženy a muži celkem', unit: 'Kč', source: 'ČSÚ' },
  { id: 'pensions', title: 'Medián důchodů', subtitle: 'Starobní důchody vyplácené sólo', unit: 'Kč', source: 'ČSSZ' },
]

// CSV fields may contain commas, escaped quotes and embedded newlines (MF header).
export function parseCsv(text: string): Row[] {
  const records: string[][] = []
  let record: string[] = [], field = '', quoted = false
  const input = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < input.length; i++) {
    const c = input[i]
    if (c === '"') {
      if (quoted && input[i + 1] === '"') { field += '"'; i++ }
      else quoted = !quoted
    } else if (c === ',' && !quoted) { record.push(field); field = '' }
    else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && input[i + 1] === '\n') i++
      record.push(field)
      if (record.some(Boolean)) records.push(record)
      record = []; field = ''
    } else field += c
  }
  record.push(field)
  if (record.some(Boolean)) records.push(record)
  const headers = records.shift() ?? []
  return records.map(values => Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ''])))
}
const months = ['leden', 'únor', 'březen', 'duben', 'květen', 'červen', 'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec']
export function periodTime(period: string): number {
  if (/^\d{4}-\d{2}-\d{2}$/.test(period)) return Date.parse(period)
  const year = Number(period.match(/\d{4}/)?.[0])
  if (!year) return NaN
  if (period.includes('čtvrtletí')) return Date.UTC(year, Number(period[0]) * 3, 0)
  if (period.includes('pololetí')) return Date.UTC(year, Number(period[0]) * 6, 0)
  const month = months.indexOf(period.split(' ')[0])
  if (month >= 0) return Date.UTC(year, month + 1, 0)
  if (period.includes('/')) return Date.UTC(year, Number(period.split('/')[1]), 0)
  return Date.UTC(year, 11, 31)
}
const numeric = (s: string) => s.trim() ? Number(s.replace(/\s/g, '').replace(',', '.')) : NaN
function selectRows(id: Metric | 'gas', rows: Row[]): Row[] {
  return rows.filter(r => {
    switch (id) {
      case 'inflation': return r.Ukazatel === 'Přírůstek indexu spotřebitelských cen ke stejnému měsíci předchozího roku' && r['Území'] === 'Česko'
      case 'gdpAbsolute': return r.Ukazatel === 'Hrubý domácí produkt (mil. Kč, běžné ceny)' && r['Území'] === 'Česko'
      case 'gdp': return r.Ukazatel === 'Hrubý domácí produkt' && r['Území'] === 'Česko'
      case 'unemployment': return r.Ukazatel === 'Obecná míra nezaměstnanosti (%)' && r['Pohlaví'] === 'Celkem' && r['Území'] === 'Česko'
      case 'energy': case 'gas': return r['Pásmo spotřeby'] === 'Celkem' && r['Území'] === 'Česko'
      case 'housing': return r.Ukazatel === 'Průměrné kupní ceny bytů (Kč za m2)' && r['Území-Stát'] === 'Česko' && !r['Území-Kraj']
      case 'wages': return r.Ukazatel === 'Medián měsíčních mezd (Kč)' && r['Pohlaví'] === 'Celkem' && r['Území'] === 'Česko'
      case 'pensions': return r.kvantil_vyse_duchodu_kod === 'Q50' && r.druh_duchodu_kod === 'PK_OLDAGE_S6a'
      case 'debt': return true
    }
  })
}
export function selectPoints(id: Metric | 'gas', rows: Row[]): Point[] {
  const points = selectRows(id, rows).map(r => {
    const period = r['Měsíce'] ?? r['Čtvrtletí'] ?? r['Pololetí'] ?? r.Roky ?? r.referencni_obdobi ?? r.rok
    const raw = id === 'debt' ? Object.values(r)[1] : id === 'pensions' ? r.mesicni_vyse_duchodu : r.Hodnota
    return { time: periodTime(period), period, value: id === 'gdpAbsolute' ? numeric(raw) / 1000 : numeric(raw) - (id === 'gdp' ? 100 : 0) }
  }).filter(p => Number.isFinite(p.value) && p.time >= START && p.time <= END).sort((a, b) => a.time - b.time)
  if (!points.length) throw new Error('Zdroj nevrátil platná data pro vybraný ukazatel.')
  if (new Set(points.map(p => p.time)).size !== points.length) throw new Error('Zdroj obsahuje více řad pro stejné období. Je nutné ověřit filtr.')
  return points
}
// CNB publishes effective dates, including the rate already in force on 1 Jan 2010.
export function parseInterest(text: string): Point[] {
  const changes = text.trim().replace(/^\uFEFF/, '').split(/\r?\n/).slice(1).map(line => {
    const [day, value] = line.split('|')
    const time = Date.UTC(Number(day.slice(0, 4)), Number(day.slice(4, 6)) - 1, Number(day.slice(6, 8)))
    return { time, value: numeric(value ?? ''), period: `Platí od ${Number(day.slice(6, 8))}. ${Number(day.slice(4, 6))}. ${day.slice(0, 4)}` }
  }).filter(p => Number.isFinite(p.time) && Number.isFinite(p.value) && p.time <= END).sort((a, b) => a.time - b.time)
  const initial = changes.filter(p => p.time <= START).at(-1)
  if (!initial) throw new Error('Zdroj neobsahuje sazbu platnou na začátku období.')
  const points = [{ ...initial, time: START }, ...changes.filter(p => p.time > START)]
  if (points.at(-1)!.time < END) points.push({ ...points.at(-1)!, time: END })
  return points
}
export type SourceMetadata = {
  label?: string
  fields: { label: string; value: string }[]
  notes: string[]
}
type JsonStat = {
  label?: string; source?: string; updated?: string; note?: (string | null)[]
  role?: { time?: string[] }
  dimension: Record<string, {
    label: string; note?: (string | null)[]
    category: { label: Record<string, string>; unit?: Record<string, { label?: string; symbol?: string }> }
  }>
}
// Keep source wording verbatim, but only include categories used by the displayed series.
export function readMetadata(json: JsonStat, rows: Row[]): SourceMetadata {
  const values = new Set(rows.flatMap(row => Object.values(row)))
  const fields: SourceMetadata['fields'] = []
  const notes = [...(json.note ?? [])]
  if (json.source) fields.push({ label: 'Zdroj', value: json.source })
  if (json.updated) fields.push({ label: 'Aktualizováno u zdroje', value: json.updated })
  for (const [id, dimension] of Object.entries(json.dimension)) {
    if (json.role?.time?.includes(id)) {
      fields.push({ label: 'Časové členění', value: dimension.label })
      continue
    }
    const selected = Object.entries(dimension.category.label).filter(([, label]) => values.has(label))
    if (!selected.length) continue
    fields.push({ label: dimension.label, value: selected.map(([, label]) => label).join(' · ') })
    const units = [...new Set(selected.flatMap(([code]) => {
      const unit = dimension.category.unit?.[code]
      return unit ? [unit.label, unit.symbol].filter((s): s is string => !!s) : []
    }))]
    if (units.length) fields.push({ label: 'Jednotka zdroje', value: units.join(' · ') })
    notes.push(...(dimension.note ?? []))
  }
  return { label: json.label, fields, notes: [...new Set(notes.filter((s): s is string => !!s?.trim()))] }
}
export type MetricData = { points: Point[]; metadata: Partial<Record<Metric | 'gas', SourceMetadata>> }
export async function loadMetric(id: Metric, signal: AbortSignal): Promise<MetricData> {
  async function get(key: Metric | 'gas'): Promise<MetricData> {
    const url = new URL(sources[key])
    const isCsu = url.host === 'data.csu.gov.cz'
    const prefix = isCsu ? '/api/csu' : url.host === 'data.mf.gov.cz' ? '/api/mf' : url.host === 'www.cnb.cz' ? '/api/cnb' : '/api/cssz'
    const path = prefix + url.pathname
    async function request(query: string) {
      const response = await fetch(path + query, { signal, cache: 'no-store' })
      if (!response.ok) throw new Error(`Zdroj dat je nedostupný (HTTP ${response.status}).`)
      return response
    }
    // A metadata outage must not hide otherwise available observations.
    const [response, json] = await Promise.all([
      request(url.search),
      isCsu ? request('').then(r => r.json() as Promise<JsonStat>).catch(() => null) : null,
    ])
    const text = new TextDecoder(key === 'debt' ? 'windows-1250' : 'utf-8').decode(await response.arrayBuffer())
    const rows = key === 'interest' ? [] : parseCsv(text)
    const selected = selectRows(key, rows)
    const metadata: MetricData['metadata'] = {}
    if (json) metadata[key] = readMetadata(json, selected)
    else if (!isCsu) {
      const headers = key === 'interest' ? text.replace(/^\uFEFF/, '').split(/\r?\n/)[0].split('|') : Object.keys(rows[0] ?? {})
      const fields = [{ label: 'Sloupce zdroje', value: headers.join(' · ') }]
      // Preserve constant source dimensions (including the exact pension/quantile codes).
      for (const header of headers) {
        const values = [...new Set(selected.map(row => row[header]).filter(Boolean))]
        if (values.length === 1) fields.push({ label: header, value: values[0] })
      }
      metadata[key] = { fields, notes: [] }
    }
    return { points: key === 'interest' ? parseInterest(text) : selectPoints(key, rows), metadata }
  }
  if (id !== 'energy') return get(id)
  const [electricity, gas] = await Promise.all([get('energy'), get('gas')])
  return {
    points: electricity.points.map(p => ({ ...p, gas: gas.points.find(g => g.time === p.time)?.value })),
    metadata: { ...electricity.metadata, ...gas.metadata },
  }
}
