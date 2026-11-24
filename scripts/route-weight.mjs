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
  'character/index.html': 222_000, // B9 E0: 220,142 B br (219,891 before). Growth is the feature: the page reads a `#pob=<code>` share link on load (lib/pobLink.ts); the Copy link side lives in the lazy results chunk. Was 220,000. CP-1: 218,611 B br. Growth is the feature: analyzeCharacter statically imports pob/code-breakdowns (a leaf module over model/breakdowns, model/passives, pob/items and pob/snapshot, all already on the route). Raised per the plan's CP-1 route note. Was 216,000 (PB-5).
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
  // Marker: Companion.tsx's module-private TIP_SEEN key, so no other module can import it into a second chunk.
  { name: 'companion', marker: 'poe2-companion-tip-seen', cap: 6_000 }, // 5,721 B br on 2026-11-16
]
const ROUTES = ['index.html', 'checklist/index.html', 'character/index.html', 'atlas/index.html', 'dashboard/index.html', 'trade/index.html', 'methodology/index.html', 'whats-new/index.html']
const CHUNK_RE = /\/_next\/static\/chunks\/[^"']+\.(?:js|css)/g
const CHUNKS = `${out}/_next/static/chunks`
// Every file under chunks/, subfolders included, as a path relative to it with forward slashes.
const chunkFiles = () => (existsSync(CHUNKS) ? readdirSync(CHUNKS, { recursive: true }).map((f) => String(f).replaceAll('\\', '/')) : [])
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
  for (const f of chunkFiles()) {
    const url = `/_next/static/chunks/${f}`
    if (!/\.(?:js|css)$/.test(f) || named.has(url)) continue
    const d = readFileSync(out + url); lazyFiles++; lazyRaw += d.length; lazyBr += brotliCompressSync(d).length
  }
  console.log('lazy (no HTML names them)'.padEnd(24), String(lazyFiles).padStart(3), 'files', String(lazyRaw).padStart(9), 'raw', String(lazyBr).padStart(8), 'br',
    lazyBr > LAZY_BUDGET ? (over++, 'OVER ' + LAZY_BUDGET) : '')
}
for (const { name, marker, cap } of CHUNK_CAPS) {
  if (!existsSync(CHUNKS)) continue
  const hits = chunkFiles().filter((f) => f.endsWith('.js') && readFileSync(`${CHUNKS}/${f}`, 'utf8').includes(marker))
  if (hits.length !== 1) { over++; console.log(`${name} chunk: expected 1 file with "${marker}", found ${hits.length}`); continue }
  const br = brotliCompressSync(readFileSync(`${CHUNKS}/${hits[0]}`)).length
  console.log(`${name} chunk`.padEnd(24), '  1 file ', ' '.repeat(18), String(br).padStart(8), 'br', br > cap ? (over++, 'OVER ' + cap) : '')
}
// B9 E2: the PoB2 browser engine's files (public/pob2, built by sync-data from vendor/pob2). Fetched by E3's worker
// on demand, never by a route: data, not JS, so they sit outside the route and lazy JS budgets. Same rule as above
// (brotli at Node's default quality 11, measured size rounded up to the next 2,000 B).
const POB2_BUDGET = {
  'pob2/calc.pack.txt': 2_416_000, // 2,415,322 B br (31.95 MB raw): every src/ + runtime/lua file, current tree only
  'pob2/glue.wasm': 96_000, // 94,810 B br: wasmoon 1.16.0, one byte patched
}
for (const [file, cap] of Object.entries(POB2_BUDGET)) {
  if (!existsSync(`${out}/${file}`)) continue
  const br = brotliCompressSync(readFileSync(`${out}/${file}`)).length
  console.log(file.padEnd(24), '  1 file ', ' '.repeat(18), String(br).padStart(8), 'br', br > cap ? (over++, 'OVER ' + cap) : '')
}
// Until E3 adds the opt-in button, no route may load the engine on its own.
for (const p of ROUTES) if (existsSync(`${out}/${p}`) && readFileSync(`${out}/${p}`, 'utf8').includes('pob2/')) { over++; console.log(`${p}: references pob2/ (the engine must stay lazy)`) }
if (over) process.exit(1)
