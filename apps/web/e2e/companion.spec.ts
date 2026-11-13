import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'

/** Mock companion: summon-only launcher, keyboard open/close, persisted "Turn off", clear of the phone tab bar. */
const launcher = (page: Page) => page.getByRole('button', { name: 'Ask the companion' })

test.describe('companion', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
  })

  test('opens and closes by keyboard, focus returns to the launcher', async ({ page }) => {
    await page.goto('')
    await launcher(page).focus()
    await page.keyboard.press('Enter')
    const panel = page.getByRole('dialog', { name: 'Companion' })
    await expect(panel).toBeVisible()
    await expect(panel.getByRole('link')).toHaveCount(3)
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
    await expect(launcher(page)).toBeFocused()
  })

  test('"Turn off" persists across a reload; the footer toggle brings it back', async ({ page }) => {
    await page.goto('')
    await launcher(page).click()
    await page.getByRole('button', { name: 'Turn off the companion' }).click()
    await expect(launcher(page)).toBeHidden()
    await page.reload()
    const toggle = page.getByLabel('Show the companion')
    await expect(toggle).not.toBeChecked()
    await page.waitForTimeout(2000) // past the idle load
    await expect(launcher(page)).toBeHidden()
    await toggle.check()
    await expect(launcher(page)).toBeVisible()
  })

  for (const [w, h] of [[390, 844], [1440, 900]] as const) {
    test(`no overlap and no horizontal scroll at ${w}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h })
      await page.goto('')
      await launcher(page).click()
      await expect(page.getByRole('dialog', { name: 'Companion' })).toBeVisible()
      const box = (await page.getByTestId('companion').boundingBox())!
      const tab = page.locator('.tab-bar')
      if (await tab.isVisible()) {
        const bar = (await tab.boundingBox())!
        expect(box.y + box.height, 'launcher sits above the tab bar').toBeLessThanOrEqual(bar.y)
      }
      expect(box.x + box.width).toBeLessThanOrEqual(w)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w)
    })
  }
})
