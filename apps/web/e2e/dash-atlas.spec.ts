import { expect, test } from './fixtures'

test('the phone tab bar says Farm and every label fits at 280px', async ({ page }) => {
  await page.setViewportSize({ width: 280, height: 640 })
  await page.goto('checklist/')
  const links = page.getByRole('navigation', { name: 'Tools' }).getByRole('link')
  await expect(links).toHaveText(['Character', 'Farm', 'Atlas', 'Checklist'])
  // Nothing is cut with an ellipsis: each label's text is fully inside its tab.
  const clipped = await links.evaluateAll((els) =>
    els.map((a) => {
      const span = a.querySelector('span')!
      return span.scrollWidth > span.clientWidth
    }),
  )
  expect(clipped).toEqual([false, false, false, false])
})

test.describe('strategy rows', () => {
  test('invest and risk pills carry text, and the legend names the tiers', async ({ page }) => {
    await page.goto('dashboard/')
    const first = page.locator('ol details > summary').first()
    await expect(first.locator('.pill').nth(0)).toContainText(/Invest (low|medium|high)/)
    await expect(first.locator('.pill').nth(1)).toContainText(/Farm risk (low|medium|high)/)
    await expect(page.getByLabel('Tier legend')).toContainText('not ranked')
  })

  test('pills keep their text and notches with forced colours on', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' })
    await page.goto('dashboard/')
    const pill = page.locator('ol details > summary .pill').first()
    await expect(pill).toContainText(/Invest (low|medium|high)/)
    const filled = await pill.locator('.pill-notches i').evaluateAll((els) =>
      els.map((i) => getComputedStyle(i).backgroundColor !== getComputedStyle(i).getPropertyValue('--none')),
    )
    expect(filled).toHaveLength(3)
  })

  test('the quiz has a Reset that clears the answers', async ({ page }) => {
    await page.goto('dashboard/')
    await page.getByRole('button', { name: 'Help me choose' }).click()
    await expect(page.getByRole('button', { name: 'Reset', exact: true })).toHaveCount(0)
    const selects = page.locator('#farm-help select')
    for (let i = 0; i < 3; i++) await selects.nth(i).selectOption({ index: 1 })
    await expect(page.getByText('Suggested', { exact: true }).first()).toBeVisible()
    await page.getByRole('button', { name: 'Reset', exact: true }).click()
    await expect(page.getByText('Suggested', { exact: true })).toHaveCount(0)
  })

  test('boss cards show requirement numbers in stat tiles', async ({ page }) => {
    await page.goto('dashboard/')
    await page.getByRole('tab', { name: /Pinnacle bosses/ }).click()
    await expect(page.locator('.stat-tile .tabular').first()).toHaveText(/^\d+$/)
  })
})

// The map is on the page at every width; on phones the list is a sheet that the peek bar's List button opens.
async function openMap(page: import('@playwright/test').Page) {
  await page.goto('atlas/')
}
async function openList(page: import('@playwright/test').Page) {
  if ((page.viewportSize()?.width ?? 1280) <= 720) await page.getByRole('button', { name: 'List', exact: true }).click()
}

test.describe('atlas map panel', () => {
  test('the legend sits on the map as Route line, Traps and Ticked toggles', async ({ page }) => {
    await openMap(page)
    const legend = page.getByRole('list', { name: 'Map legend' })
    for (const name of ['Route line', 'Traps', 'Ticked']) {
      const toggle = legend.getByRole('button', { name })
      await expect(toggle).toHaveAttribute('aria-pressed', 'true')
      await toggle.click()
      await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    }
    await expect(page.locator('#atlas-map').getByRole('list', { name: 'Map legend' })).toBeVisible()
  })

  test('on a phone the list is a dialog: Escape and back close it, focus stays inside', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('atlas/')
    const dialog = page.getByRole('dialog', { name: 'Atlas guide list' })
    await expect(dialog).toHaveCount(0)
    await page.getByRole('button', { name: 'List', exact: true }).click()
    await expect(dialog).toBeVisible()
    // Tab never leaves the dialog.
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab')
      expect(await page.evaluate(() => !!document.activeElement?.closest('section[aria-label="Atlas guide list"]'))).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    expect(new URL(page.url()).pathname).toMatch(/atlas\/?$/)
    await page.getByRole('button', { name: 'List', exact: true }).click()
    await expect(dialog).toBeVisible()
    await page.goBack()
    await expect(dialog).toHaveCount(0)
    expect(new URL(page.url()).pathname).toMatch(/atlas\/?$/)
  })

  test('search shows a result count and has a clear button', async ({ page }) => {
    await openMap(page)
    const box = page.getByRole('searchbox', { name: 'Find an Atlas node' })
    await expect(page.getByRole('button', { name: 'Clear search' })).toHaveCount(0)
    await box.fill('trap')
    await expect(page.locator('#atlas-search-count')).toContainText(/\d+ match/)
    await page.getByRole('button', { name: 'Clear search' }).click()
    await expect(box).toHaveValue('')
    await expect(page.locator('#atlas-search-count')).toHaveText('')
    await box.fill('zzzzqq')
    await expect(page.locator('#atlas-search-count')).toHaveText('No matches')
  })

  test('map controls zoom and fit by button and by key', async ({ page }) => {
    await openMap(page)
    const ctl = page.getByRole('group', { name: 'Map zoom' })
    await expect(ctl.getByRole('button')).toHaveCount(4)
    const canvas = page.locator('#atlas-map canvas')
    const shot = () => canvas.screenshot()
    await page.waitForTimeout(300)
    const base = await shot()
    await ctl.getByRole('button', { name: 'Zoom in' }).click()
    await page.waitForTimeout(150)
    const zoomed = await shot()
    expect(zoomed.equals(base)).toBe(false)
    // Keys act while the map has focus; each one redraws the canvas.
    await page.locator('#atlas-map').focus()
    let prev = zoomed
    for (const key of ['0', '+', '+', '-']) {
      await page.keyboard.press(key)
      await page.waitForTimeout(150)
      const next = await shot()
      expect(next.equals(prev), `key ${key}`).toBe(false)
      prev = next
    }
    // Typing the same keys in the search box types them; it does not move the map.
    const box = page.getByRole('searchbox', { name: 'Find an Atlas node' })
    await box.fill('')
    await box.pressSequentially('0+-')
    await expect(box).toHaveValue('0+-')
  })

  test('the map panel uses no backdrop-filter', async ({ page }) => {
    await page.goto('atlas/')
    await openList(page)
    await page.getByRole('button', { name: 'Show Trapped Subordinate on the Atlas tree' }).click()
    const filters = await page.locator('#atlas-map, #atlas-map *').evaluateAll((els) =>
      els.map((e) => getComputedStyle(e).backdropFilter).filter((f) => f && f !== 'none'),
    )
    expect(filters).toEqual([])
  })
})

