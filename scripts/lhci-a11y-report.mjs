// Prints every accessibility audit scoring below 1, per route and run, from LHCI's filesystem output.
// Usage: node scripts/lhci-a11y-report.mjs [.lighthouseci]. Report only: always exits 0.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2] ?? '.lighthouseci'
const files = existsSync(dir) ? readdirSync(dir).filter((f) => /^lhr-.*\.json$/.test(f)) : []
if (!files.length) console.log(`No lhr-*.json in ${dir}.`)
const seen = new Map()
for (const f of files.sort()) {
  const lhr = JSON.parse(readFileSync(join(dir, f), 'utf8'))
  const cat = lhr.categories?.accessibility
  if (!cat) continue
  const route = new URL(lhr.finalDisplayedUrl ?? lhr.finalUrl ?? lhr.requestedUrl).pathname
  const failing = cat.auditRefs
    .filter((r) => r.weight > 0)
    .map((r) => lhr.audits[r.id])
    .filter((a) => a && a.score !== null && a.score < 1)
  console.log(`${route}  a11y ${Math.round(cat.score * 100)}  ${failing.length ? failing.map((a) => a.id).join(', ') : 'no failing audits'}`)
  for (const a of failing) {
    const key = `${a.id} ${route}`
    if (seen.has(key)) continue
    seen.set(key, true)
    const items = a.details?.items ?? []
    for (const it of items.slice(0, 5)) {
      const n = it.node ?? {}
      console.log(`    ${a.id}: ${n.selector ?? ''} ${n.snippet ?? ''} ${(n.explanation ?? '').split('\n').slice(0, 2).join(' / ')}`.slice(0, 400))
    }
  }
}
