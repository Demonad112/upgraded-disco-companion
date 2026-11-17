// Prints every accessibility audit scoring below 1, per route and run, from LHCI's filesystem output.
// Usage: node scripts/lhci-a11y-report.mjs [.lighthouseci]. Report only: always exits 0.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2] ?? '.lighthouseci'
const files = existsSync(dir) ? readdirSync(dir).filter((f) => /^lhr-.*\.json$/.test(f)) : []
if (!files.length) console.log(`No lhr-*.json in ${dir}.`)
const seen = new Set()
for (const f of files.sort()) {
  try {
    const lhr = JSON.parse(readFileSync(join(dir, f), 'utf8'))
    const cat = lhr.categories?.accessibility
    if (!cat) continue
    const url = lhr.finalDisplayedUrl ?? lhr.finalUrl ?? lhr.requestedUrl
    if (!url) throw new Error('no URL')
    const route = new URL(url).pathname
    const score = cat.score === null || cat.score === undefined ? 'n/a (run errored)' : Math.round(cat.score * 100)
    const failing = (cat.auditRefs ?? [])
      .filter((r) => r.weight > 0)
      .map((r) => lhr.audits?.[r.id])
      .filter((a) => a && a.score !== null && a.score < 1)
    console.log(`${route}  a11y ${score}  ${failing.length ? failing.map((a) => a.id).join(', ') : 'no failing audits'}`)
    for (const a of failing) {
      const key = `${a.id} ${route}`
      if (seen.has(key)) continue
      seen.add(key)
      for (const it of (a.details?.items ?? []).slice(0, 5)) {
        const n = it.node ?? {}
        console.log(`    ${a.id}: ${n.selector ?? ''} ${n.snippet ?? ''} ${(n.explanation ?? '').split('\n').slice(0, 2).join(' / ')}`.slice(0, 400))
      }
    }
  } catch (e) {
    console.log(`${f}  skipped: ${e instanceof Error ? e.message : String(e)}`)
  }
}
