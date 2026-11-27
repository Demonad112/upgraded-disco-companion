import { mainCode } from './main-payload'
import { expect, openTab, test } from './fixtures'

/**
 * The browser PoB engine (src/lib/pobEngineBrowser.ts): PoB2 in WebAssembly calculates every skill group of a pasted
 * code on this device, and the Damage tab adds them as "PoB calc". Desktop only: ~500 MB of wasm per page.
 *
 * Needs the engine files in out/pob-calc/ (scripts/fetch-pob-calc.mjs, from the release pinned in pob-calc.lock.json,
 * or POB_CALC_LOCAL + NEXT_PUBLIC_POB_CALC_LOCAL=1). A build without a pinned release ships none, and this spec says so
 * as a skip instead of failing on a file that was never meant to be there.
 */
test.use({ pobEngine: true })

test('a pasted code gets every skill group from PoB in the browser', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'desktop only (memory)')
  test.setTimeout(150_000)
  await page.goto('character/')

  await page.getByLabel('Path of Building 2 code').fill(mainCode)
  await page.getByRole('button', { name: 'Analyse PoB2 code' }).click()
  await openTab(page, 'damage')

  const status = page.locator('#panel-damage [role="status"]').filter({ hasText: 'Path of Building' })
  // Missing engine files show as "unavailable": only acceptable when the build pinned no release.
  await expect(status).toBeVisible({ timeout: 30_000 })
  if (/unavailable \(the engine files could not be loaded/.test((await status.textContent()) ?? '')) {
    test.skip(true, 'this build ships no browser engine (no release pinned in pob-calc.lock.json)')
  }
  await expect(status).toContainText(/calculated \d+ more skills? from your code/, { timeout: 120_000 })
  // The reference code is reproduced by PoB 0.23.1 exactly (disco-pob-calc parity): every stat the code carries.
  const text = (await status.textContent()) ?? ''
  const m = /reproduces (\d+) of the code’s (\d+) stats/.exec(text)
  expect(m, text).not.toBeNull()
  expect(Number(m![1])).toBe(Number(m![2]))
  await expect(page.locator('#panel-damage')).toContainText('others calculated by PoB')
  // A group the code carries no figure for, at PoB's own number (groups.oracle.json, LuaJIT: TotalDPS 129,453.38).
  await expect(page.locator('#panel-damage').locator('details.drow').filter({ hasText: 'Hollow Resonance' })).toContainText('129,453 if used continuously')
})
