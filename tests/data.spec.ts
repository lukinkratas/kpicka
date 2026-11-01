import { splitByTerm } from '../src/chartData'
import { premiers } from '../src/premiers'
import { test, expect } from '@playwright/test'
import { parseCsv, readMetadata, parseInterest, START, END, periodTime, selectPoints } from '../src/data'

test('parses quoted MF headers and mixed thousands/decimal separators', () => {
  const csv = 'rok,"STÁTNÍ\nDLUH",poznámka\r\n2013,"1\u00a0683,3","text s ""uvozovkami"""\r\n2020," 2 049,7",\r\n'
  const rows = parseCsv(csv)
  expect(rows[0].poznámka).toBe('text s "uvozovkami"')
  expect(selectPoints('debt', rows).map(p => p.value)).toEqual([1683.3, 2049.7])
})

test('converts GDP indices to growth and excludes pre-2010 data', () => {
  const rows = ['4. čtvrtletí 2009', '1. čtvrtletí 2010'].map(period => ({ Ukazatel: 'Hrubý domácí produkt', Území: 'Česko', Čtvrtletí: period, Hodnota: '101.8' }))
  const points = selectPoints('gdp', rows)
  expect(points).toHaveLength(1)
  expect(points[0].value).toBeCloseTo(1.8)
  expect(points[0].time).toBe(Date.UTC(2010, 2, 31))
})

test('selects the pension median for the exact pension population', () => {
  const base = { referencni_obdobi: '2025-12-31', mesicni_vyse_duchodu: '21020', kvantil_vyse_duchodu_kod: 'Q50', druh_duchodu_kod: 'PK_OLDAGE_S6a' }
  expect(selectPoints('pensions', [base, { ...base, kvantil_vyse_duchodu_kod: 'Q90' }, { ...base, druh_duchodu_kod: 'PK_IT' }])).toHaveLength(1)
})

test('rejects ambiguous rows rather than merging different populations', () => {
  const row = { Ukazatel: 'Medián měsíčních mezd (Kč)', Pohlaví: 'Celkem', Území: 'Česko', Roky: '2024', Hodnota: '41742' }
  expect(() => selectPoints('wages', [row, row])).toThrow('více řad')
  expect(selectPoints('wages', [row, { ...row, Pohlaví: 'Ženy' }, { ...row, Hodnota: '' }])).toHaveLength(1)
  expect(periodTime('1. pololetí 2026')).toBe(Date.UTC(2026, 5, 30))
  expect(periodTime('2026/03')).toBe(Date.UTC(2026, 2, 31))
})


test('converts nominal quarterly GDP to billions without changing its meaning', () => {
  const points = selectPoints('gdpAbsolute', [{ Ukazatel: 'Hrubý domácí produkt (mil. Kč, běžné ceny)', Území: 'Česko', Čtvrtletí: '2. čtvrtletí 2025', Hodnota: '2248976' }])
  expect(points[0].value).toBe(2248.976)
})


test('splits a connecting line exactly at government boundaries without extrapolating', () => {
  const boundary = premiers[1].time
  const points = [{ time: boundary - 86400000, period: 'before', value: 10 }, { time: boundary + 86400000, period: 'after', value: 20 }]
  const segments = splitByTerm(points)
  expect(segments[0].at(-1)).toMatchObject({ time: boundary, value: 15, period: '' })
  expect(segments[1][0]).toMatchObject({ time: boundary, value: 15 })
  expect(segments.slice(2).flat()).toHaveLength(0)
})


test('keeps the repo rate in force at the start, exact effective dates and current rate', () => {
  const points = parseInterest('PLATNA_OD|CNB_REPO_SAZBA_V_%\n20091217|1,00\n20100507|0,75\n20121102|0,05\n20990101|99,00')
  expect(points[0]).toMatchObject({ time: START, value: 1 })
  expect(points[1]).toMatchObject({ time: Date.UTC(2010, 4, 7), value: 0.75 })
  expect(points.at(-1)).toMatchObject({ time: END, value: 0.05, period: 'Platí od 2. 11. 2012' })
  const boundary = splitByTerm(points, true)[0].at(-1)!
  expect(boundary.time).toBe(premiers[1].time)
  expect(boundary.value).toBe(0.75)
})


test('uses source metadata verbatim and excludes unselected indicators and units', () => {
  const metadata = readMetadata({
    label: 'Míra inflace', source: 'DataStat – databáze ČSÚ', updated: '2026-10-01T07:00Z',
    note: [null, 'Poznámka přímo ze zdroje'], role: { time: ['CasM'] },
    dimension: {
      CasM: { label: 'Měsíce', category: { label: { '2026-09': 'září 2026' } } },
      IndicatorType: { label: 'Ukazatel', category: {
        label: { yoy: 'Ke stejnému měsíci předchozího roku', mom: 'K předchozímu měsíci' },
        unit: { yoy: { label: 'procento', symbol: '%' }, mom: { label: 'NEZOBRAZOVAT' } },
      } },
      POHL1: { label: 'Pohlaví', category: { label: { all: 'Celkem', women: 'Ženy' } } },
    },
  }, [{ Ukazatel: 'Ke stejnému měsíci předchozího roku', Pohlaví: 'Celkem' }])
  expect(metadata.label).toBe('Míra inflace')
  expect(metadata.fields).toContainEqual({ label: 'Časové členění', value: 'Měsíce' })
  expect(metadata.fields).toContainEqual({ label: 'Pohlaví', value: 'Celkem' })
  expect(metadata.notes).toEqual(['Poznámka přímo ze zdroje'])
  expect(JSON.stringify(metadata)).not.toMatch(/NEZOBRAZOVAT|K předchozímu měsíci|Ženy/)
})
