import { deflateSync, inflateSync } from 'node:zlib'
import { mainCode, ownCode } from './main-payload'
import { expect, openTab, test } from './fixtures'

/**
 * V1 success criteria 3 and 4 (docs/plans/simple-code-analysis.md), on the Damage tab's per-skill list.
 * C4: under own/none config no estimate appears; only the main skill and the code's Full DPS rows are listed.
 * C3: past 25% the other skills hide behind the Full DPS steps, and "Show anyway" shows them labelled unreliable.
 */

/** The reference code with its TotalDPS tripled, so the mini-calc's main skill lands far past 25% (PoB's url-safe base64 + zlib). */
function codeWithTotalDps(code: string, factor: number): string {
  const xml = inflateSync(Buffer.from(code.replace(/-/g, '+').replace(/_/g, '/'), 'base64')).toString('utf8')
  const out = xml.replace(/(<PlayerStat stat="TotalDPS" value=")([\d.]+)"/, (_, head: string, v: string) => `${head}${Number(v) * factor}"`)
  if (out === xml) throw new Error('no TotalDPS PlayerStat in the reference code')
  return deflateSync(Buffer.from(out, 'utf8')).toString('base64').replace(/\+/g, '-').replace(/\//g, '_')
}

async function pastePob(page: import('@playwright/test').Page, config: string, code: string) {
  await page.goto('character/')
  await page.getByRole('button', { name: config, exact: true }).click()
  await page.getByLabel('Path of Building 2 code').fill(code)
  await page.getByRole('button', { name: 'Analyse PoB2 code' }).click()
  await openTab(page, 'damage')
}

for (const config of ['My own config', 'No config'] as const) {
  test(`${config}: the Damage tab lists only exact rows, with no estimate`, async ({ page }) => {
    await pastePob(page, config, ownCode)
    const list = page.locator('[data-estimates="exact"]')
    await expect(list).toBeVisible({ timeout: 30_000 })
    await expect(list.locator('[data-provenance="estimate"]')).toHaveCount(0)
    await expect(list).not.toContainText('≈ est.')
    // pob2-own: Storm Wave (main) plus the skills ticked for Full DPS, each at the code's own number.
    await expect(list.locator('[data-skill-row][data-main]')).toContainText('372,908')
    await expect(list.locator('[data-skill-row="Staggering Palm"]')).toContainText('182,201')
    await expect(list.getByRole('button', { name: 'Show anyway' })).toHaveCount(0)
  })
}

test('poe.ninja config: the other skills carry calibrated estimates', async ({ page }) => {
  await pastePob(page, 'poe.ninja config', mainCode)
  const list = page.locator('[data-estimates="calibrated"]')
  await expect(list).toBeVisible({ timeout: 30_000 })
  await expect(list.locator('[data-provenance="estimate"]').first()).toBeVisible()
})

test('past 25% the estimates hide behind the Full DPS steps until "Show anyway"', async ({ page }) => {
  await pastePob(page, 'poe.ninja config', codeWithTotalDps(mainCode, 3))
  const list = page.locator('[data-estimates="hidden"]')
  await expect(list).toBeVisible({ timeout: 30_000 })
  await expect(list.locator('[data-provenance="estimate"]')).toHaveCount(0)
  await expect(list.locator('[data-full-dps-hint]')).toContainText('Include in Full DPS')
  await list.getByRole('button', { name: 'Show anyway' }).click()
  await expect(list.locator('[data-provenance="estimate"]').first()).toBeVisible()
  await expect(list).toContainText('unreliable (main skill off by')
})
