import AxeBuilder from '@axe-core/playwright'
import { expect, test } from './fixtures'

const net = (page: import('@playwright/test').Page) => page.getByTestId('farm-net').locator('.farm-num').first()
const netValue = async (page: import('@playwright/test').Page) => Number((await net(page).innerText()).replace(/[^\d-]/g, ''))

test.describe('farm planner', () => {
  test('choosing a farm renders Step 2; Step 2 is disabled before that', async ({ page }) => {
    await page.goto('dashboard/')
    await expect(page.getByRole('tab', { name: /Set up/ })).toBeDisabled()
    await page.getByRole('button', { name: /Omen Abyss/ }).click()
    await expect(page.getByTestId('farm-setup')).toBeVisible()
    await expect(page.getByRole('tab', { name: /Set up/ })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByTestId('farm-footnote')).toContainText('Map score, not predicted drops')
    await expect(page.getByTestId('farm-footnote')).toContainText(/\d+ unverified/)
  })

  test('changing a mod changes the Net text; Apply on the best swap raises Net', async ({ page }) => {
    await page.goto('dashboard/#farm-abyss-amanamu')
    await expect(page.getByTestId('farm-setup')).toBeVisible()
    // Swap Tablet 1's first prefix to a stat the Abyss preset gives no weight.
    const before = await netValue(page)
    await page.getByLabel('Tablet 1 prefix 1', { exact: true }).selectOption({ label: /Item rarity/ as never }).catch(async () => {
      await page.getByLabel('Tablet 1 prefix 1', { exact: true }).selectOption('t-item-rarity')
    })
    await expect.poll(() => netValue(page)).toBeLessThan(before)
    const worse = await netValue(page)
    await expect(page.getByText('Best 3 swaps')).toBeVisible()
    await page.getByRole('button', { name: 'Apply' }).first().click()
    await expect.poll(() => netValue(page)).toBeGreaterThan(worse)
  })

  test('a rare tablet takes a 2nd prefix, a magic one does not', async ({ page }) => {
    await page.goto('dashboard/#farm-abyss-amanamu')
    const tablet = page.getByRole('article', { name: 'Tablet 1' })
    // A rare tablet holds 3 mods without the keystones: free one slot, then fill the 2nd prefix.
    await tablet.getByLabel('Remove Tablet 1 suffix 1', { exact: true }).click()
    await expect(tablet.getByLabel('Tablet 1 prefix 2', { exact: true })).toBeVisible()
    await tablet.getByLabel('Tablet 1 prefix 2', { exact: true }).selectOption('t-item-rarity')
    await expect(tablet.getByLabel('Tablet 1 prefix 3', { exact: true })).toHaveCount(0)
    await expect(tablet.getByLabel('Tablet 1 prefix 2', { exact: true })).toBeVisible()
    await tablet.getByRole('combobox', { name: 'Rarity' }).selectOption('magic')
    await expect(tablet.getByLabel('Tablet 1 prefix 2', { exact: true })).toHaveCount(0)
  })

  test('the #farm-<id> link opens Step 2, and a strategy id link still opens the strategy', async ({ page }) => {
    await page.goto('dashboard/#farm-expedition-runes-of-aldur')
    await expect(page.getByRole('heading', { name: 'Expedition', exact: true })).toBeVisible()
    await page.goto('dashboard/#breach-rares')
    await expect(page.getByRole('tab', { name: /Strategies/ })).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('#breach-rares')).toBeVisible()
  })

  test('a reload keeps the loadout', async ({ page }) => {
    await page.goto('dashboard/#farm-abyss-amanamu')
    await page.getByRole('button', { name: 'Add tablet' }).click()
    await expect(page.getByRole('article', { name: 'Tablet 3' })).toBeVisible()
    await page.goto('dashboard/')
    await page.reload()
    await expect(page.getByRole('article', { name: 'Tablet 3' })).toBeVisible()
  })

  test('the tablet cap comes from the data and a 4th needs a City map', async ({ page }) => {
    await page.goto('dashboard/#farm-abyss-amanamu')
    await page.getByRole('button', { name: 'Add tablet' }).click()
    await expect(page.getByRole('button', { name: 'Add tablet' })).toBeDisabled()
    await page.getByLabel('Where the map sits').selectOption('city')
    await expect(page.getByRole('button', { name: 'Add tablet' })).toBeEnabled()
  })

  test('reduced motion shows no animation on the figures', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('dashboard/#farm-abyss-amanamu')
    const name = await net(page).evaluate((el) => getComputedStyle(el).animationName)
    expect(name).toBe('none')
  })

  test('no sideways scroll at 280px, in either step', async ({ page }) => {
    await page.setViewportSize({ width: 280, height: 700 })
    await page.goto('dashboard/')
    await page.waitForLoadState('networkidle')
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
    await page.getByRole('button', { name: /Omen Abyss/ }).click()
    await expect(page.getByTestId('farm-setup')).toBeVisible()
    await page.waitForLoadState('networkidle')
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
  })

  test('axe is clean on Step 1 and Step 2', async ({ page }) => {
    await page.goto('dashboard/')
    await page.waitForLoadState('networkidle')
    let r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(r.violations.map((v) => v.id)).toEqual([])
    await page.getByRole('button', { name: /Omen Abyss/ }).click()
    await expect(page.getByTestId('farm-setup')).toBeVisible()
    r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(r.violations.map((v) => v.id)).toEqual([])
  })
})
