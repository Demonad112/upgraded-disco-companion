// First-load JS/CSS weight per route (raw and brotli), from the static export.
// Run from the repo root after `npm run build`. See docs/VARIANT-STRATEGY.md#perf-baseline.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { brotliCompressSync } from 'node:zlib'
const out = 'apps/web/out'
// Brotli budgets (bytes), counting only what a modern browser downloads: `<script noModule>` (Next's 35,158 B br
// polyfill chunk) is skipped. Pinned per route in PXC (PX11b) to the measured size rounded up to the next 2,000 B, so
// a route that grows by more than ~2 KB fails and the budget is raised on purpose, with the reason in the PR.
const BUDGET = {
  'index.html': 160_000, // CMP2: +1,140 B br on every route (companion host shell and CSS)
  'checklist/index.html': 167_000,
  'character/index.html': 209_000,
  'atlas/index.html': 179_000, // CMP2 (as index)
  'dashboard/index.html': 188_000,
  'trade/index.html': 162_000,
  'methodology/index.html': 156_000,
  'whats-new/index.html': 154_000,
}
const DEFAULT_BUDGET = 190_000
// PXC-2: chunks that no route's first-load HTML references (the /character tab and results chunks, the Farm and Atlas
// lazy panels). They load after first paint, so they sit outside the route budgets above; this pins their total.
// Same rule: measured size rounded up to the next 2,000 B.
const LAZY_BUDGET = 192_000 // B4: 190,275 B br rounded up (main was already 190,090 after #198, over its 190,000 pin; B4 adds +185 B br (rank-ordered gear grid, trade slot check, readable PoB conditions)); C1-C4: +2,193 B br, the companion chunk (step titles for the tip, the tour, Questions, page starts); CMP2: +2,753 B br, the companion chunk; P1: +5,180 B br, the sky painter moved out of first load (every route -4,605 B); P3: +1,051 B br, the effects-tier probe (renderer and frame checks)
// Per-chunk caps inside the lazy set, found by a marker string because chunk names are hashed. The lazy total above
// is one sum, so moving code between lazy chunks never frees it; these caps stop one chunk growing into the headroom.
const CHUNK_CAPS = [
  { name: 'companion', marker: 'poe2-companion-toured', cap: 6_000 }, // 5,721 B br on 2026-11-16
]
const ROUTES = ['index.html', 'checklist/index.html', 'character/index.html', 'atlas/index.html', 'dashboard/index.html', 'trade/index.html', 'methodology/index.html', 'whats-new/index.html']
const CHUNK_RE = /\/_next\/static\/chunks\/[^"']+\.(?:js|css)/g
let over = 0
for (const p of ROUTES) {
  if (!existsSync(`${out}/${p}`)) continue
  const html = readFileSync(`${out}/${p}`, 'utf8')
  const files = new Set([...html.replace(/<script\b[^>]*\bnoModule\b[^>]*>/gi, '').matchAll(CHUNK_RE)].map((m) => m[0]))
  let raw = 0, br = 0
  for (const f of files) { const d = readFileSync(out + f); raw += d.length; br += brotliCompressSync(d).length }
  console.log(p.padEnd(24), String(files.size).padStart(3), 'files', String(raw).padStart(9), 'raw', String(br).padStart(8), 'br',
    br > (BUDGET[p] ?? DEFAULT_BUDGET) ? (over++, 'OVER ' + (BUDGET[p] ?? DEFAULT_BUDGET)) : '')
}

// Lazy chunks: everything in chunks/ that no route's HTML names (noModule scripts count as named, so the polyfill is not lazy).
const named = new Set()
for (const p of ROUTES) if (existsSync(`${out}/${p}`)) for (const m of readFileSync(`${out}/${p}`, 'utf8').matchAll(CHUNK_RE)) named.add(m[0])
if (named.size) {
  let lazyRaw = 0, lazyBr = 0, lazyFiles = 0
  for (const f of readdirSync(`${out}/_next/static/chunks`)) {
    const url = `/_next/static/chunks/${f}`
    if (!/\.(?:js|css)$/.test(f) || named.has(url)) continue
    const d = readFileSync(out + url); lazyFiles++; lazyRaw += d.length; lazyBr += brotliCompressSync(d).length
  }
  console.log('lazy (no HTML names them)'.padEnd(24), String(lazyFiles).padStart(3), 'files', String(lazyRaw).padStart(9), 'raw', String(lazyBr).padStart(8), 'br',
    lazyBr > LAZY_BUDGET ? (over++, 'OVER ' + LAZY_BUDGET) : '')
}
for (const { name, marker, cap } of CHUNK_CAPS) {
  const dir = `${out}/_next/static/chunks`
  if (!existsSync(dir)) continue
  const hits = readdirSync(dir).filter((f) => f.endsWith('.js') && readFileSync(`${dir}/${f}`, 'utf8').includes(marker))
  if (hits.length !== 1) { over++; console.log(`${name} chunk: expected 1 file with "${marker}", found ${hits.length}`); continue }
  const br = brotliCompressSync(readFileSync(`${dir}/${hits[0]}`)).length
  console.log(`${name} chunk`.padEnd(24), '  1 file ', ' '.repeat(18), String(br).padStart(8), 'br', br > cap ? (over++, 'OVER ' + cap) : '')
}
if (over) process.exit(1)
