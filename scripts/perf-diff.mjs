import { readFileSync } from 'node:fs'
import * as core from '../packages/core/dist/index.js'
const R = new URL('../', import.meta.url).pathname
const J = (p) => JSON.parse(readFileSync(R + p, 'utf8'))
const tiers = new core.ModTiers(J('apps/web/out/mod-tiers.json')), tree = new core.PassiveTree(J('apps/web/out/passive-tree.json'))
for (const fx of ['yykiuy-v51', 'athrynas-v43']) {
  const raw = J(`packages/core/test/fixtures/${fx}.json`)
  const combos = { none: {}, tiers: { tiers }, tree: { tree }, both: { tiers, tree } }
  for (const [k, o] of Object.entries(combos)) {
    const t = performance.now(); let a
    for (let i = 0; i < 5; i++) a = await core.analyzeCharacter(raw, { ...o, ladder: null })
    const ms = (performance.now() - t) / 5
    const s = core.toSnapshot(a, '')
    const as = a.assessment
    const top = a.recommendations.recommendations.filter((r) => r.category !== 'question').slice(0, 3).map((r) => r.id + ':' + r.action.slice(0, 50))
    console.log(fx, k.padEnd(5), ms.toFixed(1) + 'ms', 'grade', as.tier, JSON.stringify(as.tierRange), 'score', as.score, JSON.stringify(as.scoreRange), 'life', s.life, 'es', s.energyShield, 'dps', s.dps, 'killedBy', s.weakestHit, '\n   top3', JSON.stringify(top))
  }
}
