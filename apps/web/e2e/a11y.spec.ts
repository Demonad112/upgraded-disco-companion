import AxeBuilder from '@axe-core/playwright'
import { PROFILE_URL, expect, test } from './fixtures'

// Automated WCAG A/AA rules only. This catches missing names, roles and contrast
// regressions; it is not a substitute for a manual pass (audit I-5).
// Add a rule id here only for a known, unfixed violation, with the reason.
const KNOWN = new Set<string>()

const pages: Array<[string, string]> = [
  ['home', ''],
  ['character', `character/?import=${encodeURIComponent(PROFILE_URL)}`],
  ['checklist', 'checklist/'],
  ['dashboard', 'dashboard/'],
  ['methodology', 'methodology/'],
  ['whats-new', 'whats-new/'],
]

for (const [name, path] of pages) {
  test(`${name} has no serious or critical accessibility violations`, async ({ page }) => {
    await page.goto(path)
    if (name === 'character') {
      await expect(page.getByRole('heading', { name: /Athrynas/ }).first()).toBeVisible({ timeout: 30_000 })
    }
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    const blocking = results.violations.filter((v) => (v.impact === 'serious' || v.impact === 'critical') && !KNOWN.has(v.id))
    expect(
      blocking.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`),
    ).toEqual([])
  })
}

// A step toggle draws a 17.6 px circle, but `hit-area` (globals.css `@utility hit-area`)
// widens its target to 24×24 with an ::after. axe `target-size` measures the element box and
// not the pseudo-element, so it flags these toggles. Prove the wider target works, then leave
// only this selector out of the rule.
const STEP_TOGGLE = 'button[aria-label^="Done:"]'

test('a step toggle flips from a click just outside its visible circle', async ({ page }) => {
  await page.goto('checklist/')
  const toggle = page.locator(STEP_TOGGLE).first()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  // 3 px left of the box: outside the circle, inside the 24 px ::after.
  await toggle.click({ position: { x: -3, y: 8 } })
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
})

test('checklist has no target-size violations beyond the hit-area toggles', async ({ page }) => {
  await page.goto('checklist/')
  await expect(page.locator(STEP_TOGGLE).first()).toBeVisible()
  const results = await new AxeBuilder({ page }).withRules(['target-size']).exclude(STEP_TOGGLE).analyze()
  expect(results.violations.flatMap((v) => v.nodes.map((n) => n.target.join(' ')))).toEqual([])
})
