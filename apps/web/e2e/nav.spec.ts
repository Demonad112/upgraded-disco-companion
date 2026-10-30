import { expect, test } from './fixtures'

const tabBar = (page: import('@playwright/test').Page) => page.getByRole('navigation', { name: 'Tools' })

test('the tool tab bar shows on phones and the header keeps brand, Search and Patch', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('checklist/')
  const bar = tabBar(page)
  await expect(bar).toBeVisible()
  await expect(bar.getByRole('link')).toHaveText(['Checklist', 'Atlas', 'Farming', 'Character'])
  await expect(bar.getByRole('link', { name: 'Checklist' })).toHaveAttribute('aria-current', 'page')
  const header = page.getByRole('navigation', { name: 'Primary' })
  await expect(header.getByRole('link', { name: 'Atlas Tree' })).toBeHidden()
  await expect(header.getByRole('button', { name: 'Search' })).toBeVisible()
  await expect(header.locator('[data-patch-badge] button')).toBeVisible()
  // The bar must not cover the end of the page.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  const footer = (await page.locator('footer').boundingBox())!
  const barBox = (await bar.boundingBox())!
  expect(footer.y + footer.height).toBeLessThanOrEqual(barBox.y + 1)
})

test('the tool tab bar is absent on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 })
  await page.goto('')
  await expect(tabBar(page)).toBeHidden()
  await expect(page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Atlas Tree' })).toBeVisible()
})

test('compact mode hides the tab bar and keeps the header icons', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('?compact=1')
  await expect(tabBar(page)).toBeHidden()
  await expect(page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Atlas Tree' })).toBeVisible()
})

test('focus order is header, then main, then the tab bar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('')
  const order = await page.evaluate(() => {
    const header = document.querySelector('header.site-header')!
    const main = document.querySelector('main')!
    const bar = document.querySelector('nav[aria-label="Tools"]')!
    const follows = (a: Node, b: Node) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
    return follows(header, main) && follows(main, bar)
  })
  expect(order).toBe(true)
})

test('the phone patch notice is one short line and its ⓘ opens the full note', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('')
  const banner = page.locator('.patch-banner p')
  await expect(banner).toContainText('community data')
  await page.getByRole('button', { name: 'About patch data' }).click()
  await expect(page.getByRole('region', { name: 'What changed' })).toContainText('unverified/conflicting')
})

for (const width of [280, 320, 390]) {
  test(`no sideways scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 700 })
    for (const path of ['', 'checklist/', 'character/']) {
      await page.goto(path)
      await expect(tabBar(page)).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
    }
  })
}
