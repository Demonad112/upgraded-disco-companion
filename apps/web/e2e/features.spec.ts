import { PROFILE_URL, expect, test } from './fixtures'

const importUrl = `character/?import=${encodeURIComponent(PROFILE_URL)}`

test('the patch badge opens a what-changed list', async ({ page }) => {
  await page.goto('')
  await page.locator('[data-patch-badge] button').click()
  const panel = page.getByRole('region', { name: 'What changed' })
  await expect(panel).toContainText('Patch 0.5.5')
  await expect(panel).toContainText('Unverified')
})

test('compact mode keeps Up next and progress, hides the rest, and persists', async ({ page }) => {
  await page.goto('?compact=1')
  await expect(page.locator('html')).toHaveAttribute('data-compact', '')
  await expect(page.locator('#next-step-title')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Progression Checklist' })).toBeHidden()
  await expect(page.getByRole('list', { name: 'Alerts' })).toBeVisible()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-compact', '')
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
  await page.goto('?compact=0')
  await expect(page.locator('html')).not.toHaveAttribute('data-compact', '')
})

test('a narrow window does not scroll sideways in compact mode', async ({ page }) => {
  await page.setViewportSize({ width: 280, height: 600 })
  await page.goto('?compact=1')
  await expect(page.locator('#next-step-title')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
})

test('what-if sliders and re-craft toggles recompute the largest hit', async ({ page }) => {
  await page.goto(importUrl)
  await expect(page.locator('#what-if')).toBeVisible({ timeout: 30_000 })
  const lowest = page.locator('#what-if').getByText('Largest hit').locator('..')
  const before = await lowest.textContent()
  await page.getByRole('slider', { name: 'chaos resistance' }).fill('0')
  await expect(lowest).not.toHaveText(before ?? '')
  await expect(lowest).toContainText('→')
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(lowest).not.toContainText('→')
  // A suggested re-craft moves its resistance too.
  const first = page.getByRole('group', { name: /suggested re-crafts/i }).getByRole('checkbox').first()
  await first.check()
  await expect(lowest).toContainText('→')
})

test('the section index highlights the section being read', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto(importUrl)
  await expect(page.locator('#what-if')).toBeVisible({ timeout: 30_000 })
  const nav = page.getByRole('navigation', { name: 'On this page' })
  await nav.getByRole('link', { name: 'Findings' }).click()
  await expect(nav.getByRole('link', { name: 'Findings' })).toHaveAttribute('aria-current', 'location')
})

test('nav links and buttons are at least 44px tall', async ({ page }) => {
  await page.goto('')
  for (const el of await page.locator('nav a, nav button').all()) {
    const box = await el.boundingBox()
    if (box) expect(box.height).toBeGreaterThanOrEqual(43.5)
  }
})
