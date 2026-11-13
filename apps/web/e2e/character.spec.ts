import { PROFILE_URL, expect, openTab, test } from './fixtures'

const importUrl = `character/?import=${encodeURIComponent(PROFILE_URL)}`
const PANEL_IDS = ['overview', 'defences', 'damage', 'gear', 'progress', 'advanced'] as const

test('?import= analyses the character and records it for the home page', async ({ page }) => {
  await page.goto(importUrl)
  await expect(page.getByRole('heading', { name: /Athrynas/ }).first()).toBeVisible({ timeout: 30_000 })
  // The recent-character chip lives in the collapsed "Load another character".
  await page.getByText('Load another character').click()
  await expect(page.getByRole('button', { name: /^Athrynas/ })).toBeVisible()

  await page.goto('')
  const card = page.getByRole('region', { name: /Athrynas/ })
  await expect(card).toBeVisible()
  await expect(card.getByRole('link', { name: /Re-import/ })).toHaveAttribute('href', /import=/)
  // The grade at import, not the level, once a grade is known.
  await expect(page.locator('[data-tool-status="character"]')).toHaveText(/^Last import: Athrynas · (?!Lv)\S/)
})

test('a typed import collapses the box for its length, so the skeleton sits where the panels land', async ({ page }) => {
  // Held long enough to see the busy state; then the fixture's own handler answers.
  await page.route('**/api/character**', async (route) => {
    await new Promise((s) => setTimeout(s, 1_500))
    await route.fallback()
  })
  await page.goto('character/')
  const box = page.locator('main details').first()
  await expect(box).toHaveAttribute('open')
  await expect(page.getByText('Load another character')).toBeHidden()

  await page.getByLabel('poe.ninja character URL').fill(PROFILE_URL)
  await page.getByRole('button', { name: 'Analyse', exact: true }).click()
  await expect(box).not.toHaveAttribute('open')
  await expect(page.getByText('Load another character')).toBeVisible()
  await expect(page.locator('.skeleton').first()).toBeVisible()

  await expect(page.getByRole('heading', { name: /Athrynas/ }).first()).toBeVisible({ timeout: 30_000 })
  await expect(box).not.toHaveAttribute('open')
})

test('a failed import keeps the box open with the URL and the error', async ({ page }) => {
  await page.route('**/api/character**', (route) =>
    route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"not found"}' }),
  )
  await page.goto('character/')
  await page.getByLabel('poe.ninja character URL').fill(PROFILE_URL)
  await page.getByRole('button', { name: 'Analyse', exact: true }).click()
  await expect(page.locator('main [role=alert]:not(:empty)').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('main details').first()).toHaveAttribute('open')
  await expect(page.getByLabel('poe.ninja character URL')).toHaveValue(PROFILE_URL)
})

test('gear lists only what can be improved, each with a weighted-sum trade search', async ({ page }) => {
  await page.goto(importUrl)
  await expect(page.getByRole('heading', { name: /Athrynas/ }).first()).toBeVisible({ timeout: 30_000 })
  await openTab(page, 'gear')
  const gear = page.locator('section#gear')
  await expect(gear.getByText('Checking gear…')).toHaveCount(0, { timeout: 15_000 })
  await expect(gear.locator('details')).toHaveCount(0)
  const rows = gear.locator('[data-gear-targets] > li')
  if (await rows.count()) {
    const link = gear.locator('a[data-trade="weighted"]').first()
    await expect(link).toBeVisible({ timeout: 15_000 })
    const q = JSON.parse(new URL((await link.getAttribute('href'))!).searchParams.get('q')!)
    expect(q.query.stats.some((g: { type: string }) => g.type === 'weight')).toBe(true)
  }
})

test('the defences checklist lists resistances and never reads missing ailment proof as a fail', async ({ page }) => {
  await page.goto(importUrl)
  await expect(page.getByRole('heading', { name: /Athrynas/ }).first()).toBeVisible({ timeout: 30_000 })
  await openTab(page, 'defences')
  // The full checklist is collapsed under the resist chip row.
  await page.locator('#defence-checklist-disclosure > summary').click()
  const list = page.locator('#defence-checklist')
  await expect(list.locator('[data-check="res-fire"]')).toBeVisible({ timeout: 15_000 })
  await expect(list.locator('[data-check="max-hit"]')).toBeVisible()
  await expect(list.locator('[data-check^="ail-"][data-status="fail"]')).toHaveCount(0)
})

