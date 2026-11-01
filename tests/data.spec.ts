import { test, expect } from '@playwright/test'
import { parseCsv, periodTime, selectPoints } from '../src/data'

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
