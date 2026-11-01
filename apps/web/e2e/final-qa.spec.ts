import { expect, test } from './fixtures'

// U13 (U4-1): tab rows follow the WAI-ARIA tabs pattern. One Tab stop per row (roving tabindex), arrows move the
// selection, and the panel is labelled by the selected tab.
for (const { route, list } of [
  { route: 'dashboard/', list: 'Dashboard sections' },
  { route: 'atlas/', list: 'Atlas guide sections' },
  { route: 'character/', list: 'Import method' },
]) {
  test(`${list}: one Tab stop, arrows move it, the panel names its tab`, async ({ page }) => {
    await page.goto(route)
    const tablist = page.getByRole('tablist', { name: list })
    const tabs = tablist.getByRole('tab')
    await expect(tabs.first()).toBeVisible()

    const stops = await tabs.evaluateAll((els) => els.map((t) => t.getAttribute('tabindex')))
    expect(stops.filter((t) => t === '0')).toHaveLength(1)
    expect(stops.filter((t) => t === '-1')).toHaveLength(stops.length - 1)

    const selected = tablist.locator('[role=tab][aria-selected=true]')
    const panel = page.locator(`#${await selected.getAttribute('aria-controls')}`)
    await expect(panel).toHaveAttribute('role', 'tabpanel')
    await expect(panel).toHaveAttribute('aria-labelledby', (await selected.getAttribute('id'))!)

    await selected.focus()
    await page.keyboard.press('ArrowRight')
    const next = tablist.locator('[role=tab][aria-selected=true]')
    await expect(next).toBeFocused()
    await expect(next).toHaveAttribute('tabindex', '0')
    await expect(page.locator(`#${await next.getAttribute('aria-controls')}`)).toHaveAttribute(
      'aria-labelledby',
      (await next.getAttribute('id'))!,
    )

    // Tab leaves the row instead of walking every tab.
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.activeElement?.getAttribute('role'))).not.toBe('tab')
  })
}
