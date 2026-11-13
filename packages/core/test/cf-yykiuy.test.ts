/**
 * CF1: data-correctness fixes found by the Yykiuy audit (items 1-4).
 * Fixture: yykiuy-v80.json, captured verbatim 2026-11-13 (model of 2026-11-12T23:34Z).
 * Every number asserted here is poe.ninja's value as given, or derived from it.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { analyzeCharacter } from '../src/analyze.js'
import { analyzeItem } from '../src/gear/analyze.js'
import { ModTiers, type ModTierData } from '../src/gear/tiers.js'
import { normalizeItems } from '../src/model/slots.js'

const here = dirname(fileURLToPath(import.meta.url))
const tiers = new ModTiers(
  JSON.parse(readFileSync(join(here, '..', '..', 'data', 'generated', 'mod-tiers.json'), 'utf8')) as ModTierData,
)
const payload = JSON.parse(readFileSync(join(here, 'fixtures', 'yykiuy-v80.json'), 'utf8'))
const analysis = await analyzeCharacter(payload, { tiers })
const items = normalizeItems(payload.charModel)
  .filter((i) => i.active)
  .map((i) => analyzeItem(i, tiers, analysis.defense))

describe('CF1 item 1: damage element order', () => {
  it('reads ninja tuples as physical, lightning, cold, fire, chaos', () => {
    const ft = analysis.dps.skills.find((s) => s.name === 'Falling Thunder')!
    const pct = Object.fromEntries(ft.damageSplit.map((d) => [d.type, d.percent]))
    expect(pct).toEqual({ physical: 12, lightning: 49, cold: 31, fire: 8 })
    expect(ft.damageSplit[0]).toMatchObject({ type: 'lightning', percent: 49 })
  })

  it('names Lightning as the primary skill element', () => {
    expect(analysis.dps.primary?.name).toBe('Falling Thunder')
    expect(analysis.dps.primary?.damageSplit[0]?.type).toBe('lightning')
  })
})

describe('CF1 item 2: affix slot limits', () => {
  const pendant = items.find((i) => i.name === 'Demon Pendant')!

  it('applies +1 prefix / -1 suffix allowed from the implicit', () => {
    expect(pendant.affixCapacity).toEqual({ prefix: 4, suffix: 2 })
    expect(pendant.affixCounts).toEqual({ prefix: 4, suffix: 2 })
  })

  it('reports no open slot on Demon Pendant', () => {
    const rec = analysis.recommendations.recommendations.find((r) => r.id === 'gear-open-affixes')
    const text = JSON.stringify(rec ?? {})
    expect(text).not.toContain('Demon Pendant')
  })
})
