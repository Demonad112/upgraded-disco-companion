// WQA3-9 scroll guard: functional checks on the constellation sky, no timing. A CI step (ci.yml "Scroll guard"); by hand:
//   npm run build && node scripts/perf-serve.cjs &   then   node scripts/scroll-audit.cjs [baseUrl]
// Default base is the perf server (http://localhost:4400/); pass a Pages preview URL to check a deploy.
// Per profile (phone, desktop): the sky doesn't paint while the page scrolls, before and after a resize (WQA3-1);
// it paints again once scrolling stops; and under reduced motion it stays still. Exits 1 on any failure.
const { chromium } = require('playwright')
const { existsSync } = require('fs')

// Cloud sessions ship their own Chromium (see apps/web/playwright.config.ts); elsewhere Playwright finds its own.
const remote = '/opt/pw-browsers/chromium'
const launch = () => chromium.launch(process.env.CLAUDE_CODE_REMOTE === 'true' && existsSync(remote) ? { executablePath: remote } : {})

const base = process.argv[2] || 'http://localhost:4400/'
const profiles = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, resizeTo: { width: 844, height: 390 } },
  desktop: { viewport: { width: 1440, height: 900 }, resizeTo: { width: 1280, height: 800 } },
}

// Count 2D draw calls on the sky canvas; any call in a window means the sky painted.
const counter = () => {
  window.__skyPaints = 0
  const P = CanvasRenderingContext2D.prototype
  for (const m of ['clearRect', 'fillRect', 'drawImage', 'fill', 'stroke', 'fillText']) {
    const orig = P[m]
    P[m] = function (...a) {
      if (this.canvas && this.canvas.dataset && this.canvas.dataset.fx === 'sky') window.__skyPaints++
      return orig.apply(this, a)
    }
  }
}

const paintsDuring = (page, ms, scroll) =>
  page.evaluate(
    async ({ ms, scroll }) => {
      const start = window.__skyPaints
      const end = performance.now() + ms
      let dir = 1
      while (performance.now() < end) {
        if (scroll) {
          if (window.scrollY + innerHeight >= document.documentElement.scrollHeight - 2) dir = -1
          if (window.scrollY <= 0) dir = 1
          window.scrollBy(0, 40 * dir)
        }
        await new Promise((r) => setTimeout(r, 40))
      }
      return window.__skyPaints - start
    },
    { ms, scroll },
  )

async function run(name, p, reduced) {
  const browser = await launch()
  const ctx = await browser.newContext({ viewport: p.viewport, isMobile: p.isMobile, hasTouch: p.hasTouch, reducedMotion: reduced ? 'reduce' : 'no-preference' })
  await ctx.addInitScript(counter)
  // B7-1: the checks are about scrolling, not the effects tier. Pin Full, as the e2e fixture does: on CI and in cloud
  // sessions the renderer is software (Auto picks still), and under 480 px Auto starts still (HG1-5), so an unpinned
  // run paints nothing when idle and fails "animates when idle" for a reason the check is not about.
  await ctx.addInitScript(() => localStorage.setItem('poe2-fx-tier', JSON.stringify({ v: 1, choice: 'full', auto: 'full' })))
  const page = await ctx.newPage()
  await page.goto(base)
  await page.waitForFunction(() => {
    const c = document.querySelector('canvas[data-fx="sky"]')
    return c && c.width !== 300
  })
  await page.waitForTimeout(1000)
  const out = []
  const check = (label, ok, value) => out.push({ profile: name, reduced, label, value, ok })
  if (reduced) {
    const held = await paintsDuring(page, 1500, false)
    check('still sky (paints in 1.5 s idle)', held === 0, held)
  } else {
    const idle = await paintsDuring(page, 800, false)
    check('animates when idle (paints in 0.8 s)', idle > 0, idle)
    await paintsDuring(page, 200, true) // the first scroll event can land after a frame already started
    const scrolling = await paintsDuring(page, 1200, true)
    check('paused while scrolling (paints)', scrolling === 0, scrolling)
    await page.setViewportSize(p.resizeTo)
    await page.waitForTimeout(600)
    await paintsDuring(page, 200, true)
    const after = await paintsDuring(page, 1200, true)
    check('paused while scrolling after a resize (paints)', after === 0, after)
    await page.waitForTimeout(300)
    const resumed = await paintsDuring(page, 800, false)
    check('resumes after scrolling stops (paints in 0.8 s)', resumed > 0, resumed)
  }
  await browser.close()
  return out
}

;(async () => {
  const rows = []
  for (const [name, p] of Object.entries(profiles)) for (const reduced of [false, true]) rows.push(...(await run(name, p, reduced)))
  for (const r of rows) console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.profile}${r.reduced ? ' (reduced motion)' : ''}: ${r.label} = ${r.value}`)
  process.exit(rows.every((r) => r.ok) ? 0 : 1)
})()
