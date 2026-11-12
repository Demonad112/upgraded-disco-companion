import { PROFILE_URL, expect, openTab, test } from './fixtures'

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

test('the character showcase card fits a 360 px window after import', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  await page.goto(importUrl)
  const card = page.locator('[data-showcase] section').first()
  await expect(card).toBeVisible({ timeout: 30_000 })
  // innerWidth grows with overflowing content under mobile emulation, so compare against the set width.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
  expect(await card.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1)
})

test('what-if sliders and re-craft toggles recompute the largest hit', async ({ page }) => {
  await page.goto(importUrl)
  // What-if lives in the Defence tab.
  await openTab(page, 'defences')
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

test('the tab strip highlights the section being read', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto(importUrl)
  const tablist = page.getByRole('tablist', { name: 'Character sections' })
  await expect(tablist.getByRole('tab')).toHaveText(['Overview', 'Defence', 'Damage', 'Gear', 'Progress', 'Advanced'].map((t) => new RegExp(`^${t}`)))
  const selected = () => tablist.locator('[role=tab][aria-selected=true]')
  await expect(selected()).toHaveText(/^Overview/)
  await tablist.getByRole('tab', { name: /^Gear/ }).click()
  await expect(selected()).toHaveText(/^Gear/)
  await expect(tablist.getByRole('tab', { name: /^Overview/ })).toHaveAttribute('aria-selected', 'false')
  await expect(page.locator('#panel-gear')).toBeVisible()
  await expect(page).toHaveURL(/#gear$/)
})

test('the tab strip moves with the arrow, Home and End keys', async ({ page }) => {
  await page.goto(importUrl)
  const tablist = page.getByRole('tablist', { name: 'Character sections' })
  const selected = () => tablist.locator('[role=tab][aria-selected=true]')
  await tablist.getByRole('tab', { name: /^Overview/ }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(selected()).toHaveText(/^Defence/)
  await expect(page).toHaveURL(/#defences$/)
  await expect(tablist.getByRole('tab', { name: /^Defence/ })).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(selected()).toHaveText(/^Overview/)
  await page.keyboard.press('ArrowLeft')
  await expect(selected()).toHaveText(/^Advanced/)
  await expect(page).toHaveURL(/#advanced$/)
  await page.keyboard.press('Home')
  await expect(selected()).toHaveText(/^Overview/)
  await page.keyboard.press('End')
  await expect(selected()).toHaveText(/^Advanced/)
  await expect(page.locator('#panel-advanced')).toBeVisible()
})

test('a deep link to #gear opens the Gear tab', async ({ page }) => {
  await page.goto(`character/?import=${encodeURIComponent(PROFILE_URL)}#gear`)
  await expect(page.getByRole('tablist', { name: 'Character sections' }).locator('[role=tab][aria-selected=true]')).toHaveText(/^Gear/, { timeout: 30_000 })
  await expect(page.locator('#panel-gear')).toBeVisible()
  await expect(page.locator('section#gear')).toBeVisible()
})

test('nav links and buttons are at least 44px tall', async ({ page }) => {
  await page.goto('')
  for (const el of await page.locator('nav a, nav button').all()) {
    const box = await el.boundingBox()
    if (box) expect(box.height).toBeGreaterThanOrEqual(43.5)
  }
})

test('IMG-2 bars: engraved troughs with a cap pin fill once scrolled into view', async ({ page }) => {
  await page.goto(importUrl)
  await openTab(page, 'defences')
  const meters = page.locator('section[aria-label="Resistances"]')
  await expect(meters).toBeAttached({ timeout: 30_000 })
  const troughs = meters.locator('.etrough')
  await expect(troughs.first()).toBeAttached()
  await expect(meters.locator('.ecap')).toHaveCount(await troughs.count())
  await meters.scrollIntoViewIfNeeded()
  await expect(meters.locator('ul').first()).toHaveAttribute('data-seen', '')
  await meters.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)))
  const fill = meters.locator('.efill').first()
  expect(await fill.evaluate((el) => el.getBoundingClientRect().width)).toBeGreaterThan(0)
  // The damage split uses the same trough and colours its segments by type.
  await openTab(page, 'damage')
  const split = page.locator('section[aria-label="Damage per skill"] .etrough').first()
  await expect(split).toBeAttached()
  expect(await split.locator('.efill[data-dmg]').count()).toBeGreaterThan(0)
})

test('IMG-2 bars: with reduced motion the fills are simply there', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(importUrl)
  await openTab(page, 'defences')
  const fill = page.locator('section[aria-label="Resistances"] .efill').first()
  await expect(fill).toBeAttached({ timeout: 30_000 })
  expect(await fill.evaluate((el) => [el.getAnimations().length, getComputedStyle(el).transform])).toEqual([0, 'none'])
})

test('R45 (emulated): an Android share of a poe.ninja link imports the character', async ({ page, request }) => {
  // The manifest's share_target sends title/text/url as GET params to ./character/; Android often puts the link in text.
  const manifest = await (await request.get('manifest.webmanifest')).json()
  expect(manifest.share_target).toMatchObject({ action: './character/', method: 'GET', params: { text: 'text', url: 'url' } })
  await page.goto(`character/?title=Athrynas&text=${encodeURIComponent(`Look at this build ${PROFILE_URL}`)}`)
  await expect(page.locator('[data-showcase] section').first()).toBeVisible({ timeout: 30_000 })
})
