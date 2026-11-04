// First-load JS/CSS weight per route (raw and brotli), from the static export.
// Run from the repo root after `npm run build`. See docs/audit/04-PERFORMANCE-BASELINE.md.
import { existsSync, readFileSync } from 'node:fs'
import { brotliCompressSync } from 'node:zlib'
const out = 'apps/web/out'
// Brotli budgets (bytes). `/` raised 190,000 -> 192,000 in CH5: shared classes land on `/`. Any other route <= 250,000.
const BUDGET = { 'index.html': 192_000 }
const DEFAULT_BUDGET = 250_000
let over = 0
for (const p of ['index.html', 'checklist/index.html', 'character/index.html', 'atlas/index.html', 'dashboard/index.html', 'trade/index.html']) {
  if (!existsSync(`${out}/${p}`)) continue
  const html = readFileSync(`${out}/${p}`, 'utf8')
  const files = new Set([...html.matchAll(/\/_next\/static\/chunks\/[^"']+\.(?:js|css)/g)].map((m) => m[0]))
  let raw = 0, br = 0
  for (const f of files) { const d = readFileSync(out + f); raw += d.length; br += brotliCompressSync(d).length }
  console.log(p.padEnd(24), String(files.size).padStart(3), 'files', String(raw).padStart(9), 'raw', String(br).padStart(8), 'br',
    br > (BUDGET[p] ?? DEFAULT_BUDGET) ? (over++, 'OVER ' + (BUDGET[p] ?? DEFAULT_BUDGET)) : '')
}
if (over) process.exit(1)
