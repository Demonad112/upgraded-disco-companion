import { PROFILE_URL, expect, test } from './fixtures'

// PX11b: import-to-card timing. Mobile profile (4x CPU, ~1.6 Mbps / 165 ms) through CDP, as PERF-PLAN's harness.
// Measured in this suite (Pixel 7 emulation, fixture proxy, workers=1): the character heading is visible 2.8-2.9 s
// after navigation (3 runs). The limit is that plus 30 % for CI noise, so only a real regression fails. This is
// not the harness's card-paint time (0.8-1.1 s from scripts/perf-import.cjs, which uses a different clock).
const LIMIT_MS = 3_700

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