test('waystone survivability gives a verdict, four tier groups up to T16, and what to raise next', async ({ page }) => {
  await page.goto(importUrl)
  await expect(page.getByRole('heading', { name: /Athrynas/ }).first()).toBeVisible({ timeout: 30_000 })
  await openTab(page, 'defences')
  const block = page.getByRole('region', { name: 'Survivability by waystone tier' })
  await expect(block.getByTestId('headroom-verdict')).toHaveText(/Run T12–T14\.\s*Best: T14/, { timeout: 15_000 })
  const groups = block.getByRole('combobox', { name: 'Tiers' })
  await expect(groups.locator('option')).toHaveText(['T1–T4', 'T5–T8', 'T9–T12', 'T13–T16'])
  // Opens on the group holding the best tier, and the last group reaches T16.
  await expect(groups.locator('option:checked')).toHaveText('T13–T16')
  const tiers = block.getByRole('list', { name: /Waystone tiers/ })
  await expect(tiers.getByRole('listitem', { name: /^Tier 16, area level 80/ })).toBeVisible()
  await expect(tiers.getByRole('listitem', { name: /^Tier/ })).toHaveCount(4)
  await groups.selectOption({ label: 'T1–T4' })
  await expect(tiers.getByRole('listitem', { name: /^Tier 1, area level 65/ })).toBeVisible()
  await expect(block.getByTestId('headroom-needs')).toContainText('Chaos resistance')
  // A lower level moves the XP limit: at 70, T1 loses no XP.
  await block.getByLabel('Your level').fill('70')
  await expect(tiers.getByRole('listitem', { name: /^Tier 1, .*XP lost 0%/ })).toBeVisible()
})

test('only the open tab is mounted: one tabpanel, and the other tabs’ sections are not in the DOM', async ({ page }) => {
  await page.goto(importUrl)
  await expect(page.getByRole('heading', { name: /Athrynas/ }).first()).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('tablist', { name: 'Character sections' })).toBeVisible()
  await expect(page.locator('[role=tabpanel][id^="panel-"]')).toHaveCount(1)
  await expect(page.locator('#panel-overview')).toBeVisible()
  await expect(page.locator('section#gear')).toHaveCount(0)
  await expect(page.locator('#what-if')).toHaveCount(0)
  await expect(page.locator('#progress-history')).toHaveCount(0)

  for (const id of PANEL_IDS.slice(1)) {
    await openTab(page, id)
    await expect(page.locator('[role=tabpanel][id^="panel-"]')).toHaveCount(1)
    for (const other of PANEL_IDS) {
      if (other !== id) await expect(page.locator(`#panel-${other}`)).toHaveCount(0)
    }
  }
  await openTab(page, 'gear')
  await expect(page.locator('section#gear')).toBeVisible()
  await expect(page.locator('#what-if')).toHaveCount(0)
})

test('clicking a tab moves the open tab into the URL hash', async ({ page }) => {
  await page.goto(importUrl)
  await expect(page.getByRole('heading', { name: /Athrynas/ }).first()).toBeVisible({ timeout: 30_000 })
  await page.getByRole('tab', { name: /^Gear/ }).click()
  await expect(page).toHaveURL(/#gear$/)
  await expect(page.getByRole('tab', { name: /^Gear/ })).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('tab', { name: /^Advanced/ }).click()
  await expect(page).toHaveURL(/#advanced$/)
  await expect(page.locator('#panel-advanced')).toBeVisible()
})

test('Top-3 rows show their text in full at default: nothing is ellipsised or clamped', async ({ page }) => {
  await page.goto(importUrl)
  await expect(page.locator('[data-top-fixes] li').first()).toBeVisible({ timeout: 30_000 })
  const clipped = await page.locator('[data-top-fixes] li, [data-top-fixes] li *').evaluateAll((els) =>
    els
      .filter((el) => {
        const cs = getComputedStyle(el)
        return cs.textOverflow === 'ellipsis' || el.classList.contains('truncate') || (cs.webkitLineClamp && cs.webkitLineClamp !== 'none')
      })
      .map((el) => el.textContent?.slice(0, 60) ?? el.tagName),
  )
  expect(clipped).toEqual([])
})

test('the only trade label in Top fixes is "Find on trade", one per row', async ({ page }) => {
  await page.goto(importUrl)
  const rows = page.locator('[data-top-fixes] li')
  await expect(rows.first()).toBeVisible({ timeout: 30_000 })
  const trade = page.locator('[data-top-fixes] a[data-trade]')
  await expect(trade).toHaveCount(await rows.count())
  for (const text of await trade.allTextContents()) expect(text.trim()).toBe('Find on trade')
  const other = await page.locator('[data-top-fixes] a, [data-top-fixes] button').evaluateAll((els) =>
    els.map((el) => el.textContent?.trim() ?? '').filter((t) => /trade/i.test(t) && t !== 'Find on trade'),
  )
  expect(other).toEqual([])
})

test('phone first screen: the Top fixes heading sits above the fold after import', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone first screen only')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(importUrl)
  // The pending and final cards share this id and the pending one is swapped out
  // once the fixes pass lands, so measure only the settled card.
  const heading = page.locator('[data-top-fixes]:not([data-pending]) #top-fixes-title')
  await expect(heading).toBeVisible({ timeout: 30_000 })
  await expect
    .poll(async () => {
      const box = await heading.boundingBox()
      return box ? box.y + box.height : null
    })
    .not.toBeNull()
  const box = (await heading.boundingBox())!
  expect(box.y + box.height).toBeLessThan(844)
})
