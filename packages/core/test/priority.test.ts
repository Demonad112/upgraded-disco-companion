/**
 * "Which item to replace first" on the main build with breakdowns. The Viper Whorl
 * ring holds up cold and lightning (see replace.test.ts); other items have lines
 * that only a higher item-level base can improve.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { analyzeCharacter } from '../src/analyze.js'
import { normalizeItems } from '../src/model/slots.js'
import { ModTiers, type ModTierData } from '../src/gear/tiers.js'
import { analyzeItem } from '../src/gear/analyze.js'
import { rankReplacements } from '../src/gear/priority.js'
import { removalDeficits } from '../src/gear/replace.js'
import { mainWithBreakdowns } from './helpers/main-build.js'

const here = dirname(fileURLToPath(import.meta.url))
const dataDir = join(here, '..', '..', 'data', 'generated')
const payload = mainWithBreakdowns()
const model = payload.charModel ?? payload
const tiers = new ModTiers(JSON.parse(readFileSync(join(dataDir, 'mod-tiers.json'), 'utf8')) as ModTierData)
const analysis = await analyzeCharacter(payload)
const items = normalizeItems(model).filter((i) => i.active)
const analysed = items.map((i) => analyzeItem(i, tiers, analysis.defense))
const ranking = rankReplacements(analysed, analysis.defense, analysis.attribution)
const row = (label: string) => ranking.ranked.find((r) => r.slotLabel === label)!

describe('removalDeficits', () => {
  it('matches what the replacement planner charges the ring', () => {
    const ring = analysed.find((i) => i.slotLabel === 'Ring 2')!
    expect(removalDeficits(ring, analysis.defense, analysis.attribution)).toMatchObject({ cold: 30, lightning: 34 })
  })
})

describe('removalDeficits without a trustworthy breakdown', () => {
  it('returns null for the untrusted type and lists it on the ranking row', () => {
    const attribution = {
      ...analysis.attribution,
      stats: analysis.attribution.stats.map((s) => (s.stat === 'fireResistance' ? { ...s, trustworthy: false } : s)),
    }
    const helmet = analysed.find((i) => i.slotLabel === 'Helmet')!
    expect(removalDeficits(helmet, analysis.defense, attribution).fire).toBeNull()
    const r = rankReplacements(analysed, analysis.defense, attribution)
    const hrow = [...r.ranked, ...r.unranked].find((x) => x.slotLabel === 'Helmet')!
    expect(hrow.removalCostUnknown).toContain('fire')
    expect(hrow.removalCost.fire).toBeUndefined()
  })
})

describe('rankReplacements', () => {
  it('ranks every active non-unique item once, 1 first', () => {
    expect(ranking.ranked.map((r) => r.rank)).toEqual(ranking.ranked.map((_, i) => i + 1))
    expect(ranking.ranked.length + ranking.unranked.length).toBe(analysed.filter((i) => i.active).length)
    expect(ranking.unranked.every((r) => r.rarity === 'Unique' && r.rank === null)).toBe(true)
  })

  it('puts items at their base\'s ceiling first', () => {
    const counts = ranking.ranked.map((r) => r.needsNewBase.length)
    expect(counts).toEqual([...counts].sort((a, b) => b - a))
    expect(ranking.ranked[0]!.needsNewBase.length).toBeGreaterThan(0)
  })

  it('charges only new shortfalls to an item', () => {
    // Chaos is already 57 below cap; removing an item is charged only the chaos that item carries (the ring's 8),
    // never the 57 it was already short, and an item with no chaos is charged none.
    for (const r of ranking.ranked) {
      if (r.slotLabel === 'Ring 1') expect(r.removalCost.chaos).toBe(8)
      else expect(r.removalCost.chaos).toBeUndefined()
    }
    expect(row('Ring 2').removalCost).toMatchObject({ cold: 29, lightning: 34 })
  })

  it('states every reason it ranked on', () => {
    for (const r of ranking.ranked) {
      if (r.needsNewBase.length) expect(r.reasons.join(' ')).toMatch(/higher item-level base/)
      if (r.tiersBelowTop) expect(r.reasons.join(' ')).toMatch(/below the top/)
      if (r.wasted.length) expect(r.reasons.join(' ')).toMatch(/over the cap/)
    }
  })
})
