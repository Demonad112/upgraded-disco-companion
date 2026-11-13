import { PROFILE_URL, expect, openTab, test } from './fixtures'

// PXA-4: lazy data files must not start before the build card paints, and the tab-gated ones start with their tab.
const FILES = ['passive-tree', 'pob-skills', 'mod-display', 'monster-stats'] as const
type File = (typeof FILES)[number]

test('/character data requests follow the card and the tab that needs them', async ({ page }) => {
  // In-page clock: when the build card enters the DOM, on the same timeline as resource start times.
  await page.addInitScript(() => {
    const w = window as unknown as { __cardAt?: number }
    new MutationObserver((_m, obs) => {
      if (document.querySelector('#assessment')) {
        w.__cardAt = performance.now()
        obs.disconnect()
      }
    }).observe(document, { childList: true, subtree: true })
  })
  const started = (file: File) =>
    page.evaluate((f) => performance.getEntriesByType('resource').find((e) => e.name.includes(`/${f}`))?.startTime ?? null, file)
  const now = () => page.evaluate(() => performance.now())

  await page.goto(`character/?import=${encodeURIComponent(PROFILE_URL)}`)
  await expect(page.locator('#assessment')).toBeVisible({ timeout: 30_000 })
  const cardAt = await page.evaluate(() => (window as unknown as { __cardAt?: number }).__cardAt ?? null)
  expect(cardAt, 'card timestamp').not.toBeNull()

  for (const f of FILES) {
    const at = await started(f)
    if (at !== null) expect(at, `${f} started before the card`).toBeGreaterThan(cardAt as number)
  }
  expect(await started('pob-skills'), 'pob-skills before Damage').toBeNull()
  expect(await started('mod-display'), 'mod-display before Gear/Damage/Advanced').toBeNull()

  const beforeDamage = await now()
  await openTab(page, 'damage')
  await expect.poll(() => started('pob-skills')).not.toBeNull()
  expect(await started('pob-skills')).toBeGreaterThan(beforeDamage)
  await expect.poll(() => started('mod-display')).not.toBeNull()
  expect(await started('mod-display')).toBeGreaterThan(beforeDamage)
})
