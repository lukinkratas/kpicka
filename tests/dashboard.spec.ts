import { test, expect } from '@playwright/test'

test('loads all live series with the common 2010–today axis', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('http://127.0.0.1:5173')
  await expect(page.locator('.metric-card')).toHaveCount(8)
  await expect(page.locator('.chart')).toHaveCount(8, { timeout: 60000 })
  await expect(page.locator('.chart-placeholder')).toHaveCount(0)
  await expect(page.locator('.period')).toContainText('1. ledna 2010')
  await expect(page.locator('.card-footer')).toHaveCount(8)
  for (const card of await page.locator('.metric-card').all()) {
    await expect(card.locator('.reading strong')).not.toContainText('—')
    await expect(card.locator('.card-footer')).toContainText('Načteno:')
    await expect(card.locator('.chart')).toContainText('10')
  }
  await expect.poll(() => page.locator('.premier-strip img').evaluateAll(imgs => imgs.every(i => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0)), { timeout: 30000 }).toBe(true)
  expect(errors).toEqual([])
  await page.screenshot({ path: '/tmp/dashboard-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.chart')).toHaveCount(8)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  await page.locator('#energy').scrollIntoViewIfNeeded()
  await page.screenshot({ path: '/tmp/dashboard-mobile.png' })
})

test('offers a retry after a failed source request', async ({ page }) => {
  await page.route('**/api/csu/**CEN0101HT02**', route => route.fulfill({ status: 503, body: 'Unavailable' }))
  await page.goto('http://127.0.0.1:5173')
  const card = page.locator('#inflation')
  await expect(card.getByText('Data se nepodařilo načíst.')).toBeVisible()
  await expect(card.getByText('Zatím bez platného načtení')).toBeVisible()
  await page.unroute('**/api/csu/**CEN0101HT02**')
  await card.getByRole('button', { name: 'Zkusit znovu' }).click()
  await expect(card.locator('.chart')).toBeVisible({ timeout: 60000 })
})
