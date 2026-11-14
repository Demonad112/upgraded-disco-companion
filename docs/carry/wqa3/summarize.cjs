// Summarise results.jsonl into markdown tables.
const fs = require('fs')
const file = process.argv[2] || __dirname + '/results.jsonl'
const rows = fs.readFileSync(file, 'utf8').trim().split('\n').map((l) => JSON.parse(l))
const host = (b) => (b.includes('localhost') ? 'local' : 'live')
const src = (w) => (w && w.src ? `${w.src.src || '?'}${w.src.fn ? ':' + w.src.fn : ''} (${w.src.type || ''})` : w ? 'render/style' : '—')
console.log('| Target | Route | Profile | Mode | Variant | p50 | p95 | % >16.7 | % janky (>25ms) | fps | LoAFs | worst LoAF | sky paints mid-scroll | Commit ms | Paint ms | Style ms | DOM | layers (Mpx) |')
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|')
for (const r of rows) {
  const m = r.mainMs || {}
  console.log(`| ${host(r.base)} | ${r.route} | ${r.profile} | ${r.mode} | ${r.variant} | ${r.p50} | ${r.p95} | ${r.over16} | ${r.jankPct} | ${r.effFps} | ${r.loafCount} | ${r.worstLoaf ? r.worstLoaf.dur + ' ms ' + src(r.worstLoaf) : '—'} | ${r.skyPaintsWhileScrolling ?? '?'} / ${r.skyPaintsDuringScroll} | ${m.Commit ?? 0} | ${m.Paint ?? 0} | ${(m.UpdateLayoutTree ?? 0)} | ${r.domNodes} | ${r.layers?.count ?? '?'} (${r.layers?.areaMpx ?? '?'}) |`)
}
