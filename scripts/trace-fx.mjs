// P4 raster attribution: where does the compositor spend its time while the site sits idle, switches Character tabs
// and re-imports? Run by hand after `npm run build` (not a CI gate):
//   node scripts/trace-fx.mjs [--out apps/web/out] [--tier full|lite|still|auto] [--runs 1] [--json file]
// It serves the static export itself, imports the e2e character fixture through a mocked proxy, and runs the script
// twice: GPU as the browser finds it, and `--disable-gpu` (software compositing, like the owner's low-end laptop).
// Steps per run, traced with CDP Tracing (cc, viz, devtools.timeline, cc.debug, toplevel) plus LayerTree:
//   10 s idle on /character/ (results showing), 4 tab switches, 1 re-import.
// Reports: busy % per compositor thread per step (Raster = RasterTask time over all workers), raster ms per layer with the owning element, and commits per tab
// switch (cc commits on the main thread, and React commits through a minimal DevTools hook).
import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'

const args = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : fallback
}
const root = opt('out', 'apps/web/out')
const tier = opt('tier', 'full')
const runs = Number(opt('runs', '1'))
const jsonOut = opt('json', '')
if (!existsSync(join(root, 'index.html'))) {
  console.error(`No build at ${root}; run npm run build first.`)
  process.exit(1)
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json' }
const server = createServer((req, res) => {
  let f = normalize(join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)))
  if (!existsSync(f)) f = f.replace(/(__next\.[^/\\]+?)\.(__PAGE__\.txt)$/, '$1/$2')
  try {
    if (statSync(f).isDirectory()) f = join(f, 'index.html')
    res.writeHead(200, { 'content-type': TYPES[extname(f)] ?? 'application/octet-stream', 'cache-control': 'no-store' })
    res.end(readFileSync(f))
  } catch {
    res.writeHead(404)
    res.end()
  }
})
await new Promise((r) => server.listen(0, r))
const base = `http://localhost:${server.address().port}/`

const fixture = readFileSync('packages/core/test/fixtures/athrynas-v43.json')
const PROFILE = 'https://poe.ninja/poe2/profile/Demonad112-2589/runesofaldur/character/Athrynas'
const TABS = ['Defence', 'Damage', 'Gear', 'Overview']
const CATEGORIES = ['cc', 'viz', 'toplevel', 'devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-cc.debug']

const remote = '/opt/pw-browsers/chromium'
const executablePath = process.env.CLAUDE_CODE_REMOTE === 'true' && existsSync(remote) ? remote : undefined

/** Counts React commits; React (also in production) reports each one to a DevTools hook if one is present. */
function reactHook() {
  window.__commits = 0
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber: true,
    renderers: new Map(),
    inject: () => 1,
    checkDCE() {},
    onScheduleFiberRoot() {},
    onCommitFiberRoot() {
      window.__commits++
    },
    onCommitFiberUnmount() {},
    onPostCommitFiberRoot() {},
    setStrictMode() {},
  }
}

