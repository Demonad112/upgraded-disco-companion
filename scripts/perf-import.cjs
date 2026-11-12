const { chromium } = require('playwright'); const fs = require('fs')
const FX = { Yykiuy: ['yykiuy-v51.json', 'https://poe.ninja/poe2/profile/Demonad112-2589/forbiddenrites/character/Yykiuy'], Athrynas: ['athrynas-v43.json', 'https://poe.ninja/poe2/profile/Demonad112-2589/runesofaldur/character/Athrynas'] }
const MODE = process.env.MODE || 'plain'
const name = process.argv[2] || 'Yykiuy', runs = +(process.argv[3] || 3), PROXY_MS = +(process.argv[4] || 410)
const body = fs.readFileSync(require('path').join(__dirname, '..', 'packages', 'core', 'test', 'fixtures') + '/' + FX[name][0])
const init = () => {
  const P = (window.__p = { fetch: [], json: [], lt: [], cls: [], marks: {}, show: [], top: [] })
  const of = window.fetch
  window.fetch = async (...a) => { const u = String(a[0] && a[0].url ? a[0].url : a[0]); const s = performance.now(); const r = await of(...a); P.fetch.push({ u: u.replace(/^https?:\/\/[^/]+/, '').slice(0, 60), s, hdr: performance.now() }); return r }
  const oj = Response.prototype.json
  Response.prototype.json = async function () { const s = performance.now(); const v = await oj.call(this); P.json.push({ u: this.url.replace(/^https?:\/\/[^/]+/, '').slice(0, 60), s, e: performance.now() }); return v }
  new PerformanceObserver((l) => l.getEntries().forEach((e) => P.lt.push({ s: e.startTime, d: e.duration }))).observe({ type: 'longtask', buffered: true })
  new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) P.cls.push({ s: e.startTime, v: e.value }) })).observe({ type: 'layout-shift', buffered: true })
  const paint = (k) => requestAnimationFrame(() => requestAnimationFrame(() => { if (!P.marks[k]) { P.marks[k] = performance.now(); performance.mark('pp-' + k) } }))
  let ls = '', lt = ''
  const check = () => {
    const sc = document.querySelector('[data-showcase]'), tf = document.querySelector('[data-top-fixes]')
    if (sc) { if (!P.marks.showDom) { P.marks.showDom = performance.now(); paint('showPaint') } const t = sc.textContent.replace(/\s+/g, ' '); if (t !== ls) { ls = t; P.show.push({ t: performance.now(), g: (t.match(/Grade.{0,40}/i) || [''])[0] }) } }
    if (tf) { if (!P.marks.topDom) { P.marks.topDom = performance.now(); paint('topPaint') } const t = tf.textContent.replace(/\s+/g, ' '); if (t !== lt) { lt = t; P.top.push({ t: performance.now(), n: tf.querySelectorAll('li').length, len: t.length }) } }
  }
  document.addEventListener('DOMContentLoaded', () => new MutationObserver(check).observe(document.body, { subtree: true, childList: true, characterData: true }))
  addEventListener('click', (e) => { if (/Analyse/.test(e.target.textContent || '') && !P.marks.t0) { P.marks.t0 = performance.now(); performance.mark('pp-t0') } }, true)
}
;(async () => {
  const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}); const out = []
  for (let i = 0; i < runs; i++) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, serviceWorkers: 'block' })
    const page = await ctx.newPage(); await page.addInitScript(init)
    await page.route(/poe2-v3-ninja-proxy\.vercel\.app/, async (r) => { await new Promise((s) => setTimeout(s, PROXY_MS)); if (r.request().url().includes('/api/character')) await r.fulfill({ status: 200, contentType: 'application/json', body }); else await r.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"offline"}' }) })
    const c = await ctx.newCDPSession(page)
    await c.send('Network.enable'); await c.send('Network.emulateNetworkConditions', { offline: false, latency: 165, downloadThroughput: 1012500, uploadThroughput: 168750 })
    await c.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    await page.goto('http://localhost:4400/character/', { waitUntil: 'networkidle' })
    await page.getByLabel('poe.ninja character URL').fill(FX[name][1])
    if (MODE === 'prof') { await c.send('Profiler.enable'); await c.send('Profiler.setSamplingInterval', { interval: 500 }); await c.send('Profiler.start') }
    if (MODE === 'trace') await b.startTracing(page, { categories: ['devtools.timeline', 'blink.user_timing', '__metadata'] })
    await page.getByRole('button', { name: 'Analyse', exact: true }).click()
    await page.waitForSelector('[data-top-fixes]', { timeout: 60000 })
    await page.waitForLoadState('networkidle'); await page.waitForTimeout(4000)
    let profile = { nodes: [], samples: [], timeDeltas: [], startTime: 0 }, tr = null
    if (MODE === 'prof') profile = (await c.send('Profiler.stop')).profile
    if (MODE === 'trace') {
      const ev = JSON.parse((await b.stopTracing()).toString()).traceEvents
      const mk = (n) => (ev.find((e) => e.name === n && e.cat && e.cat.includes('user_timing')) || {})
      const a = mk('pp-t0'), z = mk('pp-topPaint'); const pid = a.pid, tid = a.tid
      const win = (lo, hi) => { const m = {}; for (const e of ev) { if (e.pid !== pid || e.tid !== tid || e.ph !== 'X' || e.ts < lo || e.ts > hi) continue; m[e.name] = (m[e.name] || 0) + e.dur / 1000 } return Object.fromEntries(Object.entries(m).filter(([, v]) => v > 8).sort((x, y) => y[1] - x[1]).slice(0, 22).map(([k, v]) => [k, Math.round(v)])) }
      const end = Math.max(...ev.filter((e) => e.pid === pid && e.tid === tid && e.ts).map((e) => e.ts))
      tr = { toTop: win(a.ts, z.ts), toTopMs: Math.round((z.ts - a.ts) / 1000), toSettle: win(a.ts, end) }
    }
    const P = await page.evaluate(() => ({ ...window.__p, nodes: document.querySelectorAll('*').length, h: document.documentElement.scrollHeight, res: performance.getEntriesByType('resource').filter((e) => /\.json|chunks/.test(e.name) && e.startTime > window.__p.marks.t0).map((e) => ({ u: e.name.replace(/^https?:\/\/[^/]+/, '').slice(-50), s: e.startTime, e: e.responseEnd, tx: e.transferSize, dec: e.decodedBodySize })) }))
    const t0 = P.marks.t0, rel = (x) => Math.round(x - t0)
    const self = {}; const byId = new Map(profile.nodes.map((n) => [n.id, n])); const t0us = profile.startTime
    let t = profile.startTime
    profile.samples.forEach((id, k) => { t += profile.timeDeltas[k]; const n = byId.get(id); const key = n.callFrame.url ? n.callFrame.url.replace(/^.*\//, '').slice(0, 40) : '(' + n.callFrame.functionName + ')'; self[key] = (self[key] || 0) + profile.timeDeltas[k] / 1000 })
    const o = {
      run: i, marks: Object.fromEntries(Object.entries(P.marks).map(([k, v]) => [k, rel(v)])),
      fetch: P.fetch.filter((f) => f.s >= t0).map((f) => ({ u: f.u, start: rel(f.s), hdr: rel(f.hdr) })),
      json: P.json.filter((f) => f.s >= t0).map((f) => ({ u: f.u, start: rel(f.s), end: rel(f.e) })),
      res: P.res.map((r) => ({ u: r.u, start: rel(r.s), end: rel(r.e), tx: r.tx, dec: r.dec })),
      longtasks: P.lt.filter((l) => l.s >= t0).map((l) => ({ at: rel(l.s), ms: Math.round(l.d) })),
      cls: P.cls.filter((l) => l.s >= t0).map((l) => ({ at: rel(l.s), v: +l.v.toFixed(4) })),
      show: P.show.map((s) => ({ at: rel(s.t), g: s.g })), top: P.top.map((s) => ({ at: rel(s.t), n: s.n, len: s.len })),
      nodes: P.nodes, h: P.h, trace: tr,
      cpu: Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => k + '=' + Math.round(v)),
    }
    out.push(o); await ctx.close()
  }
  fs.writeFileSync(`${process.env.PERF_OUT_DIR || "."}/imp-${name}-${MODE}.json`, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out[0], null, 0).replace(/\},\{/g, '},\n{'))
  console.log('SUMMARY', out.map((o) => JSON.stringify(o.marks) + ' tbt=' + o.longtasks.reduce((a, l) => a + Math.max(0, l.ms - 50), 0) + ' lastCLS=' + (o.cls.at(-1) || {}).at + ' clsSum=' + o.cls.reduce((a, l) => a + l.v, 0).toFixed(3)).join('\n'))
  await b.close()
})()
