import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'

const net = (page: Page) => page.getByTestId('qp-net')
const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
const openAbyss = async (page: Page) => {
  await page.goto('dashboard/')
  await page.getByRole('button', { name: 'Set up Abyss + Rogue Exiles' }).click()
  await expect(page.getByTestId('qp-setup')).toBeVisible()
}

test.describe('quick picks', () => {
  test('five farms in order; Set up renders the setup with tablets, Waystone and the result strip', async ({ page }) => {
    await page.goto('dashboard/')
    const names = page.getByTestId('quick-picks').getByRole('heading', { level: 4 })
    await expect(names).toHaveText(['Abyss + Rogue Exiles', 'Expedition, 4 tablets', 'Breach + Genesis Tree', 'Delirium', 'Unique hunting'])
    await expect(page.getByTestId('quick-picks')).toContainText('Farm risk: Low')
    await page.getByRole('button', { name: 'Set up Expedition, 4 tablets' }).click()
    const setup = page.getByTestId('qp-setup')
    await expect(setup).toBeVisible()
    await expect(setup.getByRole('article', { name: 'Tablet 4' })).toBeVisible()
    await expect(setup.getByRole('article', { name: 'Waystone' })).toBeVisible()
    await expect(net(page)).toContainText('Same as recommended')
    // Two different dangers, two names: the tile's farm risk and the setup's map danger.
    await expect(page.getByTestId('qp-result').getByText('Map danger', { exact: true })).toBeVisible()
    await expect(page.getByTestId('qp-result').getByText('Danger', { exact: true })).toHaveCount(0)
    await expect(page.getByTestId('qp-danger-note')).toContainText('Farm risk is how dangerous this kind of farm is')
    await expect(setup).toContainText('+35% or +70% density')
    await expect(page.getByTestId('qp-footnote')).toContainText('Patch 0.5.5, checked against 0.5.5e')
    await expect(page.getByTestId('qp-footnote')).toContainText(/\d+ unverified/)
    await expect(page).toHaveURL(/#quick-expedition$/)
  })

  test('tapping a mod opens a sheet with 2–3 alternatives; Escape closes it and focus returns to the chip', async ({ page }) => {
    await openAbyss(page)
    const chip = page.locator('[data-chip]').first()
    await chip.click()
    const sheet = page.getByTestId('qp-sheet')
    await expect(sheet).toBeVisible()
    const n = await sheet.getByTestId('qp-alt').count()
    expect(n).toBeGreaterThanOrEqual(2)
    expect(n).toBeLessThanOrEqual(3)
    await expect(sheet.getByTestId('qp-alt').first()).toContainText(/(Better|Worse) by \d+%|Same Net|About the same/)
    await expect(sheet.getByRole('button', { name: 'Keep' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(sheet).toHaveCount(0)
    await expect(chip).toBeFocused()
    await chip.click()
    await page.getByTestId('qp-sheet').getByRole('button', { name: 'Close' }).click()
    await expect(page.getByTestId('qp-sheet')).toHaveCount(0)
  })

  test('Apply changes the Net text; Reset restores it', async ({ page }) => {
    await openAbyss(page)
    const before = (await net(page).textContent()) ?? ""
    await page.locator('[data-chip]').first().click()
    await page.getByTestId('qp-sheet').getByRole('button', { name: /^Apply / }).first().click()
    await expect(page.getByTestId('qp-sheet')).toHaveCount(0)
    await expect(net(page)).not.toHaveText(before)
    await expect(net(page)).toContainText('vs recommended')
    await expect(page.getByTestId('qp-setup')).toContainText('This is your saved setup')
    await page.getByRole('button', { name: 'Reset to recommended' }).click()
    await expect(net(page)).toHaveText(before)
    await expect(page.getByRole('button', { name: 'Reset to recommended' })).toBeDisabled()
  })

  test('Copy shopping list writes the plain-text list', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await openAbyss(page)
    await page.getByRole('button', { name: 'Copy shopping list' }).click()
    await expect(page.getByTestId('qp-copy-status')).toContainText('Copied')
    const text = await page.evaluate(() => navigator.clipboard.readText())
    expect(text).toContain('Tablet 1 Abyss rare: +2-3 Abyss rares, +20-30% Abyss density, +5-7% Pack size')
    expect(text).toContain('Waystone T15 rare:')
  })

  test('Open full planner shows the same loadout; Quick view goes back', async ({ page }) => {
    await openAbyss(page)
    await page.getByRole('button', { name: 'Open full planner →' }).click()
    await expect(page.getByTestId('farm-setup')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Abyss + Rogue Exiles' })).toBeVisible()
    await expect(page.getByRole('article', { name: 'Tablet 3' })).toBeVisible()
    await expect(page).toHaveURL(/#farm-qp-abyss$/)
    await page.getByRole('button', { name: 'Quick view' }).click()
    await expect(page.getByTestId('qp-setup')).toBeVisible()
  })

  test('deep links: #farm-<id> still opens the full planner, #quick-<id> opens Quick picks, a reload keeps the view', async ({ page }) => {
    await page.goto('dashboard/#farm-abyss-amanamu')
    await expect(page.getByTestId('farm-setup')).toBeVisible()
    await page.goto('dashboard/#quick-delirium')
    await expect(page.getByTestId('qp-setup')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Delirium', exact: true })).toBeVisible()
    await page.goto('dashboard/')
    await page.reload()
    await expect(page.getByTestId('qp-setup')).toBeVisible()
  })

  test('the sheet appears without animation under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openAbyss(page)
    await page.locator('[data-chip]').first().click()
    const name = await page.getByTestId('qp-sheet').evaluate((el) => getComputedStyle(el).animationName)
    expect(name).toBe('none')
  })

  for (const width of [390, 280]) {
    test(`no sideways scroll at ${width}px on both screens and with the sheet open`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.goto('dashboard/')
      await page.waitForLoadState('networkidle')
      expect(await overflow(page)).toBeLessThanOrEqual(1)
      await page.getByRole('button', { name: 'Set up Unique hunting' }).click()
      await expect(page.getByTestId('qp-setup')).toBeVisible()
      await page.waitForLoadState('networkidle')
      expect(await overflow(page)).toBeLessThanOrEqual(1)
      await page.locator('[data-chip]').first().click()
      await expect(page.getByTestId('qp-sheet')).toBeVisible()
      expect(await overflow(page)).toBeLessThanOrEqual(1)
    })
  }

  test('tap targets are at least 44 px', async ({ page }) => {
    await openAbyss(page)
    const heights = await page.locator('[data-chip], .qp-actions .btn').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(44)
  })

  test('axe is clean on both screens and on the sheet', async ({ page }) => {
    await page.goto('dashboard/')
    await page.waitForLoadState('networkidle')
    let r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(r.violations.map((v) => v.id)).toEqual([])
    await page.getByRole('button', { name: 'Set up Breach + Genesis Tree' }).click()
    await expect(page.getByTestId('qp-setup')).toBeVisible()
    r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(r.violations.map((v) => v.id)).toEqual([])
    await page.locator('[data-chip]').first().click()
    await expect(page.getByTestId('qp-sheet')).toBeVisible()
    await page.waitForTimeout(400) // the sheet's 150 ms fade, so axe reads final colours
    r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(r.violations.map((v) => v.id)).toEqual([])
  })

  // R47 (emulated part): the sheet fits the screen with its actions reachable, and the sticky strip stays small.
  for (const [w, h] of [[390, 844], [360, 780]] as const) {
    test(`R47: sheet and sticky strip sizing at ${w}x${h}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h })
      await openAbyss(page)
      const strip = await page.getByTestId('qp-result').boundingBox()
      expect(strip!.height, 'sticky strip height').toBeLessThanOrEqual(h * 0.3)
      await page.locator('[data-chip]').first().click()
      const sheet = page.getByTestId('qp-sheet')
      await expect(sheet).toBeVisible()
      await sheet.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)))
      const box = (await sheet.boundingBox())!
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.y + box.height).toBeLessThanOrEqual(h + 1)
      expect(box.width).toBeLessThanOrEqual(w)
      await expect(sheet.getByRole('button', { name: 'Keep' })).toBeInViewport()
      await sheet.getByRole('button', { name: /^Apply / }).first().scrollIntoViewIfNeeded()
      await expect(sheet.getByRole('button', { name: /^Apply / }).first()).toBeInViewport()
    })
  }

  // R44 (emulated part): a visual viewport much shorter than the layout viewport reads as the keyboard and hides the tab bar.
  test('R44: the tab bar hides while the on-screen keyboard is up, and comes back', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('dashboard/')
    const bar = page.getByRole('navigation', { name: 'Tools' })
    await expect(bar).toBeVisible()
    const fake = (vh: number) =>
      page.evaluate((v) => {
        Object.defineProperty(window.visualViewport!, 'height', { configurable: true, get: () => v })
        window.visualViewport!.dispatchEvent(new Event('resize'))
      }, vh)
    // Re-fire until the hook has hydrated and attached its listener.
    await expect(async () => {
      await fake(500)
      await expect(bar).toBeHidden({ timeout: 500 })
    }).toPass()
    await fake(844)
    await expect(bar).toBeVisible()
  })
})