async function trace(gpu) {
  const browser = await chromium.launch({ executablePath, args: gpu ? [] : ['--disable-gpu', '--disable-gpu-compositing'] })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await ctx.addInitScript(reactHook)
  if (tier !== 'auto') {
    await ctx.addInitScript((t) => localStorage.setItem('poe2-fx-tier', JSON.stringify({ v: 1, choice: t, auto: t })), tier)
  }
  await ctx.route(/^https?:\/\/(?!localhost)/, (route) => {
    const url = route.request().url()
    if (url.includes('/api/character')) return route.fulfill({ status: 200, contentType: 'application/json', body: fixture })
    if (url.includes('/api/ladder')) return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' })
    return route.abort()
  })
  const page = await ctx.newPage()
  const cdp = await ctx.newCDPSession(page)
  const importUrl = `${base}character/?import=${encodeURIComponent(PROFILE)}`
  await page.goto(importUrl)
  await page.getByRole('tab', { name: /^Overview\b/ }).waitFor({ timeout: 60_000 })
  await page.waitForTimeout(1500)
  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl')
    const info = gl?.getExtension('WEBGL_debug_renderer_info')
    return gl ? String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER)) : 'no WebGL'
  })

  await cdp.send('DOM.enable')
  await cdp.send('DOM.getDocument', { depth: -1 })
  await cdp.send('LayerTree.enable')
  // Owning element per layer, described as soon as the layer appears (a re-import replaces the nodes).
  const owners = new Map()
  const pending = []
  const describe = async (layerId, backendNodeId) => {
    try {
      const { node } = await cdp.send('DOM.describeNode', { backendNodeId })
      const attrs = Object.fromEntries((node.attributes ?? []).reduce((a, v, i, all) => (i % 2 ? a : [...a, [v, all[i + 1]]]), []))
      const cls = (attrs.class ?? '').split(/\s+/).filter(Boolean).slice(0, 2).map((c) => `.${c}`).join('')
      const extra = ['data-fx', 'data-surface', 'role', 'aria-labelledby'].filter((k) => attrs[k]).map((k) => `[${k}=${attrs[k]}]`).join('')
      owners.set(layerId, `${node.localName || node.nodeName}${attrs.id ? `#${attrs.id}` : ''}${cls}${extra}`)
    } catch {}
  }
  cdp.on('LayerTree.layerTreeDidChange', ({ layers }) => {
    for (const l of layers ?? []) {
      const id = String(l.layerId)
      if (l.backendNodeId && !owners.has(id)) {
        owners.set(id, '(resolving)')
        pending.push(describe(id, l.backendNodeId))
      }
    }
  })
  const events = []
  cdp.on('Tracing.dataCollected', ({ value }) => events.push(...value))
  const done = new Promise((r) => cdp.once('Tracing.tracingComplete', r))
  await cdp.send('Tracing.start', { traceConfig: { includedCategories: CATEGORIES }, transferMode: 'ReportEvents' })

  // Step marks go into the trace itself (TimeStamp events), so they share its clock.
  const mark = (name) => page.evaluate((n) => console.timeStamp(`trace-fx:${n}`), name)
  const commits = () => page.evaluate(() => window.__commits)

  await mark('idle')
  await page.waitForTimeout(10_000)
  const reactPerSwitch = []
  for (const name of TABS) {
    await mark(`tab ${name}`)
    const before = await commits()
    await page.getByRole('tab', { name: new RegExp(`^${name}\\b`) }).click()
    await page.waitForTimeout(1200)
    reactPerSwitch.push((await commits()) - before)
  }
  await mark('re-import')
  await page.goto(importUrl)
  await page.getByRole('tab', { name: /^Overview\b/ }).waitFor({ timeout: 60_000 })
  await page.waitForTimeout(2000)
  await mark('end')

  await Promise.all(pending)
  await cdp.send('Tracing.end')
  await done
  await browser.close()
  return { gpu, renderer, events, owners, reactPerSwitch }
}

/** Collects the cc layer debug names from cc.debug snapshots (layer_id -> name), as DevTools' Layers panel does. */
function layerNames(events) {
  const names = new Map()
  const walk = (o, depth) => {
    if (!o || typeof o !== 'object' || depth > 12) return
    const id = o.layer_id ?? o.id
    const name = o.layer_name ?? o.debug_name
    if (id != null && typeof name === 'string') names.set(String(id), name)
    for (const v of Object.values(o)) walk(v, depth + 1)
  }
  for (const e of events) if (e.ph === 'O' && e.args?.snapshot) walk(e.args.snapshot, 0)
  return names
}

