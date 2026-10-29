// Real-browser check of the service-worker update path against the local build.
// first load -> rebuild -> reload -> offline reload. Not part of CI: it rebuilds.
// Usage, from the repo root after `npm run build`: node scripts/sw-update-check.cjs
// Set SW_CHROMIUM to a Chromium binary where Playwright's own isn't installed (cloud: /opt/pw-browsers/...).
const { execSync, spawn } = require('node:child_process')
const { mkdtempSync } = require('node:fs')
const { join } = require('node:path')
const os = require('node:os')
const repo = process.argv[2] ?? join(__dirname, '..')
const { chromium } = require(join(repo, 'node_modules', '@playwright', 'test'))

const PORT = 4329
// *.localhost is a secure context in Chromium and loopback, but not 'localhost',
// so ServiceWorker.tsx registers the worker.
const URL_ = `http://sw.localhost:${PORT}/`
const env = { ...process.env }
delete env.CF_PAGES_COMMIT_SHA
delete env.GITHUB_SHA

function serve() {
  return spawn(process.execPath, ['apps/web/e2e/serve.mjs'], { cwd: repo, env: { ...env, E2E_PORT: String(PORT) }, stdio: 'ignore' })
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function state(page) {
  return page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration()
    const keys = await caches.keys()
    const sizes = {}
    for (const k of keys) sizes[k] = (await (await caches.open(k)).keys()).length
    return {
      controller: navigator.serviceWorker.controller?.scriptURL.replace(location.origin, '') ?? null,
      active: reg?.active?.scriptURL.replace(location.origin, '') ?? null,
      caches: sizes,
    }
  })
}

async function waitForBuild(page, notB) {
  for (let i = 0; i < 50; i++) {
    const s = await state(page)
    if (s.active && !s.active.includes(`b=${notB}`) && s.controller === s.active) return s
    await sleep(200)
  }
  return state(page)
}

;(async () => {
  let server = serve()
  await sleep(800)
  const ctx = await chromium.launchPersistentContext(mkdtempSync(join(os.tmpdir(), 'sw-a3-')), { headless: true, executablePath: process.env.SW_CHROMIUM || undefined })
  const page = await ctx.newPage()
  const failed = []
  page.on('requestfailed', (r) => failed.push(r.url().replace(URL_, '/')))
  page.on('pageerror', (e) => failed.push('pageerror: ' + e.message))

  // 1. First load.
  await page.goto(URL_)
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload() // now controlled; fills the shell cache with the page and its chunks
  await page.evaluate(() => fetch('/monster-stats.json').then((r) => r.text()))
  const s1 = await state(page)
  const b1 = /b=([^&]+)/.exec(s1.active)[1]
  console.log('1 first load   ', JSON.stringify(s1))

  // 2. Rebuild (new build id, same data).
  server.kill()
  execSync('npm run build', { cwd: repo, env, stdio: 'ignore' })
  server = serve()
  await sleep(800)

  // 3. Reload online.
  await page.reload()
  const s3 = await waitForBuild(page, b1)
  console.log('3 reload       ', JSON.stringify(s3))
  const html3 = await page.evaluate(() => [...document.scripts].map((s) => s.src).filter(Boolean).length)

  // 4. Offline reload: emulated offline, and the server gone as well.
  failed.length = 0
  await ctx.setOffline(true)
  server.kill()
  let ok = true
  try {
    await page.reload({ waitUntil: 'load' })
  } catch (e) {
    ok = false
    console.log('4 offline reload FAILED:', e.message.split('\n')[0])
  }
  const s4 = ok ? await state(page) : null
  const h1 = ok ? await page.locator('h1').first().textContent().catch(() => null) : null
  console.log('4 offline      ', JSON.stringify({ ok, h1, scripts: html3, failed: failed.slice(0, 10), failedCount: failed.length, s4 }))

  // 5. A second offline load of another route that was not visited.
  failed.length = 0
  try {
    await page.goto(URL_ + 'checklist/', { waitUntil: 'load' })
    console.log('5 offline /checklist/', JSON.stringify({ h1: await page.locator('h1').first().textContent(), failedCount: failed.length }))
  } catch (e) {
    console.log('5 offline /checklist/ FAILED:', e.message.split('\n')[0])
  }
  await ctx.close()
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
