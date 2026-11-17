import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'

/** Footer "Visual effects" (lib/fxTier) and the auto checks (lib/fxProbe). Motion is allowed in every test here. */
const html = (page: Page) => page.locator('html')
const pick = (page: Page, choice: object) =>
  page.addInitScript((value) => localStorage.setItem('poe2-fx-tier', value), JSON.stringify({ v: 1, auto: 'full', ...choice }))

test('Still: the sky holds one frame and the wraith has no animations', async ({ page }) => {
  await pick(page, { choice: 'still' })
  await page.goto('')
  await expect(html(page)).toHaveAttribute('data-fx', 'still')
  await expect(page.getByRole('button', { name: /^Companion/ })).toBeVisible()
  await page.waitForTimeout(500)
  await expect(page.locator('canvas[data-fx="sky"]')).not.toHaveAttribute('data-running')
  const count = await page.locator('.wraith').evaluate((el) => el.getAnimations({ subtree: true }).length)
  expect(count).toBe(0)
})

test('the footer pick applies at once and survives a reload', async ({ page }) => {
  await page.goto('')
  const select = page.getByLabel('Visual effects')
  await expect(select).toHaveValue('full')
  await select.selectOption('lite')
  await expect(html(page)).toHaveAttribute('data-fx', 'lite')
  await page.reload()
  await expect(html(page)).toHaveAttribute('data-fx', 'lite')
  await expect(page.getByLabel('Visual effects')).toHaveValue('lite')
})

test('slow frames lower Auto once, with one toast', async ({ page }) => {
  test.setTimeout(60_000)
  // Auto on a strong machine with a real GPU, then every frame made slow (45 ms of work).
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      sessionStorage.setItem('seeded', '1')
      localStorage.setItem('poe2-fx-tier', JSON.stringify({ v: 1, choice: 'auto', auto: 'full' }))
    }
    const proto = HTMLCanvasElement.prototype as unknown as { getContext: (type: string, ...rest: unknown[]) => unknown }
    const getContext = proto.getContext
    proto.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (type !== 'webgl' && type !== 'experimental-webgl') return getContext.call(this, type, ...rest)
      return {
        RENDERER: 0x1f01,
        getExtension: (n: string) => (n === 'WEBGL_debug_renderer_info' ? { UNMASKED_RENDERER_WEBGL: 0x9246 } : { loseContext() {} }),
        getParameter: () => 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
      }
    }
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 })
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 })
    const burn = () => {
      const t = performance.now()
      while (performance.now() - t < 45);
      requestAnimationFrame(burn)
    }
    requestAnimationFrame(burn)
  })
  // Above 480 px: below it Auto already starts still (HG1-5), so there is nothing to lower.
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('')
  const toast = page.locator('[data-fx-toast]')
  await expect(toast).toHaveText(/Effects lowered for smoother scrolling\. Change in the footer\./, { timeout: 30_000 })
  await expect(html(page)).toHaveAttribute('data-fx', 'lite')
  await expect(page.getByLabel('Visual effects')).toHaveValue('auto')
  await toast.getByRole('button', { name: 'OK' }).click()
  await expect(toast).toHaveCount(0)
  await page.reload()
  await expect(html(page)).toHaveAttribute('data-fx', 'lite')
  await page.waitForTimeout(8000)
  await expect(toast).toHaveCount(0)
})

test('Auto starts still under 480 px and full above it (HG1-5)', async ({ page }) => {
  // Nothing stored on every load: the fixture's pinned full pick is removed, so the default shows. A real GPU and
  // 8 cores, so only the width decides (CI's software renderer would make Auto still at any width).
  await page.addInitScript(() => {
    localStorage.removeItem('poe2-fx-tier')
    const proto = HTMLCanvasElement.prototype as unknown as { getContext: (type: string, ...rest: unknown[]) => unknown }
    const getContext = proto.getContext
    proto.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (type !== 'webgl' && type !== 'experimental-webgl') return getContext.call(this, type, ...rest)
      return {
        RENDERER: 0x1f01,
        getExtension: (n: string) => (n === 'WEBGL_debug_renderer_info' ? { UNMASKED_RENDERER_WEBGL: 0x9246 } : { loseContext() {} }),
        getParameter: () => 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
      }
    }
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 })
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 })
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('')
  await expect(html(page)).toHaveAttribute('data-fx', 'still')
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.reload()
  await expect(html(page)).toHaveAttribute('data-fx', 'full')
  // Give the after-paint probe time to run; it must not lower a strong machine above 480 px.
  await page.waitForTimeout(1500)
  await expect(html(page)).toHaveAttribute('data-fx', 'full')
})
