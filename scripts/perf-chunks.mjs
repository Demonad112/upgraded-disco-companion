import { readFileSync, existsSync } from 'node:fs'
import { brotliCompressSync } from 'node:zlib'
const out = 'apps/web/out'
const routes = ['index.html', 'character/index.html', 'checklist/index.html', 'atlas/index.html', 'dashboard/index.html', 'trade/index.html', 'methodology/index.html', 'whats-new/index.html']
const M = { 'react-dom': /react\.dev\/errors|__reactFiber/, 'next-router/runtime': /__next_f|NEXT_REDIRECT|app-router/, 'core:recommend': /one-shot-physical|res-chaos-under-cap/, 'core:ninja-client': /api\/character\?account/, 'core:trade': /trade2\/search|buildTradeUrl/, 'core:pob': /Path of Building|pobb\.in/, 'core:tree': /keystone/i, sky: /constellation/i, checklistData: /Clear the campaign|campaign/i, zod: /ZodError|invalid_type/, searchDialog: /SearchDialog|No results/, chat: /anthropic|api\.openai|messages"/, sw: /serviceWorker/, farmData: /waystone/i, atlasData: /atlas/i, turbopack: /TURBOPACK/ }
const sz = new Map(); const per = {}
for (const p of routes) {
  if (!existsSync(`${out}/${p}`)) { console.log('MISSING', p); continue }
  const html = readFileSync(`${out}/${p}`, 'utf8')
  const files = new Set([...html.replace(/<script\b[^>]*\bnoModule\b[^>]*>/gi, '').matchAll(/\/_next\/static\/chunks\/[^"']+\.(?:js|css)/g)].map((m) => m[0]))
  per[p] = files
  for (const f of files) if (!sz.has(f)) { const d = readFileSync(out + f); const s = d.toString('utf8'); sz.set(f, { raw: d.length, br: brotliCompressSync(d).length, tags: Object.entries(M).filter(([, r]) => r.test(s)).map(([k]) => k).join(',') }) }
  const htmlBr = brotliCompressSync(Buffer.from(html)).length
  let br = 0; for (const f of files) br += sz.get(f).br
  console.log(p.padEnd(26), files.size, 'files', br, 'br', '| html', html.length, 'raw', htmlBr, 'br')
}
const all = Object.values(per); const floor = [...sz.keys()].filter((f) => all.every((s) => s.has(f)))
let fb = 0, fr = 0; console.log('\nSHARED FLOOR (all 8 routes):')
for (const f of floor.sort((a, b) => sz.get(b).br - sz.get(a).br)) { const s = sz.get(f); fb += s.br; fr += s.raw; console.log(' ', f.split('/').pop().padEnd(28), String(s.raw).padStart(7), String(s.br).padStart(7), s.tags) }
console.log('  floor total', floor.length, 'files', fr, 'raw', fb, 'br')
for (const p of routes) { if (!per[p]) continue; console.log('\nEXTRA on', p); for (const f of [...per[p]].filter((f) => !floor.includes(f)).sort((a, b) => sz.get(b).br - sz.get(a).br)) { const s = sz.get(f); const n = all.filter((x) => x.has(f)).length; console.log(' ', f.split('/').pop().padEnd(28), String(s.raw).padStart(7), String(s.br).padStart(7), 'routes=' + n, s.tags) } }
