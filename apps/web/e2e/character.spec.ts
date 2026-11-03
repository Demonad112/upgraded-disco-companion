import { PROFILE_URL, expect, test } from './fixtures'

const importUrl = `character/?import=${encodeURIComponent(PROFILE_URL)}`

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

test('closed analysis panels mount while idle, so their text is findable', async ({ page }) => {
  await page.goto(importUrl)
  await expect(page.getByRole('heading', { name: /Athrynas/ }).first()).toBeVisible({ timeout: 30_000 })
  const gear = page.locator('details#gear-workbench')
  await expect(gear).not.toHaveAttribute('open')
  // The workbench's own heading exists inside the still-closed panel.
  await expect(gear.getByText('Gear workbench', { exact: true })).toBeAttached({ timeout: 15_000 })
})

test('a workbench edit is saved and restored after a reload', async ({ page }) => {
  await page.goto(importUrl)
  await expect(page.getByRole('heading', { name: /Athrynas/ }).first()).toBeVisible({ timeout: 30_000 })
  const gear = page.locator('details#gear-workbench')
  await gear.locator('summary').click()
  await gear.locator('li button[aria-expanded]').first().click()
  await gear.getByRole('button', { name: /^Remove / }).first().click()
  await expect(gear.getByRole('button', { name: /1 change · reset/ })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: /Athrynas/ }).first()).toBeVisible({ timeout: 30_000 })
  await page.locator('details#gear-workbench summary').click()
  await expect(page.locator('details#gear-workbench').getByRole('button', { name: /1 change · reset/ })).toBeVisible({
    timeout: 15_000,
  })
})

test('the defences checklist lists resistances and never reads missing ailment proof as a fail', async ({ page }) => {
  await page.goto(importUrl)
  await expect(page.getByRole('heading', { name: /Athrynas/ }).first()).toBeVisible({ timeout: 30_000 })
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
  const block = page.getByRole('region', { name: 'Survivability by waystone tier' })
  await expect(block.getByTestId('headroom-verdict')).toHaveText(/Run T11–T14\.\s*Best: T14/, { timeout: 15_000 })
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