test.describe('atlas map controls and phone layout', () => {
  test('Route line hides the legs, Locate keeps the zoom, Follow is off by default', async ({ page }) => {
    await openMap(page)
    await expect(page.getByRole('button', { name: 'Follow' })).toHaveAttribute('aria-pressed', 'false')
    // Legs are drawn from the start node: the legend lists them and the bar names the current step's leg.
    if ((page.viewportSize()?.width ?? 1280) > 720) await expect(page.getByRole('list', { name: 'Route legs' })).toContainText('Leg 1')
    await expect(page.getByRole('group', { name: 'Route steps' })).toContainText(/leg \d/)
    const route = page.getByRole('list', { name: 'Map legend' }).getByRole('button', { name: 'Route line' })
    const canvas = page.locator('#atlas-map canvas')
    await page.waitForTimeout(400)
    const on = await canvas.screenshot()
    await route.click()
    await page.waitForTimeout(150)
    expect((await canvas.screenshot()).equals(on)).toBe(false)
    await page.getByRole('button', { name: 'Locate step' }).click()
  })

  test('on a phone the map fills the screen above a bottom peek bar with the step and List', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('atlas/')
    const peek = page.getByRole('group', { name: 'Route steps' })
    await expect(peek).toBeVisible()
    await expect(peek).toContainText('1 of 17')
    await peek.getByRole('button', { name: 'Next step' }).click()
    await expect(peek).toContainText('2 of 17')
    await page.evaluate(() => document.getElementById('atlas-stage')!.scrollIntoView())
    const map = await page.locator('#atlas-map').boundingBox()
    const bar = await peek.boundingBox()
    expect(map!.y + map!.height).toBeLessThanOrEqual(bar!.y + 1)
    expect(map!.height).toBeGreaterThan(400)
    expect(await page.locator('.atlas-full-btn').isVisible()).toBe(false)
  })
})

test('dashboard and atlas do not scroll sideways at 280, 320 and 390px', async ({ page }) => {
  for (const width of [280, 320, 390]) {
    await page.setViewportSize({ width, height: 700 })
    for (const path of ['dashboard/', 'atlas/']) {
      await page.goto(path)
      await expect(page.getByRole('navigation', { name: 'Tools' })).toBeVisible()
      await page.waitForLoadState('networkidle')
      const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
      expect(over, `${path} at ${width}px`).toBeLessThanOrEqual(1)
    }
  }
  // The quiz's three selects, boss tiles and mechanic rows too.
  await page.setViewportSize({ width: 280, height: 700 })
  await page.goto('dashboard/')
  await page.getByRole('tab', { name: /Pinnacle bosses/ }).click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
  await page.goto('atlas/')
  await page.getByRole('tab', { name: /Mechanics/ }).click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
})

// Compact mode narrows main's padding; the full-bleed tab rows must follow it.
test('compact dashboard and atlas do not scroll sideways at 280 and 390px', async ({ page }) => {
  await page.goto('dashboard/?compact=1')
  for (const width of [280, 390]) {
    await page.setViewportSize({ width, height: 700 })
    for (const path of ['dashboard/', 'atlas/']) {
      await page.goto(path)
      await expect(page.locator('html')).toHaveAttribute('data-compact', '')
      await page.waitForLoadState('networkidle')
      const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
      expect(over, `compact ${path} at ${width}px`).toBeLessThanOrEqual(1)
    }
  }
})

test('R38: /dashboard/ (Farm) carries the level-only tier planner (no import needed)', async ({ page }) => {
  await page.goto('dashboard/')
  await page.getByText('Which tier to run').click()
  const panel = page.getByRole('region', { name: 'Survivability by waystone tier' })
  await expect(panel).toContainText('General estimate from level only', { timeout: 15_000 })
  await panel.getByLabel('Your level').fill('70')
  await expect(panel).toContainText(/Run T\d+/)
  // AR1: the tier planner moved off the Atlas page.
  await page.goto('atlas/')
  await expect(page.getByText('Which tier to run')).toHaveCount(0)
})

