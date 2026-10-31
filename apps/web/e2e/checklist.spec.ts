import { expect, test } from '@playwright/test'

// U11a: phase rail, gloss-once-per-step, completed steps.

for (const width of [280, 320, 390]) {
  test(`the phase rail stays one row and does not widen the page at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await page.goto('checklist/')
    const rail = page.locator('.phase-rail-scroll')
    await expect(rail).toBeVisible()
    const chips = page.locator('[data-phase-chip]')
    expect(await chips.count()).toBeGreaterThan(3)
    // One row: every chip shares the first chip's top edge.
    const tops = await chips.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)))
    expect(new Set(tops).size).toBe(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
    // Each chip carries n/total and a gauge.
    await expect(chips.first().locator('.gauge-seg').first()).toBeAttached()
    await expect(chips.first()).toContainText(/\d+\/\d+/)
  })
}

test('a glossary term is underlined once per step', async ({ page }) => {
  await page.goto('checklist/')
  await page.locator('details[id^="step-"]').evaluateAll((all) => all.forEach((d) => ((d as HTMLDetailsElement).open = true)))
  const dupes = await page.evaluate(() => {
    const out: string[] = []
    for (const step of document.querySelectorAll('details[id^="step-"]')) {
      const seen = new Set<string>()
      for (const t of step.querySelectorAll('.gloss-term')) {
        const key = (t.textContent ?? '').toLowerCase().replace(/s$/, '')
        if (seen.has(key)) out.push(`${step.id}: ${key}`)
        seen.add(key)
      }
    }
    return out
  })
  expect(dupes).toEqual([])
})

test('a completed step dims and keeps no tint', async ({ page }) => {
  await page.goto('checklist/')
  await page.getByRole('button', { name: /Mark done/ }).click()
  const done = page.locator('details[data-step-done]').first()
  await expect(done).toBeVisible()
  expect(await done.locator('summary').evaluate((e) => getComputedStyle(e).color)).toBe('rgb(143, 137, 127)')
  await expect(done.locator('summary')).not.toHaveClass(/bg-/)
})