function report({ gpu, renderer, events, owners, reactPerSwitch }) {
  const marks = events
    .filter((e) => e.name === 'TimeStamp' && String(e.args?.data?.message ?? '').startsWith('trace-fx:'))
    .map((e) => ({ name: e.args.data.message.slice(9), ts: e.ts }))
    .sort((a, b) => a.ts - b.ts)
  const threads = new Map()
  if (args.includes('--names')) {
    const e = events.find((x) => /TimeStamp|RasterTask/.test(x.name) && x.args)
    if (e) console.log(JSON.stringify(e).slice(0, 600))
    const r = events.find((x) => x.name === 'RasterTask')
    if (r) console.log(JSON.stringify(r).slice(0, 600))
  }
  for (const e of events) if (e.ph === 'M' && e.name === 'thread_name') threads.set(`${e.pid}:${e.tid}`, e.args.name)
  const threadOf = (e) => threads.get(`${e.pid}:${e.tid}`) ?? '?'
  // Durations: complete events, and B/E pairs per thread.
  const spans = []
  const open = new Map()
  for (const e of events) {
    if (e.ph === 'X') spans.push({ ...e, end: e.ts + (e.dur ?? 0) })
    else if (e.ph === 'B') open.set(`${e.pid}:${e.tid}:${e.name}`, e)
    else if (e.ph === 'E') {
      const b = open.get(`${e.pid}:${e.tid}:${e.name}`)
      if (b) spans.push({ ...b, end: e.ts, dur: e.ts - b.ts })
    }
  }
  const step = (ts) => {
    let s = null
    for (const m of marks) if (ts >= m.ts) s = m.name
    return s === 'end' ? null : s
  }
  const steps = marks.slice(0, -1).map((m, i) => ({ name: m.name, ms: (marks[i + 1].ts - m.ts) / 1000 }))

  if (args.includes('--names')) {
    const count = new Map()
    for (const e of events) {
      const k = `${threadOf(e)} | ${e.cat} | ${e.name} | ${e.ph}`
      count.set(k, (count.get(k) ?? 0) + 1)
    }
    const only = new RegExp(opt('names', '.'), 'i')
    console.log([...count].filter(([k]) => only.test(k)).sort((a, b) => b[1] - a[1]).slice(0, 60).map(([k, n]) => `${n} ${k}`).join('\n'))
  }
  // Busy %: top-level tasks per thread kind, per step.
  const kinds = { Compositor: /^Compositor$/, Viz: /VizCompositor/, Main: /CrRendererMain/, GPU: /CrGpuMain/ }
  const busy = {}
  for (const s of spans) {
    if (!/RunTask|ThreadControllerImpl::RunTask/.test(s.name) || !s.cat?.includes('toplevel')) continue
    const name = threadOf(s)
    const kind = Object.keys(kinds).find((k) => kinds[k].test(name))
    const st = step(s.ts)
    if (!kind || !st) continue
    busy[st] ??= {}
    busy[st][kind] = (busy[st][kind] ?? 0) + s.dur / 1000
  }
  // Raster: RasterTask time summed over every worker thread, so it can pass 100 %.
  for (const s of spans) {
    const st = s.name === 'RasterTask' && step(s.ts)
    if (!st) continue
    busy[st] ??= {}
    busy[st].Raster = (busy[st].Raster ?? 0) + s.dur / 1000
  }
  const busyRows = steps.map(({ name, ms }) => ({
    step: name,
    ms: Math.round(ms),
    ...Object.fromEntries([...Object.keys(kinds), 'Raster'].map((k) => [k, `${(((busy[name]?.[k] ?? 0) / ms) * 100).toFixed(1)}%`])),
  }))

  // Raster ms per layer.
  const names = layerNames(events)
  const raster = new Map()
  for (const s of spans) {
    if (s.name !== 'RasterTask' || !step(s.ts)) continue
    const id = String(s.args?.tileData?.layerId ?? '?')
    raster.set(id, (raster.get(id) ?? 0) + s.dur / 1000)
  }
  const rasterRows = [...raster]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([id, ms]) => ({ layer: id, ms: Math.round(ms), owner: owners.get(id) ?? names.get(id) ?? '(no owner reported)' }))

  // cc commits on the renderer main thread per tab switch.
  const ccCommits = steps
    .filter((s) => s.name.startsWith('tab '))
    .map((s) => spans.filter((e) => e.name === 'Commit' && threadOf(e) === 'CrRendererMain' && step(e.ts) === s.name).length)

  console.log(`\n=== ${gpu ? 'GPU (as found)' : '--disable-gpu'} | renderer: ${renderer} | tier: ${tier} ===`)
  console.log('Busy % of each step (top-level tasks):')
  console.table(busyRows)
  console.log('Raster ms per layer, whole run:')
  console.table(rasterRows)
  console.log(`Commits per tab switch: cc ${JSON.stringify(ccCommits)}, React ${JSON.stringify(reactPerSwitch)}`)
  return { gpu, renderer, tier, busy: busyRows, raster: rasterRows, ccCommits, reactCommits: reactPerSwitch }
}

const results = []
try {
  for (let r = 0; r < runs; r++) for (const gpu of args.includes("--names") ? [false] : [true, false]) results.push(report(await trace(gpu)))
} finally {
  server.close()
}
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(results, null, 2))
