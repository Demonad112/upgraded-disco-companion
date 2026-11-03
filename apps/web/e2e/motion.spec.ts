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
    for (const sel of ['.hero-pill', 'h1', 'p', 'ul', '.triad > i', '.triad > span']) {
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

/** MP1: View Transitions, astrolabe, gold-foil sweep and the Atlas scroll reveal. All CSS but the route wrapper. */
test.describe('MP1 motion polish', () => {
  test('a tool card opens its page through a view transition, its title sharing the page title’s name', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __vt: number }
      w.__vt = 0
      const start = document.startViewTransition?.bind(document)
      if (start)
        document.startViewTransition = ((cb: ViewTransitionUpdateCallback) => {
          w.__vt++
          return start(cb)
        }) as typeof document.startViewTransition
    })
    await page.goto('')
    const supported = await page.evaluate(() => typeof document.startViewTransition === 'function')
    await expect(page.locator('a[data-pulse] h2[data-vt="atlas"]')).toHaveCount(1)
    await page.locator('a[data-pulse]').nth(1).click()
    await expect(page).toHaveURL(/\/atlas\/?$/)
    await expect(page.locator('h1[data-vt="atlas"]')).toHaveCount(1)
    expect(await page.evaluate(() => (window as unknown as { __vt: number }).__vt)).toBe(supported ? 1 : 0)
  })

  test('the astrolabe dial turns with the page scroll, in square brass ticks', async ({ page }) => {
    await page.goto('')
    const dial = page.locator('svg[data-fx="astrolabe"] .astro-dial')
    await expect(dial).toHaveCount(1)
    const scrollDriven = await page.evaluate(() => CSS.supports('animation-timeline: scroll()'))
    expect(await animationOf(dial)).toBe(scrollDriven ? 'astro-turn' : 'none')
    expect(await page.locator('svg[data-fx="astrolabe"] circle').first().evaluate((el) => getComputedStyle(el).strokeLinecap)).toBe('butt')
  })

  test('the astrolabe marks one tick per section where a page has a section bar', async ({ page }) => {
    await page.goto('methodology/')
    const links = await page.locator('nav.tabbar a').count()
    await expect(page.locator('.astro-section')).toHaveCount(links)
    await page.locator('nav.tabbar a').nth(2).click()
    await expect(page.locator('.astro-section[data-current]')).toHaveCount(1)
  })

  test('gold lettering sweeps once after the draw-in, and again on hover of its link', async ({ page, isMobile }) => {
    await page.goto('')
    const gold = page.locator('h1.hero-title .text-gradient-gold')
    expect(await animationOf(gold)).toBe('foil-sweep')
    expect(await gold.evaluate((el) => getComputedStyle(el).backgroundImage.split('linear-gradient').length - 1)).toBe(2)
    if (isMobile) return
    const brand = page.locator('nav.site-nav a').first()
    await brand.hover()
    expect(await animationOf(brand.locator('.text-gradient-gold'))).toBe('foil-sweep, foil-hover')
  })

  test('Atlas nodes below the fold wait for the scroll; nodes on screen are drawn', async ({ page }) => {
    await page.goto('atlas/')
    const nodes = page.locator('[data-reveal="node"]')
    await expect(nodes.first()).toBeVisible()
    if (!(await page.evaluate(() => CSS.supports('animation-timeline: view()')))) return
    expect(await animationOf(nodes.first())).toBe('reveal-rise')
    const last = nodes.last()
    expect(Number(await last.evaluate((el) => getComputedStyle(el).opacity))).toBeLessThan(1)
    await last.scrollIntoViewIfNeeded()
    await page.evaluate(() => window.scrollBy(0, 200))
    await expect.poll(() => last.evaluate((el) => Number(getComputedStyle(el).opacity))).toBe(1)
  })

  test('fork branches draw their stroke, trap nodes flicker on reveal', async ({ page }) => {
    await page.goto('atlas/')
    if (!(await page.evaluate(() => CSS.supports('animation-timeline: view()')))) return
    await page.getByRole('tab', { name: /forks/i }).click()
    expect(await animationOf(page.locator('[data-reveal="branch"] .reveal-stroke path').first())).toBe('reveal-draw')
    await page.getByRole('tab', { name: /trap/i }).click()
    expect(await animationOf(page.locator('[data-reveal="trap"] > details').first())).toBe('reveal-flicker')
  })
})

test.describe('MP1 under reduced motion', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
  })

  test('route changes skip the view transition', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __vt: number }
      w.__vt = 0
      const start = document.startViewTransition?.bind(document)
      if (start)
        document.startViewTransition = ((cb: ViewTransitionUpdateCallback) => {
          w.__vt++
          return start(cb)
        }) as typeof document.startViewTransition
    })
    await page.goto('')
    await page.locator('a[data-pulse]').nth(1).click()
    await expect(page).toHaveURL(/\/atlas\/?$/)
    expect(await page.evaluate(() => (window as unknown as { __vt: number }).__vt)).toBe(0)
  })

  test('astrolabe, foil and Atlas reveal are static, in their final state', async ({ page }) => {
    await page.goto('')
    expect(await animationOf(page.locator('.astro-dial'))).toBe('none')
    const gold = page.locator('h1.hero-title .text-gradient-gold')
    expect(await animationOf(gold)).toBe('none')
    expect(await gold.evaluate((el) => getComputedStyle(el).getPropertyValue('--foil-x').trim())).toBe('150%')
    await page.goto('atlas/')
    const last = page.locator('[data-reveal="node"]').last()
    expect(await animationOf(last)).toBe('none')
    expect(await last.evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
  })
})
