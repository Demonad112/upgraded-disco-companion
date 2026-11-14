// Scroll audit harness (WQA3). Usage:
//   node scroll-audit.cjs <base> <profile:phone|desktop> <variant> <route> [mode] [outJson]
// variant: sky | dimoff | rm (reduced motion) | nosky (canvas+scrim hidden) | nograin | noshadow | bare (all fx off)
// mode: wheel | touch | toolbar (phone: viewport resize like a URL bar, then wheel)
const { chromium, devices } = require('playwright')
const fs = require('fs')
const path = require('path')

const [base, profile, variant, route, mode = 'wheel', out] = process.argv.slice(2)
const fixture = fs.readFileSync(path.resolve(__dirname, '../../../packages/core/test/fixtures/athrynas-v43.json'))
const PROFILE_URL = 'https://poe.ninja/poe2/profile/Demonad112-2589/runesofaldur/character/Athrynas'

const INIT = `
(() => {
  const w = window
  w.__fx = { frames: [], loaf: [], skyPaints: [], rec: false, layoutShifts: 0, scrollEv: 0, resizeEv: 0, resizeBeforeRec: 0 }
  addEventListener('scroll', () => { if (w.__fx.rec) { w.__fx.scrollEv++; w.__fx.lastScroll = performance.now() } }, { capture: true, passive: true })
  addEventListener('resize', () => { if (w.__fx.rec) w.__fx.resizeEv++; else w.__fx.resizeBeforeRec++ })
  const tick = (t) => { if (w.__fx.rec) w.__fx.frames.push(t); requestAnimationFrame(tick) }
  requestAnimationFrame(tick)
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (w.__fx.rec) w.__fx.loaf.push({
      start: e.startTime, dur: e.duration, block: e.blockingDuration, render: e.renderStart ? e.startTime + e.duration - e.renderStart : 0,
      style: e.styleAndLayoutStart ? e.startTime + e.duration - e.styleAndLayoutStart : 0,
      scripts: e.scripts.map((s) => ({ src: (s.sourceURL || '').split('/').pop(), fn: s.sourceFunctionName, inv: s.invoker, type: s.invokerType, dur: s.duration, fsl: s.forcedStyleAndLayoutDuration })) }) })
      .observe({ type: 'long-animation-frame', buffered: false })
  } catch {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) w.__fx.layoutShifts += e.value }).observe({ type: 'layout-shift', buffered: true }) } catch {}
  const cr = CanvasRenderingContext2D.prototype.clearRect
  CanvasRenderingContext2D.prototype.clearRect = function (...a) {
    if (w.__fx.rec) { const fx = this.canvas && this.canvas.dataset && this.canvas.dataset.fx; w.__fx.skyPaints.push(fx || 'other'); if (fx === 'sky' && performance.now() - (w.__fx.lastScroll || -1e9) < 100) w.__fx.skyInScroll = (w.__fx.skyInScroll || 0) + 1 }
    return cr.apply(this, a)
  }
})()`

const VARIANT_CSS = {
  nosky: '.sky-canvas,.sky-scrim{display:none!important}',
  noastro: '.astrolabe{display:none!important}',
  noskyastro: '.sky-canvas,.sky-scrim,.astrolabe{display:none!important}',
  nograin: 'body::after{display:none!important}',
  noshadow: '*{text-shadow:none!important;box-shadow:none!important}',
  bare: '.sky-canvas,.sky-scrim,body::after{display:none!important}*{text-shadow:none!important;box-shadow:none!important;mask-image:none!important}',
}

const pct = (a, p) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] }

