import { emptyRunesCode, mainCode, useRatesPayloadJson } from './main-payload'
import { PROFILE_URL, expect, openTab, test } from './fixtures'

const importUrl = `character/?import=${encodeURIComponent(PROFILE_URL)}`
const PANEL_IDS = ['overview', 'sheet', 'defences', 'damage', 'gear', 'progress', 'advanced'] as const

test('?import= analyses the character and records it for the home page', async ({ page }) => {
  await page.goto(importUrl)
  await expect(page.getByRole('heading', { name: /Main/ }).first()).toBeVisible({ timeout: 30_000 })
  // The recent-character chip lives in the collapsed "Load another character".
  await page.getByText('Load another character').click()
  // Re-import chips are poe.ninja URLs, so they sit on the URL tab (paste is the default while NP1-1 holds).
  await page.getByRole('tab', { name: 'poe.ninja URL' }).click()
  await expect(page.getByRole('button', { name: /^Main/ })).toBeVisible()

  await page.goto('')
  const card = page.getByRole('region', { name: /Main/ })
  await expect(card).toBeVisible()
  await expect(card.getByRole('link', { name: /Re-import/ })).toHaveAttribute('href', /import=/)
  // The grade at import, not the level, once a grade is known.
  await expect(page.locator('[data-tool-status="character"]')).toHaveText(/^Last import: Main · (?!Lv)\S/)
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

  await page.getByRole('tab', { name: 'poe.ninja URL' }).click()
  await page.getByLabel('poe.ninja character URL').fill(PROFILE_URL)
  await page.getByRole('button', { name: 'Analyse', exact: true }).click()
  await expect(box).not.toHaveAttribute('open')
  await expect(page.getByText('Load another character')).toBeVisible()
  await expect(page.locator('.skeleton').first()).toBeVisible()

  await expect(page.getByRole('heading', { name: /Main/ }).first()).toBeVisible({ timeout: 30_000 })
  await expect(box).not.toHaveAttribute('open')
})

test('a failed import keeps the box open with the URL and the error', async ({ page }) => {
  await page.route('**/api/character**', (route) =>
    route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"not found"}' }),
  )
  await page.goto('character/')
  await page.getByRole('tab', { name: 'poe.ninja URL' }).click()
  await page.getByLabel('poe.ninja character URL').fill(PROFILE_URL)
  await page.getByRole('button', { name: 'Analyse', exact: true }).click()
  await expect(page.locator('main [role=alert]:not(:empty)').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('main details').first()).toHaveAttribute('open')
  await expect(page.getByLabel('poe.ninja character URL')).toHaveValue(PROFILE_URL)
})

test('a blocked import offers the paste box in one click, and a PoB code pasted there analyses', async ({ page }) => {
  const code = mainCode
  // The proxy answers poe.ninja's 403 challenge with a 502 (services/ninja-proxy/api/character.js).
  await page.route('**/api/character**', (route) =>
    route.fulfill({
      status: 502,
      contentType: 'application/json',
      body: '{"error":"Paste a Path of Building code or the character JSON instead, because poe.ninja now blocks automated imports."}',
    }),
  )
  await page.goto('character/')
  await page.getByRole('tab', { name: 'poe.ninja URL' }).click()
  await page.getByLabel('poe.ninja character URL').fill(PROFILE_URL)
  await page.getByRole('button', { name: 'Analyse', exact: true }).click()
  await expect(page.locator('main [role=alert]:not(:empty)').first()).toBeVisible({ timeout: 15_000 })
  await page.getByRole('button', { name: 'Paste a code instead' }).click()
  const box = page.getByLabel('Character model JSON or Path of Building code')
  await expect(box).toBeFocused()
  await box.fill(code)
  await page.getByRole('button', { name: 'Analyse pasted data' }).click()
  await expect(page.getByRole('heading', { name: 'Path of Building build' })).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('.bc-top')).toContainText('From a Path of Building code')
})

test('the poe.ninja PoB code pasted with a name: seven tabs, holding-up rows, named resist fix, gear tiers', async ({ page }) => {
  await page.goto('character/')
  await expect(page.getByText("poe.ninja code: paste the PoB code from poe.ninja's character page", { exact: true })).toBeVisible()
  await page.getByLabel('Character model JSON or Path of Building code').fill(mainCode)
  await page.getByLabel('Character name (optional)').fill('Main')
  await page.getByRole('button', { name: 'Analyse pasted data' }).click()
  await expect(page.getByRole('heading', { name: /Main/ }).first()).toBeVisible({ timeout: 30_000 })

  // A resistance fix names the item to change (the reference code is 22% short on chaos).
  const fixes = page.locator('[data-top-fixes]:not([data-pending])')
  await expect(fixes.locator('li').filter({ hasText: 'Chaos resistance' }).first()).toContainText(/ on (Morbid Mantle|[A-Z]\w+ \w+)/, { timeout: 30_000 })

  for (const id of PANEL_IDS) await openTab(page, id)

  await openTab(page, 'gear')
  await expect(page.locator('section#gear .gline-tier[data-t]').first()).toBeVisible({ timeout: 30_000 })

  await openTab(page, 'advanced')
  const holding = page.locator('#attribution')
  await expect(holding).toContainText(/[1-9]\d* items? attributed/, { timeout: 30_000 })
  await holding.locator('summary').first().click()
  await expect(holding.locator('ul > li').first()).toBeVisible()

  // Named, it is saved like an imported character: a recents chip on the paste tab re-opens it.
  await page.getByText('Load another character').click()
  await expect(page.getByRole('button', { name: /^Main/ })).toBeVisible({ timeout: 30_000 })
})

