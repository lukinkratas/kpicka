import { test, expect } from '@playwright/test'

test('loads all live series with the common 2010–today axis', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('http://127.0.0.1:5173')
  await expect(page.locator('.metric-card')).toHaveCount(4)
  await expect(page.locator('.chart')).toHaveCount(4, { timeout: 60000 })
  await expect(page.locator('.chart-placeholder')).toHaveCount(0)
  await expect(page.locator('.period')).toContainText('1. ledna 2010')
  await expect(page.locator('.card-footer')).toHaveCount(4)
  for (const card of await page.locator('.metric-card').all()) {
    await expect(card.locator('.series-readings strong').first()).not.toContainText('—')
    await expect(card.locator('.card-footer')).toContainText('Načteno:')
    await expect(card.locator('.chart')).toContainText('10')
  }
  const employment = page.locator('#employment')
  await expect(employment.locator('.series-readings > div')).toHaveCount(4)
  await expect(employment.locator('.series-readings > div').filter({ hasText: 'Úroková sazba ČNB' }).locator('strong')).not.toContainText('—', { timeout: 60000 })
  await expect(employment.locator('.legend')).toContainText('Inflace (%)')
  await expect(employment.getByRole('link', { name: 'TXT ↗' })).toHaveAttribute('href', /cnb.*txt/)
  await expect.poll(() => page.locator('.premier-strip img').evaluateAll(imgs => imgs.every(i => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0)), { timeout: 30000 }).toBe(true)
  expect(errors).toEqual([])
  await page.screenshot({ path: '/tmp/dashboard-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.chart')).toHaveCount(4)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  await page.locator('#prices').scrollIntoViewIfNeeded()
  await page.screenshot({ path: '/tmp/dashboard-mobile.png' })
})

test('offers a retry after a failed source request', async ({ page }) => {
  await page.route('**/api/csu/**CEN0101HT02**', route => route.fulfill({ status: 503, body: 'Unavailable' }))
  await page.goto('http://127.0.0.1:5173')
  const card = page.locator('#income')
  await expect(card.getByText('Data se nepodařilo načíst.')).toBeVisible()
  await expect(card.locator('.card-footer>div').first().getByText('Zatím bez platného načtení')).toBeVisible()
  await page.unroute('**/api/csu/**CEN0101HT02**')
  await card.getByRole('button', { name: 'Zkusit znovu' }).click()
  await expect(card.locator('.card-footer>div').first()).toContainText('Načteno:', { timeout: 60000 })
  await expect(card.getByText('Data se nepodařilo načíst.', { exact: false })).toHaveCount(0)
})


test('combines term and party filters and retains the full time axis', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173')
  await expect(page.locator('.chart')).toHaveCount(4, { timeout: 60000 })
  const ods = page.getByRole('button', { name: 'ODS', exact: true })
  await ods.click()
  await expect(ods).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('.premier-strip button.faded')).toHaveCount(2)
  await expect(page.locator('.recharts-line-curve[stroke="var(--color-party-ods)"][stroke-opacity="0.12"]').first()).toBeVisible()
  const babis = page.locator('.premier-strip button').filter({ hasText: 'Andrej Babiš' }).first()
  await babis.click()
  await expect(page.locator('.premier-strip button.faded')).toHaveCount(3)
  await page.getByRole('button', { name: 'Zobrazit vše' }).click()
  await expect(page.locator('.premier-strip button.faded')).toHaveCount(0)
  await expect(page.locator('.metric-card h2')).toHaveText(['Inflace, mzdy a důchody', 'Inflace, energie a bydlení', 'Státní dluh a HDP', 'Nezaměstnanost a růst HDP'])
})


test('shows live API metadata verbatim in chart details', async ({ page }) => {
  await page.route('**/api/csu/**CEN0101HT02', async route => {
    const response = await route.fetch()
    const json = await response.json()
    json.label = 'Ověřený název přímo z API'
    json.note = ['Ověřená poznámka přímo z API']
    await route.fulfill({ response, json })
  })
  await page.goto('http://127.0.0.1:5173')
  const card = page.locator('#income')
  await card.getByText('Co přesně graf ukazuje', { exact: true }).click()
  const metadata = card.locator('.source-metadata').first()
  await expect(metadata).toContainText('Ověřený název přímo z API', { timeout: 60000 })
  await expect(metadata).toContainText('Ověřená poznámka přímo z API')
  await expect(metadata).toContainText('Měsíce')
  await expect(metadata).toContainText('Přírůstek indexu spotřebitelských cen ke stejnému měsíci předchozího roku')
  await expect(metadata).not.toContainText('Přírůstek indexu spotřebitelských cen k předchozímu měsíci')
})
