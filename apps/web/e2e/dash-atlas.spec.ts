import { expect, test } from './fixtures'

test('the phone tab bar says Dashboard and every label fits at 280px', async ({ page }) => {
  await page.setViewportSize({ width: 280, height: 640 })
  await page.goto('checklist/')
  const links = page.getByRole('navigation', { name: 'Tools' }).getByRole('link')
  await expect(links).toHaveText(['Checklist', 'Atlas', 'Dashboard', 'Character'])
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
    await expect(first.locator('.pill').nth(1)).toContainText(/Risk (low|medium|high)/)
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
    await expect(page.getByRole('button', { name: 'Reset', exact: true })).toHaveCount(0)
    const selects = page.locator('main select')
    for (let i = 0; i < 3; i++) await selects.nth(i).selectOption({ index: 1 })
    await expect(page.getByText('Recommended for you')).toBeVisible()
    await page.getByRole('button', { name: 'Reset', exact: true }).click()
    await expect(page.getByText('Recommended for you')).toHaveCount(0)
  })

  test('boss cards show requirement numbers in stat tiles', async ({ page }) => {
    await page.goto('dashboard/')
    await page.getByRole('tab', { name: /Pinnacle bosses/ }).click()
    await expect(page.locator('.stat-tile .tabular').first()).toHaveText(/^\d+$/)
  })
})

test.describe('atlas map panel', () => {
  test('the legend sits in the panel with counts', async ({ page }) => {
    await page.goto('atlas/')
    const legend = page.getByRole('list', { name: 'Map legend' })
    await expect(legend).toContainText(/Guide\s*\d+/)
    await expect(legend).toContainText(/Trap\s*\d+/)
    await expect(legend).toContainText(/Ticked\s*\d+/)
    await expect(page.locator('section[aria-label="Atlas tree map"]').getByRole('list', { name: 'Map legend' })).toBeVisible()
  })

  test('search shows a result count and has a clear button', async ({ page }) => {
    await page.goto('atlas/')
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
    await page.goto('atlas/')
    const ctl = page.getByRole('group', { name: 'Map zoom' })
    await expect(ctl.getByRole('button')).toHaveCount(3)
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
    await page.getByRole('button', { name: 'Show Trapped Subordinate on the Atlas tree' }).click()
    const filters = await page.locator('#atlas-map, #atlas-map *').evaluateAll((els) =>
      els.map((e) => getComputedStyle(e).backdropFilter).filter((f) => f && f !== 'none'),
    )
    expect(filters).toEqual([])
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
