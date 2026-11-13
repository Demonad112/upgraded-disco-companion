import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Page } from '@playwright/test'
import { PROFILE_URL, expect, openTab, test } from './fixtures'

/**
 * Unique/corrupted mods have no craftable ladder; their text comes from mod-display.json,
 * fetched only when a character has one. The captured fixture has none, so one jewel mod is swapped for a unique's.
 */
const fixture = JSON.parse(readFileSync(resolve('../../packages/core/test/fixtures/athrynas-v43.json'), 'utf8'))
const jewelMods = Object.values(fixture.charModel.jewels[0].itemData.mods).find((l) => Array.isArray(l) && l.length) as {
  id: string
}[]
jewelMods[0]!.id = 'UniqueCharmIgniteEnemiesInPresence1'
const body = JSON.stringify(fixture)

const TEXT = /Creates Ignited Ground for 4 seconds/
const RAW_ID = /UniqueCharmIgniteEnemiesInPresence1/

// The service worker would answer from cache and bypass the routes below.
test.use({ serviceWorkers: 'block' })

test.beforeEach(async ({ page }) => {
  await page.route('**/api/character**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body }))
})

async function importCharacter(page: Page) {
  const box = page.locator('main details').first()
  if ((await box.getAttribute('open')) === null) await page.getByText('Load another character').click()
  await page.getByLabel('poe.ninja character URL').fill(PROFILE_URL)
  await page.getByRole('button', { name: 'Analyse', exact: true }).click()
  // The name heading is on Overview; a second import keeps the tab from the URL hash.
  await openTab(page, 'overview')
  await expect(page.getByRole('heading', { name: /Athrynas/ }).first()).toBeVisible({ timeout: 30_000 })
  // The mod text is fetched when a tab that shows it (Gear, Damage, Advanced) opens, not on import.
  await openTab(page, 'advanced')
  // The tab body is a lazy chunk: wait for it, or the details below mount after they are opened.
  await expect(page.getByRole('heading', { name: 'Advanced', level: 2 })).toBeVisible()
  await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)))
}

/** A late re-render (the mod text arriving, a retry) can close the details opened above, so reopen until shown. */
async function expectShown(page: Page, text: RegExp) {
  await expect(async () => {
    await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)))
    await expect(page.getByText(text)).toBeVisible({ timeout: 1_000 })
  }).toPass({ timeout: 10_000 })
}

test('a unique mod shows its text, and still does after a second import in the same tab', async ({ page }) => {
  let fetches = 0
  await page.route(/mod-display\.json/, (r) => {
    fetches++
    return r.fallback()
  })
  await page.goto('character/')
  await importCharacter(page)
  await expectShown(page, TEXT)
  await expect(page.getByText(RAW_ID)).toHaveCount(0)

  await importCharacter(page)
  await expectShown(page, TEXT)
  await expect(page.getByText(RAW_ID)).toHaveCount(0)
  expect(fetches, 'the latch fetches the text once, not per import').toBe(1)
})

test('a failed mod-text fetch is retried once, so a blip does not leave raw ids', async ({ page }) => {
  let fetches = 0
  await page.route(/mod-display\.json/, (r) => (++fetches === 1 ? r.fulfill({ status: 500, body: 'x' }) : r.fallback()))
  await page.goto('character/')
  await importCharacter(page)
  await expectShown(page, TEXT)
  expect(fetches).toBe(2)
})

test('when the mod text stays unavailable, the page falls back to the raw id and stops retrying', async ({ page }) => {
  let fetches = 0
  await page.route(/mod-display\.json/, (r) => {
    fetches++
    return r.fulfill({ status: 500, body: 'x' })
  })
  await page.goto('character/')
  await importCharacter(page)
  await expectShown(page, RAW_ID)
  await page.waitForTimeout(3_500)
  expect(fetches).toBe(2)
})
