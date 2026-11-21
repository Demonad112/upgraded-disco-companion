import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, openList, test } from './fixtures'

test('an Atlas "Map" button focuses that node on the tree', async ({ page }) => {
  await page.goto('atlas/')
  // The button is in the static HTML, so a click can land before React attaches its handler and do nothing. The
  // tree canvas renders only after a client fetch that starts once the page has hydrated: wait for it first.
  await expect(page.locator('[aria-label^="Atlas passive tree:"]')).toBeAttached()
  await openList(page)
  await page.getByRole('button', { name: 'Show Trapped Subordinate on the Atlas tree' }).click()
  await expect(page.getByText('Showing Trapped Subordinate')).toBeVisible()
})

test('ticking an Atlas node moves the allocation bar and the command bar to the next step', async ({ page }) => {
  await page.goto('atlas/')
  await expect(page.locator('[aria-label^="Atlas passive tree:"]')).toBeAttached()
  const steps = page.getByRole('group', { name: 'Route steps' })
  await expect(steps).toContainText('1 of 17')
  await openList(page)
  await page.getByRole('checkbox', { name: 'Allocated Trapped Subordinate' }).check()
  await expect(page.getByRole('tab', { name: /Path 1\/17/ })).toBeVisible()
  await expect(steps).toContainText('2 of 17')
})

test('Help me choose marks suggested farms once every answer is given', async ({ page }) => {
  await page.goto('dashboard/')
  await page.getByRole('button', { name: 'Help me choose' }).click()
  const selects = page.locator('#farm-help select')
  await expect(selects).toHaveCount(3)
  for (let i = 0; i < 3; i++) {
    await selects.nth(i).selectOption({ index: 1 })
  }
  await expect(page.getByText('Suggested', { exact: true }).first()).toBeVisible()
})

test('dashboard sort and row expansion work', async ({ page }) => {
  await page.goto('dashboard/')
  await page.getByRole('button', { name: 'Cheapest' }).click()
  await expect(page.getByRole('button', { name: 'Cheapest' })).toHaveAttribute('aria-pressed', 'true')
  const first = page.locator('#strategies details, [role=tabpanel] details').first()
  await first.locator('summary').click()
  await expect(first).toHaveAttribute('open', '')
})

test('"Hide completed" hides a ticked step, and reset clears progress', async ({ page }) => {
  await page.goto('checklist/')
  const step = page.getByText('Finish campaign, enter the Ziggurat Refuge', { exact: true }).last()
  await page.getByRole('button', { name: /Mark done/ }).click()
  await page.getByLabel('Hide completed').check()
  await expect(step).toBeHidden()

  await page.getByRole('button', { name: 'Reset all progress' }).click()
  const confirm = page.getByRole('dialog', { name: /Reset all progress/ })
  await expect(confirm).toContainText('1 completed step')
  await confirm.getByRole('button', { name: 'Reset progress' }).click()
  await expect(page.getByText('Step 1 of 32 · 0 done')).toBeVisible()
})

test('a Path of Building code gets the full analysis, with what a code lacks named', async ({ page }) => {
  const payload = JSON.parse(readFileSync(resolve('../../packages/core/test/fixtures/athrynas-v43.json'), 'utf8'))
  const code: string = (payload.charModel ?? payload).pathOfBuildingExport
  await page.goto('character/')
  // Paste is the default tab while poe.ninja blocks URL imports (NP1-1).
  await expect(page.getByRole('tab', { name: 'Paste data' })).toHaveAttribute('aria-selected', 'true')
  await page.getByLabel('Character model JSON or Path of Building code').fill(code)
  await page.getByRole('button', { name: 'Analyse pasted data' }).click()
  // NP1-6: the same build card, grade and Top 3 as a poe.ninja import, labelled with its source.
  await expect(page.getByRole('heading', { name: 'Path of Building build' })).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('.bc-top')).toContainText('Deadeye · From a Path of Building code')
  await expect(page.locator('[data-top-fixes]:not([data-pending]) li').first()).toBeVisible({ timeout: 30_000 })
  const gaps = page.getByTestId('couldnt-check')
  await expect(gaps).toContainText('Gear findings and trade searches')
  await expect(gaps).toContainText('Stat attribution')
  // Next's route announcer is also role=alert, so check for the app's own error text.
  await expect(page.getByText(/Could not analyse|neither valid JSON/)).toHaveCount(0)
})

test('a search string copies exactly as written, quotes included', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only')
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('atlas/')
  await page.locator('#atlas-regex > summary').click()
  await page.getByRole('button', { name: 'Copy Soft bricks, group 1 (hard avoid)' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Copied' })).toBeVisible()
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toBe('"Hiveseeding|Fittest|Lost Architect|Rivalry"')
})

test('the soft-brick list is grouped and warns that the tree cannot be respecced', async ({ page }) => {
  await page.goto('atlas/#trap-mysterious-transference')
  await expect(page.getByText('Do not allocate.')).toBeVisible()
  await expect(page.getByText('Group 1 · hard avoid')).toBeVisible()
  await expect(page.locator('#trap-mysterious-transference')).toBeVisible()
})

test('the checklist carries the 0.5.5 change table, Trial of Chaos and essence panels', async ({ page }) => {
  await page.goto('checklist/')
  for (const id of ['#patch-0-5-5-changes', '#trial-of-chaos', '#essence-crafting']) {
    await page.locator(`${id} > summary`).click()
  }
  await expect(page.getByText('Arbiter of Divinity ×5').first()).toBeVisible()
  await expect(page.getByText('Wager of the Future').first()).toBeVisible()
  await expect(page.getByText('Omen of Sinistral Crystallisation').first()).toBeVisible()
  await expect(page.getByText('Pick your track: fast-track to T15, or park at T11').first()).toBeAttached()
})

test('new panels cause no horizontal overflow', async ({ page }) => {
  for (const path of ['atlas/', 'checklist/']) {
    await page.goto(path)
    for (const id of ['#atlas-regex', '#patch-0-5-5-changes', '#trial-of-chaos', '#essence-crafting']) {
      const el = page.locator(`${id} > summary`)
      if (await el.count()) await el.click()
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow, path).toBeLessThanOrEqual(0)
  }
})
