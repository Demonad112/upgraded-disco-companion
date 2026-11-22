import { readFileSync } from 'node:fs'
import { it } from 'vitest'
import { analyzeCharacter } from '../src/analyze.js'
import { normalizeItems } from '../src/model/slots.js'
import { ModTiers, type ModTierData } from '../src/gear/tiers.js'
import { analyzeItem } from '../src/gear/analyze.js'
import { planReplacement, resistanceGrants } from '../src/gear/replace.js'
import { mainWithBreakdowns } from './helpers/main-build.js'
it('x', async () => {
  const payload = mainWithBreakdowns()
  const tiers = new ModTiers(JSON.parse(readFileSync('../data/generated/mod-tiers.json', 'utf8')) as ModTierData)
  const analysis = await analyzeCharacter(payload)
  const items = normalizeItems(payload.charModel).filter((i) => i.active)
  const analysed = items.map((i) => analyzeItem(i, tiers, analysis.defense))
  console.log(analysed.map((a) => a.slotLabel + ':' + a.slotId + ':' + a.name).join(' | '))
  const by = (l: string) => analysed.find((i) => i.slotLabel === l)!
  const h = by('Helmet')
  console.log('grants', JSON.stringify(resistanceGrants(h.slotId, analysis.defense, analysis.attribution)))
  const plan = (label: string, extra: any = {}) => planReplacement({ target: by(label), items: analysed, rawItems: items, defense: analysis.defense, attribution: analysis.attribution, tiers, ...extra })
  for (const [l, e] of [['Ring 2', { omitResistances: ['cold'] }], ['Ring 2', { omitResistances: ['lightning'] }], ['Ring 2', { omitResistances: ['cold','lightning'] }]] as any) {
    const p: any = plan(l, e)
    console.log('==', l, JSON.stringify(e), 'item', by(l).name)
    console.log('res', JSON.stringify(p.resistances), '\nexisting', JSON.stringify(p.existingShortfalls), '\nfollow', JSON.stringify(p.followUps), '\nuncovered', JSON.stringify(p.uncovered))
    console.log('spec', JSON.stringify(p.spec.map((s: any) => [s.kind, s.why, s.tier, s.min, s.current, s.text?.slice(0, 40)])))
  }
})
