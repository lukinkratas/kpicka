export type Row = Record<string, string>
export type Point = { time: number; period: string; value: number; gas?: number }
export const START = Date.UTC(2010, 0, 1)
export const END = Date.now()
const csu = (id: string) => `https://data.csu.gov.cz/api/dotaz/v1/data/vybery/${id}?format=CSV`
export const sources = {
  inflation: csu('CEN0101HT02'), gdp: 'https://data.csu.gov.cz/api/dotaz/v1/data/sady/WNUC01B?format=CSV', unemployment: csu('ZAM05T1'),
  debt: 'https://data.mf.gov.cz/katalog/sites/default/files/struktura_a_vyvoj_statniho_dluhu_2026_03.csv',
  energy: csu('CEN0101KT01'), gas: csu('CEN0101IT01'), housing: csu('WCEN04T01'), wages: csu('ZAMG08T1'),
  pensions: 'https://data.cssz.cz/dump/rozlozeni-souboru-duchodcu-podle-vyse-duchodu-v-kvantilovem-vyjadreni.csv',
}
export type Metric = keyof Omit<typeof sources, 'gas'>
export const metrics: { id: Metric; title: string; subtitle: string; unit: string; source: string; note: string }[] = [
  { id: 'inflation', title: 'Inflace', subtitle: 'Meziroční změna spotřebitelských cen', unit: '%', source: 'ČSÚ', note: 'Změna proti stejnému měsíci předchozího roku.' },
  { id: 'gdp', title: 'HDP', subtitle: 'Meziroční reálný růst · sezonně očištěno', unit: '%', source: 'ČSÚ', note: 'Vlastní přepočet: objemový index ČSÚ minus 100. Meziroční objemová změna, sezonně očištěná.' },
  { id: 'unemployment', title: 'Nezaměstnanost', subtitle: 'Obecná míra nezaměstnanosti · celkem', unit: '%', source: 'ČSÚ', note: 'Výběrové šetření pracovních sil, věk 15–64 let. Nejde o podíl registrovaných uchazečů.' },
  { id: 'debt', title: 'Státní dluh', subtitle: 'Celkový státní dluh · stav na konci období', unit: 'mld. Kč', source: 'MF ČR', note: 'Roční stavy a poslední dostupný měsíční stav. Státní dluh se liší od dluhu vládního sektoru. Použitý soubor: březen 2026.' },
  { id: 'energy', title: 'Cena energií', subtitle: 'Ceníkové ceny pro domácnosti · celkem', unit: 'Kč/MWh', source: 'ČSÚ', note: 'Pololetní ceníkové ceny elektřiny a zemního plynu, všechna pásma spotřeby.' },
  { id: 'housing', title: 'Cena bydlení', subtitle: 'Průměrná kupní cena bytů v Česku', unit: 'Kč/m²', source: 'ČSÚ', note: 'Roční průměr kupních cen bytů. Nejde o nájemné ani nabídkové ceny.' },
  { id: 'wages', title: 'Medián mezd', subtitle: 'Hrubá měsíční mzda · ženy a muži celkem', unit: 'Kč', source: 'ČSÚ', note: 'Roční medián měsíčních mezd ze strukturální mzdové statistiky.' },
  { id: 'pensions', title: 'Medián důchodů', subtitle: 'Starobní důchody vyplácené sólo', unit: 'Kč', source: 'ČSSZ', note: '50. kvantil (Q50), starobní důchody sólo mimo důchody SR a SRN (PK_OLDAGE_S6a). Stav k 31. prosinci.' },
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
export function selectPoints(id: Metric | 'gas', rows: Row[]): Point[] {
  const points = rows.filter(r => {
    switch (id) {
      case 'inflation': return r.Ukazatel === 'Přírůstek indexu spotřebitelských cen ke stejnému měsíci předchozího roku' && r['Území'] === 'Česko'
      case 'gdp': return r.Ukazatel === 'Hrubý domácí produkt' && r['Území'] === 'Česko'
      case 'unemployment': return r.Ukazatel === 'Obecná míra nezaměstnanosti (%)' && r['Pohlaví'] === 'Celkem' && r['Území'] === 'Česko'
      case 'energy': case 'gas': return r['Pásmo spotřeby'] === 'Celkem' && r['Území'] === 'Česko'
      case 'housing': return r.Ukazatel === 'Průměrné kupní ceny bytů (Kč za m2)' && r['Území-Stát'] === 'Česko' && !r['Území-Kraj']
      case 'wages': return r.Ukazatel === 'Medián měsíčních mezd (Kč)' && r['Pohlaví'] === 'Celkem' && r['Území'] === 'Česko'
      case 'pensions': return r.kvantil_vyse_duchodu_kod === 'Q50' && r.druh_duchodu_kod === 'PK_OLDAGE_S6a'
      case 'debt': return true
    }
  }).map(r => {
    const period = r['Měsíce'] ?? r['Čtvrtletí'] ?? r['Pololetí'] ?? r.Roky ?? r.referencni_obdobi ?? r.rok
    const raw = id === 'debt' ? Object.values(r)[1] : id === 'pensions' ? r.mesicni_vyse_duchodu : r.Hodnota
    return { time: periodTime(period), period, value: numeric(raw) - (id === 'gdp' ? 100 : 0) }
  }).filter(p => Number.isFinite(p.value) && p.time >= START && p.time <= END).sort((a, b) => a.time - b.time)
  if (!points.length) throw new Error('Zdroj nevrátil platná data pro vybraný ukazatel.')
  if (new Set(points.map(p => p.time)).size !== points.length) throw new Error('Zdroj obsahuje více řad pro stejné období. Je nutné ověřit filtr.')
  return points
}
export async function loadMetric(id: Metric, signal: AbortSignal): Promise<Point[]> {
  async function get(key: Metric | 'gas') {
    const url = new URL(sources[key])
    const prefix = url.host === 'data.csu.gov.cz' ? '/api/csu' : url.host === 'data.mf.gov.cz' ? '/api/mf' : '/api/cssz'
    const response = await fetch(prefix + url.pathname + url.search, { signal, cache: 'no-store' })
    if (!response.ok) throw new Error(`Zdroj dat je nedostupný (HTTP ${response.status}).`)
    const text = new TextDecoder(key === 'debt' ? 'windows-1250' : 'utf-8').decode(await response.arrayBuffer())
    return selectPoints(key, parseCsv(text))
  }
  if (id !== 'energy') return get(id)
  const [electricity, gas] = await Promise.all([get('energy'), get('gas')])
  return electricity.map(p => ({ ...p, gas: gas.find(g => g.time === p.time)?.value }))
}
