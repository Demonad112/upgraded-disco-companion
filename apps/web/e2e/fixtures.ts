import { test as base, expect, type Page } from '@playwright/test'
import { mainPayloadJson } from './main-payload'

/**
 * Every test runs offline: requests leaving the site under test are refused,
 * except the character proxy, which answers with the main build's payload (e2e/main-payload.ts). The site is localhost unless E2E_BASE_URL points the suite at a
 * deployment (the post-deploy smoke run), whose host is then let through.
 * Console errors and uncaught exceptions fail the test.
 */
// Playwright runs from apps/web (where its config lives).
const character = mainPayloadJson

const siteHost = process.env.E2E_BASE_URL ? new URL(process.env.E2E_BASE_URL).host : 'localhost'
const offsite = (url: URL) =>
  (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname !== 'localhost' && url.host !== siteHost

export const PROFILE_URL = 'https://poe.ninja/poe2/profile/Demonad112-2589/runesofaldur/character/Main'

/** The character page's tabs, by hash id, and their visible labels (see CharacterResults). */
export const CHARACTER_TABS = {
  overview: 'Overview',
  sheet: 'Sheet',
  defences: 'Defence',
  damage: 'Damage',
  gear: 'Gear',
  progress: 'Progress',
  advanced: 'Advanced',
} as const
export type CharacterTabId = keyof typeof CHARACTER_TABS

/**
 * Atlas: phones keep the guide list in a bottom sheet that the command bar's List button opens; from 721px up it is on
 * the page, so this does nothing there.
 */
export async function openList(page: Page) {
  if ((page.viewportSize()?.width ?? 1280) <= 720) await page.getByRole('button', { name: 'List', exact: true }).click()
}

/**
 * Opens a character tab (clicks it, so the hash and aria-selected move as a user's would) and waits for its panel.
 * Call it before asserting anything outside Overview.
 */
export async function openTab(page: Page, id: CharacterTabId) {
  const tab = page.getByRole('tab', { name: new RegExp(`^${CHARACTER_TABS[id]}\\b`) })
  if ((await tab.getAttribute('aria-selected')) !== 'true') await tab.click()
  await expect(page.locator(`#panel-${id}`)).toBeVisible({ timeout: 30_000 })
}

export const test = base.extend<{ errors: string[]; pobEngine: boolean }>({
  /**
   * The browser PoB engine (src/lib/pobEngineBrowser.ts) spends ~25 s and ~500 MB per pasted code. Specs that don't
   * test it get its files refused (the page then shows its one-line "unavailable" status); `test.use({ pobEngine: true })`
   * lets them through (e2e/pob-engine-browser.spec.ts).
   */
  pobEngine: [false, { option: true }],
  errors: [
    async ({ page, pobEngine }, use) => {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
      page.on('console', (m) => {
        // Refused external requests log as failed loads; those are the test's doing.
        if (m.type() === 'error' && !/Failed to load resource|net::ERR_FAILED/.test(m.text())) errors.push(m.text())
      })
      await page.route(offsite, async (route) => {
        const url = route.request().url()
        if (url.includes('/api/character')) {
          await route.fulfill({ status: 200, contentType: 'application/json', body: character })
        } else if (url.includes('/api/ladder')) {
          await route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"offline"}' })
        } else {
          await route.abort()
        }
      })
      if (!pobEngine) await page.route(/\/pob-calc\//, (route) => route.fulfill({ status: 404, body: '' }))
      // Headless Chromium renders with SwiftShader, which auto effects read as Still; pin Full so every spec sees the
      // full site. Only when nothing is stored, so a spec's own pick (and a reload after it) wins. See fx-tier.spec.
      await page.addInitScript(() => {
        try {
          if (!localStorage.getItem('poe2-fx-tier')) localStorage.setItem('poe2-fx-tier', JSON.stringify({ v: 1, choice: 'full', auto: 'full' }))
        } catch {}
      })
      await use(errors)
      expect(errors, 'console errors').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
