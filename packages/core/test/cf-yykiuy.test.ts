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
import { SupportCatalog, type PobSkillData } from '../src/gems/catalog.js'
import { analyzeItem } from '../src/gear/analyze.js'
import { ModTiers, type ModTierData, type MonkGloveEntry } from '../src/gear/tiers.js'
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

describe('CF1 item 4: Martial Artist gloves', () => {
  const monk = JSON.parse(
    readFileSync(join(here, '..', '..', 'data', 'generated', 'monk-gloves.json'), 'utf8'),
  ) as MonkGloveEntry[]
  const withMonk = tiers.withMonkGloves(monk)
  const grip = () =>
    normalizeItems(payload.charModel)
      .filter((i) => i.active && i.name === 'Damnation Grip')
      .map((i) => analyzeItem(i, withMonk, analysis.defense))[0]!

  it('has the 588-row transform table', () => {
    expect(monk).toHaveLength(588)
  })

  it('reverse-maps Extra Cold and Extra Lightning to AddedColdDamage7 / AddedLightningDamage7 (7th id of 9)', () => {
    for (const [id, source] of [
      ['HandWrapsAddedColdDamage7', 'AddedColdDamage7'],
      ['HandWrapsAddedLightningDamage7', 'AddedLightningDamage7'],
    ] as const) {
      const m = grip().mods.find((x) => x.id === id)!
      expect(withMonk.monkGloveSource(id)?.modId).toBe(source)
      expect(m.tiers).toBe(9)
      expect(m.unresolved).toBeNull()
      // The site numbers tiers from the top (T1 best), so id 7 of 9 is T3.
      expect(m.tier).toBe(3)
      expect(m.text).toMatch(/Gain .*Extra (Cold|Lightning) Damage/)
    }
  })

  it('leaves the glove untiered without the table', () => {
    const plain = normalizeItems(payload.charModel)
      .filter((i) => i.active && i.name === 'Damnation Grip')
      .map((i) => analyzeItem(i, tiers, analysis.defense))[0]!
    expect(plain.mods.find((x) => x.id === 'HandWrapsAddedColdDamage7')!.tier).toBeNull()
  })
})

describe('CF1 item 3: dead stats', () => {
  const catalog = new SupportCatalog(
    JSON.parse(readFileSync(join(here, '..', '..', 'data', 'generated', 'pob-skills.json'), 'utf8')) as PobSkillData,
  )
  it('flags 28% Cast Speed on Demon Pendant, gain not measured', async () => {
    const a = await analyzeCharacter(payload, { tiers, catalog })
    const rec = a.recommendations.recommendations.find((r) => r.id === 'gear-dead-stat')!
    expect(rec).toBeDefined()
    expect(rec.action).toContain('increased Cast Speed" (rolled 28)')
    expect(rec.action).toContain('Demon Pendant')
    expect(rec.detail).toContain('DPS gain not measured')
    expect(rec.evidence.some((e) => e.kind === 'item' && e.itemName === 'Demon Pendant')).toBe(true)
  })

  it('is skipped without the skills catalog', () => {
    expect(analysis.recommendations.recommendations.find((r) => r.id === 'gear-dead-stat')).toBeUndefined()
  })
})
