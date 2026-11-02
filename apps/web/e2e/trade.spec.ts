import AxeBuilder from '@axe-core/playwright'
import { expect, test } from './fixtures'

const fixture = {
  patch: '9.9.9',
  fetchedAt: '2026-01-02T03:04:05.000Z',
  source: 'https://example.test/stats',
  entries: [
    { id: 'explicit.stat_test_fire', text: '+#% to Fire Resistance', type: 'explicit', group: 'Explicit' },
    { id: 'explicit.stat_test_life', text: '+# to maximum Life', type: 'explicit', group: 'Explicit' },
  ],
}
const empty = { patch: null, fetchedAt: null, source: 'https://example.test/stats', entries: [] }

const stub = (page: import('@playwright/test').Page, body: unknown) =>
  page.route('**/trade2-stats.json', (r) => r.fulfill({ json: body }))

test('empty snapshot says what is missing and offers no link', async ({ page }) => {
  await stub(page, empty)
  await page.goto('trade/')
  await expect(page.getByText('npm run snapshot:trade-stats')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open on trade site' })).toHaveCount(0)
})

test('adding a chip builds the expected link', async ({ page }) => {
  await stub(page, fixture)
  await page.goto('trade/')
  await page.getByPlaceholder('Search all mods by text').fill('maximum life')
  await page.getByRole('button', { name: /maximum Life/ }).click()
  await page.getByLabel(/Minimum for/).fill('80')
  await expect(page.getByText('Patch 9.9.9 · fetched 2026-01-02T03:04:05.000Z')).toBeVisible()
  const href = await page.getByRole('link', { name: 'Open on trade site' }).getAttribute('href')
  const q = JSON.parse(decodeURIComponent(new URL(href!).search.slice(3)))
  expect(q.query.stats[0].filters).toEqual([{ id: 'explicit.stat_test_life', value: { min: 80 }, disabled: false }])
  expect(q.query.filters.type_filters.filters.ilvl.min).toBe(60)
})

test('has no serious accessibility violations', async ({ page }) => {
  await stub(page, fixture)
  await page.goto('trade/')
  await expect(page.getByPlaceholder('Search all mods by text')).toBeVisible()
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([])
})

for (const width of [390, 280]) {
  test(`no sideways scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await stub(page, fixture)
    await page.goto('trade/')
    await page.getByPlaceholder('Search all mods by text').fill('fire')
    await page.getByRole('button', { name: /Fire Resistance/ }).first().click()
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(over).toBeLessThanOrEqual(1)
  })
}
