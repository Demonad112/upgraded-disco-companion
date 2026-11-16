import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'

/**
 * Wraith companion: first-visit tour, hop gating and the "Next: {step}." tip, the start node per page, keyboard
 * open/close, tree navigation, footer toggle, placement and size at phone and desktop.
 */
const launcher = (page: Page) => page.getByRole('button', { name: /^Companion guide/ })
const bubble = (page: Page) => page.getByRole('dialog')

/** Past the first-visit tour; `tip` also marks this session's tip as opened, so a click opens the page's start. */
const seen = (page: Page, { tip = true, done = [] as string[] } = {}) =>
  page.addInitScript(
    ({ tip, done }) => {
      try {
        localStorage.setItem('poe2-companion-toured', '1')
        if (tip) sessionStorage.setItem('poe2-companion-tip-seen', '1')
        // A same-version payload is read as is, so seed every slice (as sky.spec does).
        if (done.length)
          localStorage.setItem(
            'poe2-endgame-companion:v1',
            JSON.stringify({
              version: 1,
              checklist: { completedStepIds: done, completedActionItemKeys: [] },
              atlas: { allocatedClusterIds: [], allocatedForkIds: [] },
              dashboard: { lastQuizAnswers: {} },
              character: { snapshots: [] },
              updatedAt: new Date().toISOString(),
            }),
          )
      } catch {}
    },
    { tip, done },
  )

test.describe('companion', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
  })

  test('tours once on the first visit; Esc returns focus', async ({ page }) => {
    await page.goto('')
    await expect(launcher(page)).toHaveAccessibleName('Companion guide: take the tour')
    await launcher(page).focus()
    await page.keyboard.press('Enter')
    await expect(bubble(page)).toContainText('Click me any time')
    await expect(page.getByRole('button', { name: 'Next' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(bubble(page)).toContainText('The checklist keeps your place.')
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(bubble(page)).toContainText('I nap when you go quiet.')
    await page.getByRole('button', { name: 'Got it' }).click()
    await expect(bubble(page)).toContainText('What are you after?')
    await page.keyboard.press('Escape')
    await expect(bubble(page)).toBeHidden()
    await expect(launcher(page)).toBeFocused()
    // No progress and no character: no hop for a tip.
    await expect(launcher(page)).toHaveAccessibleName('Companion guide')
    await page.reload()
    await expect(launcher(page)).toHaveAccessibleName('Companion guide')
  })

  test('hops only once the checklist is started; the tip names the next step', async ({ page }) => {
    await seen(page, { tip: false, done: ['step-campaign-end'] })
    await page.goto('')
    await expect(launcher(page)).toHaveAccessibleName('Companion guide: you have a tip')
    await launcher(page).click()
    await expect(bubble(page)).toContainText('Next: Know the three rules of the Atlas rush.')
    await page.getByRole('link', { name: 'Show me' }).click()
    await expect(page).toHaveURL(/\/checklist\/#step-atlas-rules$/)
    await expect(launcher(page)).toHaveAccessibleName('Companion guide')
  })

  test('opens on the node for the page', async ({ page }) => {
    await seen(page)
    await page.goto('atlas/')
    await launcher(page).click()
    await expect(bubble(page)).toContainText('Plan your Atlas tree')
    await page.getByRole('button', { name: 'Something else' }).click()
    await expect(bubble(page)).toContainText('What are you after?')
  })

  test('walks the tree to a tool, and answers a question', async ({ page }) => {
    await seen(page)
    await page.goto('')
    await launcher(page).click()
    await page.getByRole('button', { name: 'Questions' }).click()
    await page.getByRole('button', { name: 'Why is my grade a range?' }).click()
    await expect(bubble(page)).toContainText('Nothing is guessed.')
    await page.getByRole('button', { name: 'Something else' }).click()
    await page.getByRole('button', { name: 'Farm or plan my Atlas' }).click()
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

  for (const [w, h, size] of [[390, 844, 80], [1440, 900, 64]] as const) {
    test(`sits top-right at ${size}px and fits the screen at ${w}`, async ({ page }) => {
      await seen(page)
      await page.setViewportSize({ width: w, height: h })
      await page.goto('')
      const fig = (await launcher(page).boundingBox())!
      expect(Math.round(fig.height)).toBe(size)
      expect(fig.x + fig.width).toBeGreaterThan(w - 40)
      // Just under the nav (which the patch banner pushes down), not down by the tab bar.
      const nav = (await page.locator('nav').first().boundingBox())!
      expect(fig.y).toBeGreaterThanOrEqual(nav.y + nav.height - 2)
      expect(fig.y).toBeLessThan(nav.y + nav.height + 24)
      await launcher(page).click()
      const box = (await bubble(page).boundingBox())!
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(w)
      if (w < 720) {
        // The bubble drops below the figure and stays above the tab bar.
        expect(box.y).toBeGreaterThanOrEqual(fig.y + fig.height)
        const bar = (await page.locator('.tab-bar').boundingBox())!
        expect(box.y + box.height).toBeLessThanOrEqual(bar.y)
      }
      const scroll = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(scroll).toBeLessThanOrEqual(0)
    })
  }
})

test.describe('companion motion', () => {
  test('hops three times and rests; after 11 s idle every loop under it is paused', async ({ page }) => {
    test.setTimeout(45_000)
    await page.goto('')
    await expect(launcher(page)).toHaveAccessibleName('Companion guide: take the tour')
    // Finite (3 iterations), so it reaches finished instead of looping.
    const hop = await launcher(page).evaluate(async (el) => {
      const a = el.getAnimations().find((x) => (x as CSSAnimation).animationName === 'wraith-hop')
      if (!a) return 'missing'
      await a.finished
      return a.playState
    })
    expect(hop).toBe('finished')
    await expect(page.locator('html')).toHaveAttribute('data-idle', '', { timeout: 15_000 })
    await page.waitForTimeout(1000)
    const states = await page.locator('.wraith').evaluate((el) => el.getAnimations({ subtree: true }).map((a) => a.playState))
    expect(states.length).toBeGreaterThan(0)
    expect(states.filter((s) => s !== 'paused')).toEqual([])
  })
})