test('an empty rune socket shows as a fix (CP-2)', async ({ page }) => {
  // The reference code fills every socket, so this pastes a variant with Skull Song's 2 runes removed.
  await page.goto('character/')
  await page.getByLabel('Character model JSON or Path of Building code').fill(emptyRunesCode())
  await page.getByRole('button', { name: 'Analyse pasted data' }).click()
  const fixes = page.locator('[data-top-fixes]:not([data-pending])')
  await fixes.getByRole('button', { name: /^Show all/ }).click({ timeout: 30_000 })
  await expect(fixes.getByText('Fill the 2 empty rune sockets in Skull Song.').first()).toBeVisible()
})

test('the per-use DPS line fits a 390 px screen when a skill has use rates (CP-2)', async ({ page }) => {
  const body = useRatesPayloadJson()
  await page.route('**/api/character**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body }))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(importUrl)
  await expect(page.getByRole('heading', { name: /Main/ }).first()).toBeVisible({ timeout: 30_000 })
  await openTab(page, 'damage')
  const line = page.getByText(/^66,832 per use · 129,453 if used continuously$/)
  await expect(line).toBeVisible({ timeout: 15_000 })
  const box = (await line.boundingBox())!
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(390)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
})

test('gear lists only what can be improved, each with a weighted-sum trade search', async ({ page }) => {
  await page.goto(importUrl)
  await expect(page.getByRole('heading', { name: /Main/ }).first()).toBeVisible({ timeout: 30_000 })
  await openTab(page, 'gear')
  const gear = page.locator('section#gear')
  await expect(gear.getByText('Checking gear…')).toHaveCount(0, { timeout: 15_000 })
  await expect(gear.locator('details')).toHaveCount(0)
  const rows = gear.locator('[data-gear-targets] > li')
  await expect(rows.first()).toBeVisible({ timeout: 15_000 })
  // HG1-10: the fixture is short of resistance, so the helmet (it can close the gap) is first, and the weapon (it
  // can't roll resistance, so it has no usable search, B1-1) is hidden.
  await expect(rows.first()).toContainText('Helmet')
  await expect(rows.filter({ hasText: 'Main Hand' })).toHaveCount(0)
  await expect(gear.locator('a[data-trade="page"]')).toHaveCount(0)
  const link = rows.first().locator('a[data-trade="weighted"]')
  await expect(link).toBeVisible({ timeout: 15_000 })
  const q = JSON.parse(new URL((await link.getAttribute('href'))!).searchParams.get('q')!)
  expect(q.query.stats.some((g: { type: string }) => g.type === 'weight')).toBe(true)
})

test('the defences checklist lists resistances and never reads missing ailment proof as a fail', async ({ page }) => {
  await page.goto(importUrl)
  await expect(page.getByRole('heading', { name: /Main/ }).first()).toBeVisible({ timeout: 30_000 })
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
  await expect(page.getByRole('heading', { name: /Main/ }).first()).toBeVisible({ timeout: 30_000 })
  await openTab(page, 'defences')
  const block = page.getByRole('region', { name: 'Survivability by waystone tier' })
  await expect(block.getByTestId('headroom-verdict')).toHaveText(/Run T16\.\s*Best: T16/, { timeout: 15_000 })
  const groups = block.getByRole('combobox', { name: 'Tiers' })
  await expect(groups.locator('option')).toHaveText(['T1–T4', 'T5–T8', 'T9–T12', 'T13–T16'])
  // Opens on the group holding the best tier, and the last group reaches T16.
  await expect(groups.locator('option:checked')).toHaveText('T13–T16')
  const tiers = block.getByRole('list', { name: /Waystone tiers/ })
  await expect(tiers.getByRole('listitem', { name: /^Tier 16, area level 80/ })).toBeVisible()
  await expect(tiers.getByRole('listitem', { name: /^Tier/ })).toHaveCount(4)
  await groups.selectOption({ label: 'T1–T4' })
  await expect(tiers.getByRole('listitem', { name: /^Tier 1, area level 65/ })).toBeVisible()
  // The main build clears T16, so the "what to raise next" list is empty rather than naming a resistance.
  await expect(block.getByTestId('headroom-needs')).toHaveCount(0)
  // A lower level moves the XP limit: at 70, T1 loses no XP.
  await block.getByLabel('Your level').fill('70')
  await expect(tiers.getByRole('listitem', { name: /^Tier 1, .*XP lost 0%/ })).toBeVisible()
})

test('only the open tab is mounted: one tabpanel, and the other tabs’ sections are not in the DOM', async ({ page }) => {
  await page.goto(importUrl)
  await expect(page.getByRole('heading', { name: /Main/ }).first()).toBeVisible({ timeout: 30_000 })
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
  await expect(page.getByRole('heading', { name: /Main/ }).first()).toBeVisible({ timeout: 30_000 })
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

test('the example button has a verb in its name and fills the URL box', async ({ page }) => {
  await page.goto('character/')
  await expect(page.getByText('Paste a PoB code above and press Analyse pasted data.')).toBeVisible()
  await page.getByRole('tab', { name: 'poe.ninja URL' }).click()
  await page.getByRole('button', { name: /^Use this example: https:\/\/poe\.ninja\// }).click()
  await expect(page.getByRole('textbox').first()).toHaveValue(/^https:\/\/poe\.ninja\/poe2\/profile\//)
})
