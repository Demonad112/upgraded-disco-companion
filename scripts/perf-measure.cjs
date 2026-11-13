// PERF-PLAN items 4-8. Usage: node scripts/perf-serve.cjs & ; MODE=<vitals|canvas|dom|fonts|sw> node scripts/perf-measure.cjs
// Same profile as perf-import.cjs: 390x844 mobile, 4x CPU, ~1.6 Mbps / 165 ms. Prints JSON.
const { chromium } = require('playwright')
const MODE = process.env.MODE || 'vitals', BASE = process.env.BASE || 'http://localhost:4400'
const ROUTES = ['/', '/character', '/dashboard', '/atlas', '/checklist', '/trade', '/methodology', '/whats-new']
const profile = async (ctx, page, cpu = 4) => {
  const c = await ctx.newCDPSession(page)
  await c.send('Network.enable')
  await c.send('Network.emulateNetworkConditions', { offline: false, latency: 165, downloadThroughput: 1012500, uploadThroughput: 168750 })
  await c.send('Emulation.setCPUThrottlingRate', { rate: cpu })
  return c
}
const mobile = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
const vitalsInit = () => {
  const P = (window.__v = { lcp: null, cls: 0, lt: [], ev: [] })
  new PerformanceObserver((l) => l.getEntries().forEach((e) => (P.lcp = { t: Math.round(e.startTime), el: (e.element && (e.element.tagName + '.' + String(e.element.className).slice(0, 40))) || null }))).observe({ type: 'largest-contentful-paint', buffered: true })
  new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) P.cls += e.value })).observe({ type: 'layout-shift', buffered: true })
  new PerformanceObserver((l) => l.getEntries().forEach((e) => P.lt.push({ s: Math.round(e.startTime), d: Math.round(e.duration) }))).observe({ type: 'longtask', buffered: true })
  new PerformanceObserver((l) => l.getEntries().forEach((e) => P.ev.push({ n: e.name, d: e.duration }))).observe({ type: 'event', durationThreshold: 16, buffered: true })
}
;(async () => {
  const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {})
  const out = {}
  if (MODE === 'vitals') { // item 4
    for (const r of ROUTES) {
      const ctx = await b.newContext({ ...mobile, serviceWorkers: 'block' }), page = await ctx.newPage()
      await page.addInitScript(vitalsInit); await profile(ctx, page)
      await page.goto(BASE + r + (r === '/' ? '' : '/'), { waitUntil: 'networkidle' }); await page.waitForTimeout(2500)
      const inter = {}
      for (const [k, sel] of [['tab', '[role=tab] >> nth=1'], ['accordion', 'summary >> nth=0'], ['tick', 'input[type=checkbox] >> nth=0']]) {
        const el = page.locator(sel); if (!(await el.count())) { inter[k] = null; continue }
        try { await el.click({ timeout: 3000 }); await page.waitForTimeout(400); inter[k] = 'clicked' } catch { inter[k] = 'not clickable' }
      }
      const v = await page.evaluate(() => { const P = window.__v; return { lcp: P.lcp, cls: +P.cls.toFixed(4), tbtMs: Math.round(P.lt.reduce((n, t) => n + Math.max(0, t.d - 50), 0)), longTasks: P.lt.length, maxLongTask: Math.max(0, ...P.lt.map((t) => t.d)), slowEvents: P.ev.filter((e) => e.d >= 16).map((e) => ({ n: e.n, d: Math.round(e.d) })).slice(0, 8) } })
      out[r] = { ...v, inter }; await ctx.close()
    }
  }
  if (MODE === 'canvas') { // item 5
    const cases = { idle: {}, 'reduced-motion': { reducedMotion: 'reduce' } }
    for (const [name, opt] of Object.entries(cases)) {
      for (const vp of [{ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 }, { width: 1280, height: 800, deviceScaleFactor: 1 }]) {
        const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, serviceWorkers: 'block', ...opt }), page = await ctx.newPage()
        await page.addInitScript(() => { window.__raf = 0; const o = window.requestAnimationFrame; window.requestAnimationFrame = (f) => { window.__raf++; return o(f) } })
        await page.goto(BASE + '/', { waitUntil: 'networkidle' }); await page.waitForTimeout(1000)
        const c = await ctx.newCDPSession(page)
        const sizes = await page.evaluate(() => [...document.querySelectorAll('canvas')].map((e) => ({ cls: String(e.className).slice(0, 30), w: e.width, h: e.height, css: [Math.round(e.getBoundingClientRect().width), Math.round(e.getBoundingClientRect().height)], px: e.width * e.height })))
        const run = async (label, act) => {
          await c.send('Profiler.enable'); await c.send('Profiler.setSamplingInterval', { interval: 500 }); await c.send('Profiler.start')
          const r0 = await page.evaluate(() => window.__raf); const t0 = Date.now(); await act(); const ms = Date.now() - t0
          const r1 = await page.evaluate(() => window.__raf); const p = (await c.send('Profiler.stop')).profile
          const idle = p.nodes.find((n) => n.callFrame.functionName === '(idle)'), self = {}; p.samples.forEach((s, i) => (self[s] = (self[s] || 0) + p.timeDeltas[i]))
          const total = Object.values(self).reduce((a, v) => a + v, 0), idleUs = idle ? self[idle.id] || 0 : 0
          return { label, rafPerSec: +(((r1 - r0) / ms) * 1000).toFixed(1), busyPct: +(((total - idleUs) / total) * 100).toFixed(1) }
        }
        const rs = [await run('idle 5s', () => page.waitForTimeout(5000)), await run('scrolling 5s', async () => { for (let i = 0; i < 25; i++) { await page.mouse.wheel(0, 200); await page.waitForTimeout(100) } await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(2000) })]
        await page.evaluate(() => Object.defineProperty(document, 'hidden', { value: true, configurable: true })); await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
        rs.push(await run('hidden 3s', () => page.waitForTimeout(3000)))
        out[`${name} ${vp.width}px`] = { sizes, runs: rs }; await ctx.close()
      }
    }
  }
  if (MODE === 'dom') { // item 6 (character needs an import: run perf-import.cjs first; this measures static routes + /checklist)
    for (const r of ['/checklist', '/dashboard', '/atlas', '/']) {
      const ctx = await b.newContext({ ...mobile, serviceWorkers: 'block' }), page = await ctx.newPage()
      await page.goto(BASE + r + (r === '/' ? '' : '/'), { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
      const m = await page.evaluate(() => { const all = [...document.body.querySelectorAll('*')], h = innerHeight; const below = all.filter((e) => e.getBoundingClientRect().top + scrollY > h).length; return { nodes: all.length, belowFold: below, belowPct: +((below / all.length) * 100).toFixed(1), docHeight: document.documentElement.scrollHeight, backdropFilter: all.filter((e) => { const s = getComputedStyle(e); return (s.backdropFilter || s.webkitBackdropFilter || 'none') !== 'none' }).length } })
      const c = await profile(ctx, page, 4); await b.startTracing(page, { categories: ['devtools.timeline'] }); await page.reload({ waitUntil: 'networkidle' })
      const ev = JSON.parse((await b.stopTracing()).toString()).traceEvents, sum = (n) => Math.round(ev.filter((e) => e.name === n && e.ph === 'X').reduce((a, e) => a + e.dur / 1000, 0))
      out[r] = { ...m, styleMs: sum('UpdateLayoutTree'), layoutMs: sum('Layout'), paintMs: sum('Paint') }; await ctx.close()
    }
  }
  if (MODE === 'fonts') { // item 7
    for (const r of ROUTES) {
      const ctx = await b.newContext({ ...mobile, serviceWorkers: 'block' }), page = await ctx.newPage(); const c = await ctx.newCDPSession(page)
      await c.send('DOM.enable'); await c.send('CSS.enable'); await c.send('CSS.startRuleUsageTracking')
      await page.goto(BASE + r + (r === '/' ? '' : '/'), { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
      const { ruleUsage } = await c.send('CSS.stopRuleUsageTracking'); const used = ruleUsage.filter((x) => x.used).length
      const f = await page.evaluate(async () => { await document.fonts.ready; return { preloaded: [...document.querySelectorAll('link[rel=preload][as=font]')].map((l) => l.href.split('/').pop()), loaded: [...document.fonts].filter((x) => x.status === 'loaded').map((x) => x.family + ' ' + x.weight) } })
      out[r] = { rules: ruleUsage.length, unusedPct: +(((ruleUsage.length - used) / ruleUsage.length) * 100).toFixed(1), ...f }; await ctx.close()
    }
  }
  if (MODE === 'sw') { // item 8
    const ctx = await b.newContext({ ...mobile }), page = await ctx.newPage()
    await page.goto(BASE + '/', { waitUntil: 'networkidle' }); await page.waitForTimeout(4000)
    await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(2000)
    out.caches = await page.evaluate(async () => { const o = {}; for (const k of await caches.keys()) { const c = await caches.open(k); o[k] = (await c.keys()).length } return o })
    out.controller = await page.evaluate(() => !!navigator.serviceWorker.controller)
    const res = await page.evaluate(() => performance.getEntriesByType('resource').map((e) => ({ n: e.name.split('/').slice(-1)[0].slice(0, 40), t: e.transferSize })))
    out.secondVisit = { requests: res.length, fromNetworkBytes: res.reduce((a, r) => a + r.t, 0), zeroTransfer: res.filter((r) => r.t === 0).length }
    await ctx.close()
  }
  console.log(JSON.stringify(out, null, 1)); await b.close()
})()
