import { PROFILE_URL, expect, test } from './fixtures'

// PX0: pixel baselines. 8 routes plus /character with the bundled fixture, at 280, 390, 1440 and 1920 px
// (the two extremes replace a separate width sweep). Reduced motion is on and the sky canvas is masked, so
// stars never fail a diff. Baselines come from CI Linux Chromium only: the first CI run writes any that are
// missing and uploads them as the `visual-baselines` artifact; commit them into
// apps/web/e2e/visual.spec.ts-snapshots/. After that a diff above 1 % fails the run.
const ROUTES: Array<[string, string]> = [
  ['home', ''],
  ['character', 'character/'],
  ['character-imported', `character/?import=${encodeURIComponent(PROFILE_URL)}`],
  ['dashboard', 'dashboard/'],
  ['atlas', 'atlas/'],
  ['checklist', 'checklist/'],
  ['trade', 'trade/'],
  ['methodology', 'methodology/'],
  ['whats-new', 'whats-new/'],
]
const WIDTHS = [280, 390, 1440, 1920] as const

test.use({ reducedMotion: 'reduce' })

for (const width of WIDTHS) {
  for (const [name, path] of ROUTES) {
    test(`${name} @ ${width}`, async ({ page }, info) => {
      // One project per width class keeps the matrix at 36 shots, not 72.
      test.skip(width < 1000 ? info.project.name !== 'mobile' : info.project.name !== 'desktop')
      await page.setViewportSize({ width, height: width < 1000 ? 844 : 900 })
      await page.goto(path)
      if (name === 'character-imported') await page.getByRole('heading', { name: /Athrynas/ }).first().waitFor({ timeout: 30_000 })
      await page.evaluate(() => document.fonts.ready)
      await expect(page).toHaveScreenshot(`${name}-${width}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
        animations: 'disabled',
        mask: [page.locator('.sky-canvas')],
      })
    })
  }
}
