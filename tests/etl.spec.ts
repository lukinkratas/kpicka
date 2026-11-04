import { test, expect } from '@playwright/test'
import worker from '../etl/worker'
import { onRequestGet } from '../functions/api/[[path]]'
import { loadMetric } from '../src/data'

test('cron stores every source and ČSÚ metadata in R2 under host, path and query', async () => {
  const stored = new Map<string, string>()
  const bucket = { put: async (key: string, value: ArrayBuffer) => { stored.set(key, new TextDecoder().decode(value)) } }
  const original = globalThis.fetch
  globalThis.fetch = async input => new Response(`body of ${input}`)
  try {
    await worker.scheduled(undefined, { DATA: bucket })
  } finally {
    globalThis.fetch = original
  }
  expect(stored.size).toBe(19)
  expect(stored.get('data.csu.gov.cz/api/dotaz/v1/data/vybery/CEN0101HT02?format=CSV')).toBe('body of https://data.csu.gov.cz/api/dotaz/v1/data/vybery/CEN0101HT02?format=CSV')
  expect(stored.get('data.csu.gov.cz/api/dotaz/v1/data/vybery/CEN0101HT02')).toBe('body of https://data.csu.gov.cz/api/dotaz/v1/data/vybery/CEN0101HT02')
  expect(stored.get('www.cnb.cz/cs/casto-kladene-dotazy/.galleries/vyvoj_repo_historie.txt')).toBe('body of https://www.cnb.cz/cs/casto-kladene-dotazy/.galleries/vyvoj_repo_historie.txt')
})

test('cron keeps the previous copy of a failed source and still stores the rest', async () => {
  const stored = new Map<string, string>()
  const bucket = { put: async (key: string, value: ArrayBuffer) => { stored.set(key, new TextDecoder().decode(value)) } }
  const original = globalThis.fetch
  globalThis.fetch = async input => {
    if (`${input}`.includes('cnb.cz')) return new Response('Unavailable', { status: 503 })
    if (`${input}`.includes('mf.gov.cz')) throw new TypeError('fetch failed')
    if (`${input}`.includes('cssz.cz')) return new Response('<html>Údržba</html>', { headers: { 'content-type': 'text/html' } })
    return new Response('ok')
  }
  try {
    await expect(worker.scheduled(undefined, { DATA: bucket })).rejects.toThrow('3 sources failed')
  } finally {
    globalThis.fetch = original
  }
  expect(stored.size).toBe(16)
  expect([...stored.keys()].filter(key => !key.startsWith('data.csu.gov.cz/'))).toEqual([])
})

test('function serves the stored copy with the cron time as Last-Modified, 404 when missing', async () => {
  const uploaded = new Date(Date.UTC(2026, 10, 4, 4, 0, 0))
  const objects: Record<string, string> = { 'data.csu.gov.cz/api/dotaz/v1/data/vybery/CEN0101HT02?format=CSV': 'Ukazatel,Hodnota' }
  const bucket = {
    get: async (key: string) => key in objects
      ? { body: new Response(objects[key]).body!, uploaded, httpMetadata: { contentType: 'text/csv;charset=UTF-8' } }
      : null,
  }
  const get = (path: string) => onRequestGet({ request: new Request('https://kpicka.pages.dev' + path), env: { DATA: bucket } })
  const response = await get('/api/data.csu.gov.cz/api/dotaz/v1/data/vybery/CEN0101HT02?format=CSV')
  expect(response.status).toBe(200)
  expect(await response.text()).toBe('Ukazatel,Hodnota')
  expect(response.headers.get('content-type')).toBe('text/csv;charset=UTF-8')
  expect(response.headers.get('last-modified')).toBe('Wed, 04 Nov 2026 04:00:00 GMT')
  expect((await get('/api/data.csu.gov.cz/api/dotaz/v1/data/vybery/CEN0101HT02')).status).toBe(404)
})

test('loadMetric reads the cached copy and reports the cron time as the load time', async () => {
  const original = globalThis.fetch
  const requested: string[] = []
  const csv = 'Ukazatel,Pohlaví,Území,Roky,Hodnota\nMedián měsíčních mezd (Kč),Celkem,Česko,2024,41742\n'
  globalThis.fetch = async input => {
    requested.push(String(input))
    return new Response(String(input).includes('format=CSV') ? csv : '{}', { headers: { 'last-modified': 'Wed, 04 Nov 2026 04:00:00 GMT' } })
  }
  try {
    const data = await loadMetric('wages', new AbortController().signal)
    expect(data.loaded).toBe(Date.UTC(2026, 10, 4, 4, 0, 0))
  } finally {
    globalThis.fetch = original
  }
  expect(requested.sort()).toEqual([
    '/api/data.csu.gov.cz/api/dotaz/v1/data/vybery/ZAMG08T1',
    '/api/data.csu.gov.cz/api/dotaz/v1/data/vybery/ZAMG08T1?format=CSV',
  ])
})
