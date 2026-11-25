import { mainCode, ownCode } from './main-payload'
import { expect, openTab, test } from './fixtures'

/**
 * Batch 1: the character sheet. Each code box and each config toggle renders every category: a value with a
 * provenance, or "missing" with its reason. Nothing is blank.
 */

async function expectNoBlankCategory(page: import('@playwright/test').Page) {
  const fields = page.locator('#panel-sheet [data-outline-field]')
  await expect(fields.first()).toBeVisible({ timeout: 30_000 })
  const rows = await fields.evaluateAll((els) =>
    els.map((el) => ({ key: el.getAttribute('data-outline-field'), provenance: el.getAttribute('data-provenance'), text: (el.textContent ?? '').trim() })),
  )
  expect(rows.length).toBeGreaterThan(40)
  for (const r of rows) {
    expect(['pob-export', 'derived', 'estimate', 'nominal', 'missing'], r.key ?? '').toContain(r.provenance)
    expect(r.text.length, r.key ?? '').toBeGreaterThan(0)
  }
}

for (const [name, code] of [['ninja-default', mainCode], ['pob2-own', ownCode]] as const) {
  test(`${name}: the poe.ninja code box fills the sheet, with what is missing named`, async ({ page }) => {
    await page.goto('character/')
    await page.getByLabel('Character model JSON or Path of Building code').fill(code)
    await page.getByRole('button', { name: 'Analyse pasted data' }).click()
    await openTab(page, 'sheet')
    const sheet = page.getByTestId('character-sheet')
    await expect(sheet).toHaveAttribute('data-box', 'ninja')
    await expect(sheet).toHaveAttribute('data-config', 'ninja')
    await expectNoBlankCategory(page)
    // Read figures show as read; the ones a code cannot carry are listed, not blank.
    await expect(page.locator('[data-outline-field="life"]')).toContainText('1,494')
    await expect(page.locator('[data-outline-field="ehp"]')).toContainText('20,451.92')
    await expect(page.locator('[data-outline-field="runicWard"]')).toContainText(/^missing:/)
    await expect(page.getByTestId('sheet-missing')).toContainText('Runic Ward')
    await expect(page.getByTestId('sheet-missing')).toContainText('League')
  })

  // V1 criterion 1: both reference codes, in each box and each toggle state.
  test(`${name}: the PoB2 code box and each config toggle render every category`, async ({ page }) => {
    await page.goto('character/')
    for (const [label, mode] of [
      ['poe.ninja config', 'ninja'],
      ['My own config', 'own'],
      ['No config', 'none'],
    ] as const) {
      await page.getByRole('button', { name: label, exact: true }).click()
      await page.getByLabel('Path of Building 2 code').fill(code)
      await page.getByRole('button', { name: 'Analyse PoB2 code' }).click()
      await openTab(page, 'sheet')
      const sheet = page.getByTestId('character-sheet')
      await expect(sheet).toHaveAttribute('data-box', 'pob', { timeout: 30_000 })
      await expect(sheet).toHaveAttribute('data-config', mode)
      await expectNoBlankCategory(page)
      // The toggle never changes a number read from the code.
      await expect(page.locator('[data-outline-field="life"]')).toContainText('1,494')
      if (mode === 'none') await expect(page.locator('#sheet-config [data-outline-field]')).toHaveCount(0)
      else await expect(page.locator('#sheet-config [data-outline-field]').first()).toBeVisible()
      await page.getByText('Load another character').click()
    }
  })
}

test('a PoB2 code with its own config lists that config as PoB shows it', async ({ page }) => {
  await page.goto('character/')
  await page.getByRole('button', { name: 'My own config', exact: true }).click()
  await page.getByLabel('Path of Building 2 code').fill(ownCode)
  await page.getByRole('button', { name: 'Analyse PoB2 code' }).click()
  await openTab(page, 'sheet')
  await expect(page.getByTestId('character-sheet')).toHaveAttribute('data-config', 'own', { timeout: 30_000 })
  await expectNoBlankCategory(page)
  await expect(page.locator('[data-outline-field="configEnemyLevel"]')).toContainText('82')
  await expect(page.locator('[data-outline-field="configCharges:Power"]')).toContainText('5')
  await expect(page.locator('[data-outline-field="configEffect:conditionShockEffect"]')).toContainText('27%')
  await expect(page.locator('#sheet-config')).toContainText('you have crit in the past 8 seconds')
})

test('Pro detail adds roll ranges, tiers and the raw PlayerStats', async ({ page }) => {
  await page.goto('character/')
  await page.getByLabel('Character model JSON or Path of Building code').fill(mainCode)
  await page.getByRole('button', { name: 'Analyse pasted data' }).click()
  await openTab(page, 'sheet')
  await expect(page.locator('#sheet-raw')).toHaveCount(0)
  await page.getByRole('button', { name: 'Pro detail' }).click()
  await expect(page.locator('#sheet-raw')).toContainText('TotalDPS')
  await expectNoBlankCategory(page)
})

test('a poe.ninja URL import has no code, so the sheet says so', async ({ page }) => {
  await page.goto(`character/?import=${encodeURIComponent('https://poe.ninja/poe2/profile/Demonad112-2589/runesofaldur/character/Main')}`)
  await expect(page.getByRole('heading', { name: /Main/ }).first()).toBeVisible({ timeout: 30_000 })
  await openTab(page, 'sheet')
  await expect(page.getByTestId('sheet-needs-code')).toBeVisible()
})
