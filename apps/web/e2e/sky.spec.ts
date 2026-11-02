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
    // LS1: the progress layer loads when idle after the first frame and repaints the still sky once.
    await expect(page.locator('canvas[data-fx="sky"]')).toHaveAttribute('data-progress-lit', /\d+/)
    await settle(page)
  })

  test('keeps its stars when the viewport only gets shorter', async ({ page }) => {
    const before = await sky(page)
    await page.setViewportSize({ width: 390, height: 780 })
    await settle(page)
    expect(await sky(page)).toEqual(before)
  })

  test('paints one still frame under reduced motion', async ({ page }) => {
    const before = await sky(page)
    await page.waitForTimeout(1200)
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

test('the footer toggle dims behind blocks without a reload, and a reload keeps it off before paint', async ({ page }) => {
  // Records, as <body> arrives, whether the dim was already off.
  await page.addInitScript(() => {
    const w = window as unknown as { __offAtBody?: boolean }
    new MutationObserver((_, mo) => {
      if (!document.body) return
      w.__offAtBody = document.documentElement.hasAttribute('data-sky-dim-off')
      mo.disconnect()
    }).observe(document, { childList: true, subtree: true })
  })
  await page.goto('')
  const card = page.locator('main .card').first()
  const fill = () => card.evaluate((el) => getComputedStyle(el).backgroundColor)
  const dimmed = await fill()
  expect(dimmed).not.toMatch(/^(rgba\(0, 0, 0, 0\)|color\(srgb 0 0 0 \/ 0\))$/)

  // The label's hit-area overlay takes the click, as it does for a user.
  const toggle = page.locator('label', { hasText: 'Dim sky behind blocks' })
  await toggle.click()
  await expect(page.locator('html')).toHaveAttribute('data-sky-dim-off', '')
  expect(await fill()).not.toBe(dimmed)

  await page.reload()
  expect(await page.evaluate(() => (window as unknown as { __offAtBody?: boolean }).__offAtBody)).toBe(true)
  await expect(page.getByLabel('Dim sky behind blocks')).not.toBeChecked()
  await toggle.click()
  await expect(page.locator('html')).not.toHaveAttribute('data-sky-dim-off')
  expect(await fill()).toBe(dimmed)
})

/** MP1 lantern: a fine pointer lights the sky near it; it fades after 2 s idle. Never on touch or reduced motion. */
test.describe('lantern', () => {
  const lit = (page: Page) => page.locator('canvas[data-fx="sky"]').evaluate((c) => c.hasAttribute('data-lantern'))

  test('lights near a fine pointer and fades once it rests', async ({ page, isMobile }) => {
    await page.goto('')
    await expect(page.locator('canvas[data-fx="sky"]')).not.toHaveAttribute('width', '300')
    await page.mouse.move(400, 300)
    await page.mouse.move(420, 320)
    if (isMobile) {
      await page.waitForTimeout(500)
      expect(await lit(page)).toBe(false)
      return
    }
    await expect.poll(() => lit(page)).toBe(true)
    // 2 s idle, then a 400 ms fade.
    await expect.poll(() => lit(page), { timeout: 5000 }).toBe(false)
  })

  test('stays off under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('')
    await page.mouse.move(400, 300)
    await page.mouse.move(420, 320)
    await page.waitForTimeout(500)
    expect(await lit(page)).toBe(false)
  })
})

/**
 * LS1 progress constellation: one star per checklist step and Atlas node. Read through the canvas's test hooks
 * (`data-progress-lit`: stars lit; `data-progress-anim`: ignites, flares and labels running), never pixels.
 */
test.describe('progress constellation', () => {
  const canvas = (page: Page) => page.locator('canvas[data-fx="sky"]')
  const seed = (page: Page, ids: string[]) =>
    page.addInitScript((completedStepIds) => {
      if (sessionStorage.getItem('seeded')) return
      sessionStorage.setItem('seeded', '1')
      localStorage.setItem(
        'poe2-endgame-companion:v1',
        JSON.stringify({
          version: 1,
          checklist: { completedStepIds, completedActionItemKeys: [] },
          atlas: { allocatedClusterIds: [], allocatedForkIds: [] },
          dashboard: { lastQuizAnswers: {} },
          character: { snapshots: [] },
          updatedAt: new Date().toISOString(),
        }),
      )
    }, ids)

  test('Mark done lights a star', async ({ page }) => {
    await page.goto('')
    await expect(canvas(page)).toHaveAttribute('data-progress-lit', '0')
    await page.getByRole('button', { name: 'Mark done' }).first().click()
    await expect(canvas(page)).toHaveAttribute('data-progress-lit', '1')
    // Read from the persisted state on the next page.
    await page.goto('checklist/')
    await expect(canvas(page)).toHaveAttribute('data-progress-lit', '1')
  })

  test('reduced motion shows the final state, with no ignite and a still frame', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await seed(page, ['step-campaign-end', 'step-atlas-rules'])
    await page.goto('')
    await expect(canvas(page)).toHaveAttribute('data-progress-lit', '2')
    await expect(canvas(page)).toHaveAttribute('data-progress-anim', '0')
    await page.getByRole('button', { name: 'Mark done' }).first().click()
    await expect(canvas(page)).toHaveAttribute('data-progress-lit', '3')
    await expect(canvas(page)).toHaveAttribute('data-progress-anim', '0')
    const still = () => canvas(page).evaluate((c: HTMLCanvasElement) => c.toDataURL())
    const before = await still()
    await page.waitForTimeout(1000)
    expect(await still()).toBe(before)
    expect(await canvas(page).getAttribute('data-rune')).toBeNull()
  })
})
