import { expect, test } from './fixtures'

// U9: the Methodology and What's new pages, and the two ways in (search, patch menu).

test('Methodology has its index and anchored sections, and a section link copies', async ({ page, context, browserName }) => {
  await page.goto('methodology/')
  await expect(page.getByRole('heading', { level: 1, name: /How the analysis works/ })).toBeVisible()
  const index = page.getByRole('navigation', { name: 'On this page' })
  await expect(index.getByRole('link')).toHaveCount(7)
  await index.getByRole('link', { name: 'EHP' }).click()
  await expect(page).toHaveURL(/#ehp$/)
  await expect(page.locator('#ehp-title')).toBeInViewport()

  test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only')
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: /Copy link to How the grade is formed/ }).click()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(copied).toMatch(/\/methodology\/?#grade$/)
})

test("What's new lists the changelog newest first", async ({ page }) => {
  await page.goto('whats-new/')
  await expect(page.getByRole('heading', { level: 1, name: /What’s new/ })).toBeVisible()
  const dates = await page.locator('ol[aria-label="Changes, newest first"] > li time').allTextContents()
  expect(dates.length).toBeGreaterThan(0)
  expect([...dates].sort().reverse()).toEqual(dates)
})

test('the patch menu links to every change', async ({ page }) => {
  await page.goto('')
  await page.waitForLoadState('networkidle')
  await page.locator('[data-patch-badge] button').click()
  await page.getByRole('link', { name: /See all changes/ }).click()
  await expect(page).toHaveURL(/whats-new\/?$/)
  await expect(page.getByRole('heading', { level: 1, name: /What’s new/ })).toBeVisible()
})

for (const [query, url] of [
  ['Methodology', /methodology\/?#methodology/],
  ["What's new", /whats-new\/?#whats-new/],
] as const) {
  test(`Ctrl K finds ${query}`, async ({ page }) => {
    await page.goto('')
    await page.waitForLoadState('networkidle')
    await page.keyboard.press('Control+k')
    await page.getByPlaceholder(/Search steps/).fill(query)
    await page.getByRole('dialog').getByText(query, { exact: true }).first().click()
    await expect(page).toHaveURL(url)
  })
}
