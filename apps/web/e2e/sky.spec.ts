import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'

/**
 * The constellation sky is seeded from the viewport it was built for. Reduced
 * motion makes the frame still, so two reads of the canvas only match if the
 * field was kept.
 */
const sky = (page: Page) =>
  page.locator('canvas[data-fx="sky"]').evaluate((c: HTMLCanvasElement) => ({ width: c.width, data: c.toDataURL() }))

/** Past the 120 ms resize debounce and the repaint after it. */
const settle = (page: Page) => page.waitForTimeout(300)

test.describe('constellation sky', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('')
    await settle(page)
  })

  test('keeps its stars when the viewport only gets shorter', async ({ page }) => {
    const before = await sky(page)
    await page.setViewportSize({ width: 390, height: 780 })
    await settle(page)
    expect(await sky(page)).toEqual(before)
  })

  test('rebuilds when the width changes', async ({ page }) => {
    const before = await sky(page)
    await page.setViewportSize({ width: 500, height: 844 })
    await settle(page)
    const after = await sky(page)
    expect(after.width).toBeGreaterThan(before.width)
    expect(after.data).not.toEqual(before.data)
  })
})

test('stops animating while hidden by compact mode, and resumes after', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __raf: number }
    w.__raf = 0
    const raf = window.requestAnimationFrame.bind(window)
    window.requestAnimationFrame = (cb) => {
      w.__raf++
      return raf(cb)
    }
  })
  // Compact the way the app enters it, so hydration keeps the attribute; the
  // sky effect has run once its canvas is sized.
  await page.goto('?compact=1')
  await expect(page.locator('canvas[data-fx="sky"]')).not.toHaveAttribute('width', '300')
  await page.waitForTimeout(300)
  const count = () => page.evaluate(() => (window as unknown as { __raf: number }).__raf)
  const hidden = await count()
  await page.waitForTimeout(2000)
  expect(await count()).toBe(hidden)
  await page.evaluate(() => document.documentElement.removeAttribute('data-compact'))
  await expect.poll(count).toBeGreaterThan(hidden)
})
