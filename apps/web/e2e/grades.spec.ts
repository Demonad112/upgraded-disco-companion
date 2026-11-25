import { mainCode } from './main-payload'
import { expect, openTab, test } from './fixtures'

/**
 * Batch 2.4: each axis graded on its own, with beginner copy by default (docs/COPY.md). On the reference code:
 * Defence A (84%), three defence tips, the gear grade with each slot's grade or reason, at most five swaps, and
 * each resistance's over-cap shared across items on the Sheet.
 */

test('the reference code shows the defence, gear and over-cap review', async ({ page }) => {
  await page.goto('character/')
  await page.getByLabel('Character model JSON or Path of Building code').fill(mainCode)
  await page.getByRole('button', { name: 'Analyse pasted data' }).click()

  // Overview: the stamp is the defence grade, no longer the combined C–A range.
  await expect(page.locator('[data-grade-stamp]')).toHaveText('A', { timeout: 30_000 })
  await expect(page.locator('[data-axis="defence"] [data-axis-letter]')).toHaveText('A')
  // Damage: time to kill a base rare from the code's own TotalDPS (186,706 on this code), labelled project judgement.
  await expect(page.locator('[data-axis="damage"] [data-axis-letter]')).toHaveText('B')
  await expect(page.locator('[data-axis="damage"]')).toContainText('A base rare at tier 16 dies in 0.5 s')
  await expect(page.locator('[data-axis="damage"]')).toContainText('project judgement')

  await openTab(page, 'defences')
  const tips = page.locator('[data-defence-tip]')
  await expect(tips).toHaveCount(3)
  await expect(tips.first()).toHaveText('Survive bigger physical hits: your largest is 5,182. Add life, energy shield or armour.')

  await openTab(page, 'damage')
  const main = page.locator('[data-skill-row][data-main]')
  await expect(main).toBeVisible({ timeout: 30_000 })
  await expect(main.locator('[data-provenance="pob-export"]')).toHaveText('186,706')
  await expect(page.locator('[data-estimates]')).toHaveAttribute('data-estimates', 'calibrated')

  await openTab(page, 'gear')
  await expect(page.locator('[data-gear-review="ready"]')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByLabel('Gear grade B')).toBeVisible()
  await expect(page.locator('[data-slot-grade="Gloves"]')).toContainText('not graded')
  await expect(page.locator('[data-slot-grade="Helmet"]')).toContainText('A · 79')
  const swaps = page.locator('[data-swap]')
  expect(await swaps.count()).toBeGreaterThan(0)
  expect(await swaps.count()).toBeLessThanOrEqual(5)
  await expect(page.locator('[data-swap="Boots"]')).toContainText('of Flexure')

  await openTab(page, 'sheet')
  await expect(page.locator('[data-over-cap="cold"]')).toHaveText('Cold is 59% over the cap: Boots 36%, Ring 2 23%.')
})
