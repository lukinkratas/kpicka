import { test, expect } from '@playwright/test'
import cron from '../worker/cron'
import { sources } from '../src/data'

test('stores raw sources and ČSÚ metadata in R2, keeping previous copies of failed sources', async () => {
  const original = globalThis.fetch
  const stored = new Map<string, string>()
  const env = { BUCKET: { put: async (key: string, value: ArrayBuffer) => stored.set(key, new TextDecoder().decode(value)) } }
  try {
    globalThis.fetch = async input => String(input) === sources.debt ? new Response('', { status: 503 }) : new Response(`body of ${input}`)
    await expect(cron.scheduled(undefined as never, env as never, undefined as never)).rejects.toThrow(`${sources.debt}: HTTP 503`)
    expect(stored.get('data/inflation')).toBe(`body of ${sources.inflation}`)
    expect(stored.get('metadata/inflation')).toBe('body of https://data.csu.gov.cz/api/dotaz/v1/data/vybery/CEN0101HT02')
    expect(stored.has('data/debt')).toBe(false)
    expect(stored.has('metadata/interest')).toBe(false)
    expect(stored.size).toBe(Object.keys(sources).length - 1 + 8)
  } finally {
    globalThis.fetch = original
  }
})
