import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'

/** Wraith companion: tip hop, keyboard open/close, tree navigation, footer toggle, placement at phone and desktop. */
const launcher = (page: Page) => page.getByRole('button', { name: /^Companion/ })
const bubble = (page: Page) => page.getByRole('dialog')

/** Skip the tip hop, so a click opens the start node. */
const tipSeen = (page: Page) =>
  page.addInitScript(() => {
    try {
      sessionStorage.setItem('poe2-companion-tip-seen', '1')
    } catch {}
  })

test.describe('companion', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
  })

  test('hops with a tip; the click opens it and Esc returns focus', async ({ page }) => {
    await page.goto('')
    await expect(launcher(page)).toHaveAccessibleName('Companion: you have a tip')
    await launcher(page).focus()
    await page.keyboard.press('Enter')
    await expect(bubble(page)).toContainText('Your next checklist step is waiting.')
    await expect(page.getByRole('link', { name: 'Show me' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(bubble(page)).toBeHidden()
    await expect(launcher(page)).toBeFocused()
    await expect(launcher(page)).toHaveAccessibleName('Companion')
  })

  test('walks the tree to a tool', async ({ page }) => {
    await tipSeen(page)
    await page.goto('')
    await launcher(page).click()
    await page.getByRole('button', { name: 'Plan my Atlas' }).click()
    await expect(bubble(page)).toContainText('Plan your Atlas tree')
    await page.getByRole('link', { name: 'Open the Atlas planner' }).click()
    await expect(page).toHaveURL(/\/atlas\/$/)
    await expect(bubble(page)).toBeHidden()
  })

  test('the footer toggle hides it across a reload', async ({ page }) => {
    await page.goto('')
    await expect(launcher(page)).toBeVisible()
    const toggle = page.getByLabel('Show companion')
    // Click the label, as a person would: its hit-area ::after sits over the checkbox (see sky.spec).
    await page.locator('label', { hasText: 'Show companion' }).click()
    await expect(toggle).not.toBeChecked()
    await expect(launcher(page)).toBeHidden()
    await page.reload()
    await page.waitForTimeout(2000) // past the idle load
    await expect(launcher(page)).toBeHidden()
  })

  for (const [w, h] of [[390, 844], [1440, 900]] as const) {
    test(`fits the screen at ${w}`, async ({ page }) => {
      await tipSeen(page)
      await page.setViewportSize({ width: w, height: h })
      await page.goto('')
      await launcher(page).click()
      const box = (await bubble(page).boundingBox())!
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(w)
      const fig = (await launcher(page).boundingBox())!
      if (w < 720) {
        const bar = (await page.locator('.tab-bar').boundingBox())!
        expect(fig.y + fig.height).toBeLessThanOrEqual(bar.y)
      }
      const scroll = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(scroll).toBeLessThanOrEqual(0)
    })
  }
})