;(async () => {
  const browser = await chromium.launch({ args: ['--enable-gpu-rasterization', '--ignore-gpu-blocklist'] })
  const ctxOpts = profile === 'phone' ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }
  if (variant === 'rm') ctxOpts.reducedMotion = 'reduce'
  const context = await browser.newContext(ctxOpts)
  await context.addInitScript(INIT)
  if (variant === 'dimoff') await context.addInitScript(`try{localStorage.setItem('poe2-sky-dim','false')}catch{}`)
  const isImport = route === '/character?import'
  await context.route((u) => /\/api\/(character|ladder)/.test(u.href), (r) => r.request().url().includes('/api/character')
    ? r.fulfill({ status: 200, contentType: 'application/json', body: fixture })
    : r.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"offline"}' }))
  const page = await context.newPage()
  const consoleMsgs = []
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) consoleMsgs.push(`${m.type()}: ${m.text().slice(0, 200)}`) })
  const cdp = await context.newCDPSession(page)
  await cdp.send('Log.enable')
  const violations = []
  cdp.on('Log.entryAdded', (e) => { if (e.entry.source === 'violation') violations.push(e.entry.text.slice(0, 160)) })
  await cdp.send('Log.startViolationsReport', { config: [{ name: 'blockedEvent', threshold: 0 }, { name: 'longTask', threshold: 50 }, { name: 'handler', threshold: 50 }, { name: 'recurringHandler', threshold: 16 }] })
  const url = base.replace(/\/$/, '') + (isImport ? '/character/' : route)
  await page.goto(url, { waitUntil: 'load', timeout: 60000 })
  if (VARIANT_CSS[variant]) await page.addStyleTag({ content: VARIANT_CSS[variant] })
  if (isImport) {
    const input = page.locator('input').first()
    await input.fill(PROFILE_URL)
    await input.press('Enter')
    await page.waitForSelector('[role=tab]', { timeout: 45000 }).catch(() => {})
  }
  await page.waitForTimeout(2500)
  if (profile === 'phone') await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  if (mode === 'toolbar') {
    // A phone URL bar collapsing: the viewport grows, then shrinks back (fires resize).
    const vp = page.viewportSize()
    await page.setViewportSize({ width: vp.width, height: vp.height + 56 })
    await page.waitForTimeout(400)
    await page.setViewportSize(vp)
    await page.waitForTimeout(400)
  }

  const docH = await page.evaluate(() => document.documentElement.scrollHeight)
  const vh = await page.evaluate(() => innerHeight)
  const dist = Math.min(docH - vh, 9000)
  const domNodes = await page.evaluate(() => document.getElementsByTagName('*').length)

  await cdp.send('Tracing.start', {
    traceConfig: { includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'disabled-by-default-devtools.timeline', 'blink.user_timing', 'loading', 'cc', 'viz'] },
    transferMode: 'ReturnAsStream',
  })
  await page.evaluate(() => { window.__fx.rec = true; window.__fx.t0 = performance.now() })
  const t0 = Date.now()
  if (mode === 'idle') { await page.waitForTimeout(5000) }
  else if (dist > 0) {
    if (mode === 'touch') {
      // Finger drags (CDP touch events): 400 px per drag at ~1250 px/s, released without fling.
      for (const dir of [1, -1]) {
        let moved = 0
        while (moved < dist) {
          const y0 = dir > 0 ? 620 : 200
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 180, y: y0 }] })
          for (let i = 1; i <= 20; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 180, y: y0 - dir * i * 20 }] }); await page.waitForTimeout(16) }
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
          moved += 400
          await page.waitForTimeout(30)
        }
        await page.waitForTimeout(300)
      }
    } else {
      await page.mouse.move(profile === 'phone' ? 180 : 720, 400)
      const step = 100
      for (const dir of [1, -1]) {
        for (let y = 0; y < dist; y += step) { await page.mouse.wheel(0, dir * step); await page.waitForTimeout(40) }
        await page.waitForTimeout(300)
      }
    }
  }
  await page.waitForTimeout(300)
  const fx = await page.evaluate(() => { window.__fx.rec = false; return window.__fx })
  const elapsed = Date.now() - t0
  const chunks = []
  const done = new Promise((res) => cdp.once('Tracing.tracingComplete', res))
  await cdp.send('Tracing.end')
  const { stream } = await done
  for (;;) { const r = await cdp.send('IO.read', { handle: stream }); chunks.push(r.base64Encoded ? Buffer.from(r.data, 'base64').toString() : r.data); if (r.eof) break }
  await cdp.send('IO.close', { handle: stream })
  const trace = JSON.parse(chunks.join(''))
  const evs = trace.traceEvents || trace

  // Renderer main thread of the page.
  const mainTid = (() => { const m = evs.find((e) => e.name === 'thread_name' && e.args?.name === 'CrRendererMain'); return m ? [m.pid, m.tid] : null })()
  const sums = {}
  const watch = ['Layout', 'UpdateLayoutTree', 'RecalculateStyles', 'Paint', 'PrePaint', 'Layerize', 'UpdateLayer', 'CompositeLayers', 'Commit', 'FireAnimationFrame', 'FunctionCall', 'EventDispatch', 'IntersectionObserverController::computeIntersections', 'ResizeObserverController::DeliverObservations', 'ParseHTML', 'EvaluateScript', 'v8.compile', 'GPUTask', 'RasterTask', 'ScrollLayer', 'HitTest', 'TimerFire']
  let rasterMs = 0
  for (const e of evs) {
    if (e.ph !== 'X' || !e.dur) continue
    if (e.name === 'RasterTask') { rasterMs += e.dur / 1000; continue }
    if (!mainTid || e.pid !== mainTid[0] || e.tid !== mainTid[1]) continue
    if (watch.includes(e.name)) sums[e.name] = (sums[e.name] || 0) + e.dur / 1000
  }
  const states = {}; for (const e of evs) if (e.name === 'PipelineReporter' && e.ph === 'b' && e.args?.chrome_frame_reporter) { const k = e.args.chrome_frame_reporter.state; states[k] = (states[k] || 0) + 1 }
  const dropped = evs.filter((e) => e.name === 'DroppedFrame' || (e.name === 'PipelineReporter' && e.args?.chrome_frame_reporter?.state === 'STATE_DROPPED')).length
  const presented = evs.filter((e) => e.name === 'PipelineReporter' && e.args?.chrome_frame_reporter?.state === 'STATE_PRESENTED_ALL').length
  const partial = evs.filter((e) => e.name === 'PipelineReporter' && e.args?.chrome_frame_reporter?.state === 'STATE_PRESENTED_PARTIAL').length

  let layers = null
  try {
    await cdp.send('LayerTree.enable')
    const lt = await new Promise((res) => { cdp.once('LayerTree.layerTreeDidChange', res); page.evaluate(() => window.scrollBy(0, 1)) })
    const L = lt.layers || []
    const draws = L.filter((l) => l.drawsContent)
    layers = { count: L.length, drawing: draws.length, areaMpx: +(draws.reduce((a, l) => a + l.width * l.height, 0) / 1e6).toFixed(2), biggest: draws.sort((a, b) => b.width * b.height - a.width * a.height).slice(0, 5).map((l) => `${l.width}x${l.height}${l.backendNodeId ? '#' + l.backendNodeId : ''}`) }
  } catch (e) { layers = { error: String(e).slice(0, 80) } }

  const deltas = []
  for (let i = 1; i < fx.frames.length; i++) deltas.push(fx.frames[i] - fx.frames[i - 1])
  const worst = fx.loaf.sort((a, b) => b.dur - a.dur)[0]
  const worstSrc = worst ? (worst.scripts.sort((a, b) => b.dur - a.dur)[0] || null) : null
  const skyPaints = fx.skyPaints.filter((s) => s === 'sky').length
  const endY = await page.evaluate(() => scrollY)
  const res = { endY,
    base, profile, variant, route, mode, docH, dist, domNodes, elapsedMs: elapsed,
    frames: deltas.length, p50: +pct(deltas, 50).toFixed(1), p95: +pct(deltas, 95).toFixed(1), p99: +pct(deltas, 99).toFixed(1),
    jankPct: +((deltas.filter((d) => d > 16.7 * 1.5).length / Math.max(1, deltas.length)) * 100).toFixed(1),
    over16: +((deltas.filter((d) => d > 17.5).length / Math.max(1, deltas.length)) * 100).toFixed(1),
    effFps: +(deltas.length / (deltas.reduce((a, b) => a + b, 0) / 1000 || 1)).toFixed(1),
    loafCount: fx.loaf.length, worstLoaf: worst ? { dur: +worst.dur.toFixed(0), block: +worst.block.toFixed(0), style: +worst.style.toFixed(0), render: +worst.render.toFixed(0), src: worstSrc } : null,
    skyPaintsDuringScroll: skyPaints, scrollEv: fx.scrollEv, skyPaintsWhileScrolling: fx.skyInScroll || 0, resizeEv: fx.resizeEv, resizeBeforeRec: fx.resizeBeforeRec, otherCanvasClears: fx.skyPaints.length - skyPaints,
    mainMs: Object.fromEntries(Object.entries(sums).map(([k, v]) => [k, +v.toFixed(1)])), rasterMs: +rasterMs.toFixed(1),
    pipeline: { presented, partial, dropped, states },
    layers, cls: +fx.layoutShifts.toFixed(4), violations: [...new Set(violations)].slice(0, 6), console: [...new Set(consoleMsgs)].slice(0, 6),
  }
  const line = JSON.stringify(res)
  if (out) fs.appendFileSync(out, line + '\n')
  console.log(line)
  await browser.close()
})().catch((e) => { console.error('FAIL', base, profile, variant, route, mode, String(e).slice(0, 300)); process.exit(1) })
