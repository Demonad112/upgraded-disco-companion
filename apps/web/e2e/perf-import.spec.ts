import { PROFILE_URL, expect, test } from './fixtures'

// PX11b: import-to-card timing. Mobile profile (4x CPU, ~1.6 Mbps / 165 ms) through CDP, as the PX11 harness (docs/HISTORY.md).
// Local (Pixel 7 emulation, fixture proxy, workers=1): the character heading is visible 2.8-3.0 s after navigation.
// CI runners are slower under the same 4x CPU throttle: 3,748 and 3,810 ms on an unchanged app (#196). The limit is
// the CI worst plus ~18 % for runner noise (owner OK, 2026-11-16), so only a real regression fails. This is not the
// harness's card-paint time (0.8-1.1 s from scripts/perf-import.cjs, which uses a different clock).
const LIMIT_MS = 4_500

test('import to build card stays under the budget on a throttled phone', async ({ page, browserName }, info) => {
  test.skip(browserName !== 'chromium' || info.project.name !== 'mobile', 'CDP throttling is Chromium; one project is enough')
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 165, downloadThroughput: 1_013_700, uploadThroughput: 168_750 })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })

  await page.goto(`character/?import=${encodeURIComponent(PROFILE_URL)}`)
  await page.getByRole('heading', { name: /Athrynas/ }).first().waitFor({ timeout: 30_000 })
  const ms = await page.evaluate(() => Math.round(performance.now()))
  info.annotations.push({ type: 'import-to-card', description: `${ms} ms` })
  expect(ms, `import to card ${ms} ms`).toBeLessThan(LIMIT_MS)
})
