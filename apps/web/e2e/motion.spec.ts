import { expect, test } from './fixtures'

/** W15-2: card-hover pulse and hero draw-in. Both are CSS, so the tests read computed animation names. */
const animationOf = (loc: ReturnType<import('@playwright/test').Page['locator']>) =>
  loc.evaluate((el) => getComputedStyle(el).animationName)

test.describe('motion allowed', () => {
  test('hero draws in once on load', async ({ page }) => {
    await page.goto('')
    const hero = page.locator('[data-draw-in]')
    await expect(hero).toHaveCount(1)
    expect(await animationOf(hero.locator('h1'))).toBe('hero-rise')
    expect(await animationOf(hero.locator('.triad > span'))).toBe('hero-draw')
    expect(await animationOf(hero.locator('.triad > i').first())).toBe('hero-pop')
  })

  test('tool cards carry the pulse hook and square corners', async ({ page }) => {
    await page.goto('')
    const cards = page.locator('a[data-pulse]')
    await expect(cards).toHaveCount(4)
    expect(await cards.first().evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).toBe('0px')
  })

  test('keyboard focus pulses a tool card', async ({ page }) => {
    await page.goto('')
    const card = page.locator('a[data-pulse]').first()
    expect(await animationOf(card)).not.toBe('card-pulse')
    // Tab until the card holds focus-visible.
    for (let i = 0; i < 30 && !(await card.evaluate((el) => el.matches(':focus-visible'))); i++) {
      await page.keyboard.press('Tab')
    }
    expect(await animationOf(card)).toBe('card-pulse')
  })
})

test.describe('reduced motion', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('')
  })

  test('hero is static', async ({ page }) => {
    const hero = page.locator('[data-draw-in]')
    for (const sel of ['.eyebrow', 'h1', 'p', 'ul', '.triad > i', '.triad > span']) {
      expect(await animationOf(hero.locator(sel).first()), sel).toBe('none')
    }
  })

  test('tool cards do not pulse on focus', async ({ page }) => {
    const card = page.locator('a[data-pulse]').first()
    await card.focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    expect(await card.evaluate((el) => el.matches(':focus-visible'))).toBe(true)
    expect(await animationOf(card)).toBe('none')
  })
})

test('hover pulses a tool card only where the device hovers', async ({ page, isMobile }) => {
  await page.goto('')
  const card = page.locator('a[data-pulse]').first()
  await card.hover()
  const name = await animationOf(card)
  // Pixel 7 emulation reports (hover: none), so the hover rule must not apply there.
  expect(name).toBe(isMobile ? 'none' : 'card-pulse')
})
