import { readFileSync } from 'node:fs'
const [dir, w, mode] = process.argv.slice(2)
const R = JSON.parse(readFileSync(`${dir}/raw-${w}.json`, 'utf8'))
const TOK = { '#f3eee4': 'ink', '#b1aca3': 'ink-dim', '#8f897f': 'ink-mute', '#e3b341': 'accent', '#8a6d22': 'accent-dim', '#1b1204': 'on-accent', '#199e70': 'good', '#c98500': 'warn', '#e66767': 'danger',
  '#c4beb4': 'dmg-physical', '#cf4524': 'dmg-fire', '#86ccf7': 'dmg-cold', '#ffe23d': 'dmg-lightning', '#8634c2': 'dmg-chaos', '#b98a24': 'gold-text(dark stop)' }
const parse = (c) => { const m = c.match(/[\d.]+/g).map(Number); if (c.startsWith('color(')) return [m[0] * 255, m[1] * 255, m[2] * 255, m[3] ?? 1]; return [m[0], m[1], m[2], m[3] ?? 1] }
const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
const lum = (r, g, b) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
const cr = (a, b) => { const [x, y] = [lum(...a), lum(...b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
const mix = (fg, bg, a) => fg.slice(0, 3).map((v, i) => v * a + bg[i] * (1 - a))

const rows = []
for (const [key, d] of Object.entries(R)) {
  if (d.error) { console.log('ERROR', key, d.error); continue }
  for (const t of d.texts) {
    if (!t.bg || t.inClosedDetails) continue
    let fg = parse(t.color); if (t.clip || fg[3] === 0) fg = [0xb9, 0x8a, 0x24, 1]
    const a = fg[3] * t.op
    const tokHex = hex(...fg)
    const large = t.size >= 24 || (t.size >= 18.66 && t.weight >= 700)
    const need = large ? 3 : 4.5
    const r = (bg) => cr(mix(fg, bg, a), bg)
    const med = r(t.bg.med), worst = Math.min(r(t.bg.lo), r(t.bg.hi))
    rows.push({ key, tok: TOK[tokHex] ?? tokHex, a: +a.toFixed(2), size: t.size, weight: t.weight, family: t.family, need, med: +med.toFixed(2), worst: +worst.toFixed(2), bg: hex(...t.bg.med), sel: t.sel, text: t.text, tt: t.tt, ls: t.ls, lh: t.lh })
  }
}
if (mode === 'tokens') {
  // per token x median background: count, min ratio, sizes
  const g = new Map()
  for (const r of rows) { const k = `${r.tok}${r.a < 1 ? '@' + r.a : ''} on ${r.bg}`; const e = g.get(k) ?? { n: 0, min: 99, minWorst: 99, sizes: new Set(), fail: 0, ex: '', routes: new Set() }; e.n++; if (r.med < e.min) { e.min = r.med; e.ex = `${r.key} ${r.sel.split(' > ').pop()} "${r.text}" ${r.size}px` } e.minWorst = Math.min(e.minWorst, r.worst); e.sizes.add(r.size); if (r.med < r.need) e.fail++; e.routes.add(r.key.split('@')[0]); g.set(k, e) }
  const out = [...g.entries()].sort((a, b) => a[1].min - b[1].min)
  for (const [k, e] of out.slice(0, +process.argv[5] || 45)) console.log(`${e.min.toFixed(2)} (worst-px ${e.minWorst.toFixed(2)}) n=${e.n} fail=${e.fail} | ${k} | routes=${e.routes.size} | ${e.ex}`)
}
if (mode === 'fails') {
  const g = new Map()
  for (const r of rows.filter((r) => r.med < r.need)) { const k = `${r.key}|${r.sel.split(' > ').slice(-2).join(' > ')}|${r.tok}@${r.a}|${r.size}`; const e = g.get(k) ?? { n: 0, min: 99, bg: r.bg, text: r.text }; e.n++; e.min = Math.min(e.min, r.med); g.set(k, e) }
  for (const [k, e] of [...g.entries()].sort((a, b) => a[1].min - b[1].min)) console.log(`${e.min.toFixed(2)} n=${e.n} bg=${e.bg} | ${k} | "${e.text}"`)
}
if (mode === 'sky') {
  // text whose worst-pixel ratio fails while the median passes: something bright crosses it
  const g = new Map()
  for (const r of rows.filter((r) => r.med >= r.need && r.worst < r.need)) { const k = `${r.key}|${r.sel.split(' > ').slice(-2).join(' > ')}|${r.tok}|${r.size}`; const e = g.get(k) ?? { n: 0, min: 99, text: r.text }; e.n++; e.min = Math.min(e.min, r.worst); g.set(k, e) }
  for (const [k, e] of [...g.entries()].sort((a, b) => a[1].min - b[1].min).slice(0, 30)) console.log(`${e.min.toFixed(2)} n=${e.n} | ${k} | "${e.text}"`)
}
if (mode === 'type') {
  for (const [key, d] of Object.entries(R)) {
    if (d.error) continue
    const sz = {}; for (const t of d.texts) if (!t.inClosedDetails) sz[t.size] = (sz[t.size] ?? 0) + 1
    const small = d.texts.filter((t) => t.size < 12 && !t.inClosedDetails)
    const fam = {}; for (const t of d.texts) fam[t.family] = (fam[t.family] ?? 0) + 1
    const p = d.paras.sort((a, b) => a - b)
    console.log(`${key} h=${d.height} nodes=${d.nodes} sizes=${JSON.stringify(sz)} <12px=${small.length} fam=${JSON.stringify(fam)} cpl(med/max)=${p[Math.floor(p.length / 2)]}/${p.at(-1)} h1=${d.h1} heads=${d.headCount} skips=${d.skips} overflow=${d.scrollW > d.innerW ? d.scrollW + ' ' + d.wide.join(';') : 'no'} unnamed=${d.unnamed} noalt=${d.imgsNoAlt} lang=${d.lang} main=${d.mainCount}`)
    const ex = {}; for (const t of small) { const k = t.sel.split(' > ').pop() + ' ' + t.size + 'px ' + t.family; ex[k] = (ex[k] ?? 0) + 1 }
    console.log('   small:', Object.entries(ex).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => `${k} x${n}`).join(' | '))
  }
}
if (mode === 'targets') {
  for (const [key, d] of Object.entries(R)) {
    if (d.error) continue
    const bad = d.targets.filter((t) => (t.w < 44 || t.h < 44) && !t.inline)
    const inl = d.targets.filter((t) => (t.w < 44 || t.h < 44) && t.inline).length
    const g = {}; for (const t of bad) { const k = t.sel.split(' > ').slice(-2).join(' > '); const e = g[k] ?? { n: 0, w: 999, h: 999, name: t.name, fixed: t.fixedAnc }; e.n++; e.w = Math.min(e.w, t.w); e.h = Math.min(e.h, t.h); g[k] = e }
    console.log(`## ${key}: ${d.targets.length} targets, ${bad.length} under 44 (+${inl} inline links)`)
    for (const [k, e] of Object.entries(g).sort((a, b) => Math.min(a[1].w, a[1].h) - Math.min(b[1].w, b[1].h)).slice(0, +process.argv[5] || 9)) console.log(`   ${e.w}x${e.h} x${e.n} ${k} "${e.name.replace(/\n/g, ' ')}" ${e.fixed}`)
    console.log('   bars:', d.bars.map((b) => `${b.sel} ${b.pos} top=${b.top} h=${b.h} bg=${b.bg} bf=${b.bf}`).join(' | '))
  }
}
if (mode === 'kb') {
  for (const [key, d] of Object.entries(R)) {
    if (d.error || !d.kb?.length) continue
    const k = d.kb.filter((x) => !x.none)
    const noInd = k.filter((x) => (x.outline.startsWith('none') || / 0px /.test(x.outline)) && !x.shadow)
    const cov = k.filter((x) => x.covered), off = k.filter((x) => !x.inView)
    console.log(`${key}: stops=${k.length} first="${k[0]?.name}" (${k[0]?.sel}) noIndicator=${noInd.length} [${[...new Set(noInd.map((x) => x.sel))].slice(0, 5)}] covered=${cov.length} [${[...new Set(cov.map((x) => x.sel + '<' + x.covered))].slice(0, 5)}] offscreen=${off.length} outline=${[...new Set(k.map((x) => x.outline))].slice(0, 3).join(' / ')}`)
    console.log('   motion full:', JSON.stringify(d.motionFull), '\n   motion reduced:', JSON.stringify(d.motionReduced), '\n   anims:', JSON.stringify(d.anims?.slice(0, 5)))
  }
}
