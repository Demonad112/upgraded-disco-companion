/**
 * Gear fit readout, archetype and derived weights.
 *
 * Synthetic data for the arithmetic (so every figure is checkable by hand) and
 * the recorded character for "it runs on real analysis without inventing
 * anything".
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { analyzeCharacter } from '../src/analyze.js'
import { normalizeItems } from '../src/model/slots.js'
import { ModTiers, type ModTierData } from '../src/gear/tiers.js'
import { analyzeItem, type ItemAnalysis, type ItemModAnalysis } from '../src/gear/analyze.js'
import { inferArchetype } from '../src/gear/archetype.js'
import { deriveStatWeights } from '../src/gear/weights.js'
import { fitItem, gearFitReport, GEAR_FIT_BASIS } from '../src/gear/fit.js'
import type { CharModel } from '../src/model/types.js'
import { mainWithReferenceDefence } from './helpers/main-build.js'

const LIFE = 'base_maximum_life'
const RES = 'base_fire_damage_resistance_%'
const MANA = 'base_maximum_mana'

const data: ModTierData = {
  version: 1,
  generatedFrom: [],
  note: 'test',
  baseTags: { 'Test Ring': ['ring'], 'Test Staff': ['staff'] },
  baseClass: { 'Test Ring': 'Ring', 'Test Staff': 'Staff' },
  mods: {
    LifeLow: { g: 'Life', t: 'p', lvl: 1, name: 'Healthy', stats: [[LIFE, 10, 20]], text: null, spawn: [['ring', 1], ['default', 0]] },
    LifeTop: { g: 'Life', t: 'p', lvl: 80, name: 'Rapturous', stats: [[LIFE, 40, 50]], text: null, spawn: [['ring', 1], ['default', 0]] },
    ResTop: { g: 'FireRes', t: 's', lvl: 1, name: 'of Embers', stats: [[RES, 20, 40]], text: null, spawn: [['ring', 1], ['default', 0]] },
    ManaTop: { g: 'Mana', t: 'p', lvl: 1, name: 'Bright', stats: [[MANA, 20, 40]], text: null, spawn: [['ring', 1], ['default', 0]] },
  },
}
const tiers = new ModTiers(data)

function mod(id: string, stat: string, value: number, extra: Partial<ItemModAnalysis> = {}): ItemModAnalysis {
  return {
    id,
    source: 'explicit',
    kind: 'prefix',
    affix: null,
    text: `${stat} ${value}`,
    tier: 1,
    tiers: 1,
    ilvlRequired: 1,
    rolled: [{ id: stat, value, min: null, max: null, quality: null }],
    upgrades: [],
    waste: null,
    unresolved: null,
    ...extra,
  }
}

function ring(slotId: number, mods: ItemModAnalysis[], over: Partial<ItemAnalysis> = {}): ItemAnalysis {
  return {
    slotId,
    slotLabel: `Ring ${slotId}`,
    name: `Ring ${slotId}`,
    baseType: 'Test Ring',
    itemClass: 'Ring',
    itemLevel: 100,
    rarity: 'Rare',
    corrupted: false,
    active: true,
    mods,
    affixCounts: { prefix: 0, suffix: 0 },
    affixCapacity: { prefix: 3, suffix: 3 },
    tierProfile: null,
    warnings: [],
    ...over,
  }
}

describe('ModTiers.topRoll with an item level', () => {
  it('ignores affixes the item level cannot roll, and still answers without one', () => {
    const tags = tiers.tagsForBase('Test Ring')!
    expect(tiers.topRoll(LIFE, tags)).toBe(50)
    expect(tiers.topRoll(LIFE, tags, 79)).toBe(20)
    expect(tiers.topRoll(LIFE, tags, 80)).toBe(50)
    expect(tiers.topRoll(LIFE, tiers.tagsForBase('Test Staff')!)).toBeNull()
  })
})

describe('inferArchetype', () => {
  const types = (...t: string[]) => new Set(t)
  it('reads energy shield, life and hybrid builds from the totals', () => {
    expect(inferArchetype({ defensive: { life: 500, energyShield: 1500, armour: 0, evasionRating: 0 }, skillTypes: types('Spell') }).defence).toBe('energy-shield')
    expect(inferArchetype({ defensive: { life: 3000, energyShield: 100, armour: 200, evasionRating: 100 }, skillTypes: null }).defence).toBe('life')
    expect(inferArchetype({ defensive: { life: 3000, energyShield: 100, armour: 5000, evasionRating: 3000 }, skillTypes: null }).defence).toBe('armour-evasion')
    expect(inferArchetype({ defensive: { life: 3000, energyShield: 100, armour: 5000, evasionRating: 1000 }, skillTypes: null }).defence).toBe('armour')
    expect(inferArchetype({ defensive: { life: 3000, energyShield: 100, armour: 500, evasionRating: 6000 }, skillTypes: null }).defence).toBe('evasion')
  })
  it('leaves a half null and names the missing input instead of guessing', () => {
    const a = inferArchetype({ defensive: { life: 3000 }, skillTypes: null })
    expect(a.defence).toBeNull()
    expect(a.missing).toEqual(['energy shield', 'main skill tags'])
    // Energy shield absent means energy shield cannot be ruled out, so armour is never consulted.
    expect(inferArchetype({ defensive: { life: 3000, armour: 9000, evasionRating: 0 }, skillTypes: null }).defence).toBeNull()
    expect(inferArchetype({ defensive: { life: 3000, energyShield: 0 }, skillTypes: types('Attack') }).missing).toEqual(['armour', 'evasion'])
  })
  it('reads offence from skill tags only', () => {
    const o = (...t: string[]) => inferArchetype({ defensive: null, skillTypes: types(...t) }).offence
    expect(o('Attack')).toBe('attack')
    expect(o('Spell')).toBe('spell')
    expect(o('Attack', 'Spell')).toBe('attack-and-spell')
    expect(o('Minion', 'Spell')).toBe('minion')
    expect(o('Aura')).toBeNull()
    expect(inferArchetype({ defensive: null, skillTypes: types('Aura') }).missing).toContain('an Attack, Spell or Minion tag on the main skill')
  })
})

describe('deriveStatWeights', () => {
  const items = [
    ring(1, [mod('LifeLow', LIFE, 15), mod('ResTop', RES, 30)]),
    ring(2, [mod('LifeLow', LIFE, 17), mod('ManaTop', MANA, 30)]),
    ring(3, [mod('ResTop', RES, 20)]),
    // Skipped: unique, inactive and implicit lines.
    ring(4, [mod('LifeLow', LIFE, 99)], { rarity: 'Unique' }),
    ring(5, [mod('LifeLow', LIFE, 99)], { active: false }),
    ring(6, [mod('LifeLow', LIFE, 99, { source: 'implicit' })]),
  ]
  it('weights a stat by how many equipped pieces carry it, relative to the most carried', () => {
    const w = deriveStatWeights(items)
    expect(w.map((x) => [x.statId, x.slots, x.importance])).toEqual([
      // Ties break by stat id, so the order is stable.
      [RES, 2, 1],
      [LIFE, 2, 1],
      [MANA, 1, 0.5],
    ])
    expect(w.find((x) => x.statId === LIFE)!.averageValue).toBe(16)
  })
  it('applies player overrides inside 0-3 and ignores non-numbers', () => {
    const w = deriveStatWeights(items, { [LIFE]: 9, [RES]: 0, [MANA]: Number.NaN })
    expect(Object.fromEntries(w.map((x) => [x.statId, x.weight]))).toEqual({ [LIFE]: 3, [RES]: 0, [MANA]: 0.5 })
  })
  it('is empty when nothing qualifies', () => {
    expect(deriveStatWeights([])).toEqual([])
  })
})

describe('fitItem', () => {
  const equipped = [
    ring(1, [mod('LifeLow', LIFE, 15), mod('ResTop', RES, 30)]),
    ring(2, [mod('LifeLow', LIFE, 17), mod('ManaTop', MANA, 30)]),
    ring(3, [mod('ResTop', RES, 20)]),
  ]
  const weights = deriveStatWeights(equipped)

  it('scores a fully rolled item at 100 and a half-rolled one at half', () => {
    // Top-6 weights that can roll on a ring: life 1, res 1, mana 0.5 (denominator 2.5).
    const best = ring(9, [mod('LifeTop', LIFE, 50), mod('ResTop', RES, 40), mod('ManaTop', MANA, 40)])
    expect(fitItem(best, tiers, weights).score).toBe(100)
    const half = ring(9, [mod('LifeTop', LIFE, 25), mod('ResTop', RES, 20), mod('ManaTop', MANA, 20)], { itemLevel: 100 })
    expect(fitItem(half, tiers, weights).score).toBe(50)
  })

  it('scores against what the item level can roll, and reports the unrestricted ceiling beside it', () => {
    // At ilvl 50 the best life roll is 20, so 20 life is "full" for this item but only 40% of what exists.
    const low = ring(9, [mod('LifeLow', LIFE, 20)], { itemLevel: 50 })
    const fit = fitItem(low, tiers, weights)
    expect(fit.score).toBe(40)
    expect(fit.ceiling).toBe(16)
    expect(fit.score).toBeGreaterThan(fit.ceiling!)
  })

  it('names the heaviest absent stats and lets a roll past the ceiling count only to 115%', () => {
    const fit = fitItem(ring(9, [mod('LifeTop', LIFE, 500)]), tiers, weights)
    expect(fit.lines[0]!.ratio).toBe(1.15)
    expect(fit.absent.map((a) => a.statId)).toEqual([RES, MANA])
  })

  it('does not count resistance the build provably wastes', () => {
    const wasteful = ring(9, [mod('ResTop', RES, 40, { waste: { amount: 20, stat: RES, overCap: 20, overCapBy: { fire: 20 }, reason: 'over cap' } })])
    const clean = ring(9, [mod('ResTop', RES, 20)])
    expect(fitItem(wasteful, tiers, weights).score).toBe(fitItem(clean, tiers, weights).score)
    expect(fitItem(wasteful, tiers, weights).wasted).toEqual([{ text: `${RES} 40`, statId: RES, amount: 20, alone: 20, overCap: 20, overCapBy: { fire: 20 }, reason: 'over cap', sharedWith: [] }])
  })

  it('spends one resistance over-cap once across items (GF1-7)', () => {
    // 59 over cap; each line alone is true (36 and 29), together only 59 can be wasted.
    const a = ring(1, [mod('ResTop', RES, 36, { waste: { amount: 36, stat: RES, overCap: 59, overCapBy: { fire: 59 }, reason: 'r' } })])
    const b = ring(2, [mod('ResTop', RES, 29, { waste: { amount: 29, stat: RES, overCap: 59, overCapBy: { fire: 59 }, reason: 'r' } })])
    const c = ring(3, [mod('ResTop', RES, 30, { waste: { amount: 30, stat: RES, overCap: 59, overCapBy: { fire: 59 }, reason: 'r' } })])
    const items = gearFitReport({ items: [a, b, c], tiers, defensive: null, skillTypes: null }).items
    const w = items.flatMap((i) => i.wasted)
    expect(w.map((x) => x.amount)).toEqual([36, 23, 0])
    expect(w.reduce((s, x) => s + x.amount, 0)).toBe(59)
    expect(w[0]!.sharedWith).toEqual([])
    expect(w[1]!.sharedWith).toEqual(['Ring 1'])
    expect(w[2]!.sharedWith).toEqual(['Ring 1', 'Ring 2'])
    expect(w[1]!.statId).toBe(RES)
  })

  it('GF1-7: rewrites the reason to the shared amount and keeps a 0-point row with why', () => {
    const a = ring(1, [mod('ResTop', RES, 36, { waste: { amount: 36, stat: RES, overCap: 59, overCapBy: { fire: 59 }, reason: 'alone' } })])
    const b = ring(2, [mod('ResTop', RES, 29, { waste: { amount: 29, stat: RES, overCap: 59, overCapBy: { fire: 59 }, reason: 'alone' } })])
    const c = ring(3, [mod('ResTop', RES, 30, { waste: { amount: 30, stat: RES, overCap: 59, overCapBy: { fire: 59 }, reason: 'alone' } })])
    const w = gearFitReport({ items: [a, b, c], tiers, defensive: null, skillTypes: null }).items.flatMap((i) => i.wasted)
    expect(w[0]!.reason).toBe('alone')
    expect(w[1]!.reason).toMatch(/Ring 1 already uses 36% of it, so 23% of this line is doing nothing/)
    expect(w[1]!.reason).toMatch(/score leaves out 29%/)
    expect(w[2]!.amount).toBe(0)
    expect(w[2]!.alone).toBe(30)
    expect(w[2]!.reason).toMatch(/None of this line is wasted/)
    expect(w[2]!.reason).not.toMatch(/At least 30%/)
  })

  it('GF1-7: an all-elemental line and a fire line draw on the same fire over-cap', () => {
    const ALL = 'base_resist_all_elements_%'
    const fire = ring(1, [mod('ResTop', RES, 36, { waste: { amount: 36, stat: RES, overCap: 59, overCapBy: { fire: 59 }, reason: 'r' } })])
    const allEle = ring(2, [mod('ResTop', ALL, 30, { waste: { amount: 30, stat: ALL, overCap: 59, overCapBy: { fire: 59, cold: 70, lightning: 80 }, reason: 'r' } })])
    const w = gearFitReport({ items: [fire, allEle], tiers, defensive: null, skillTypes: null }).items.flatMap((i) => i.wasted)
    expect(w.map((x) => x.amount)).toEqual([36, 23])
    expect(w[1]!.sharedWith).toEqual(['Ring 1'])
  })

  it('GF1-7: never names a line\'s own slot in sharedWith', () => {
    const two = ring(1, [
      mod('ResTop', RES, 30, { waste: { amount: 30, stat: RES, overCap: 40, overCapBy: { fire: 40 }, reason: 'r' } }),
      mod('ResTop', RES, 25, { text: 'second', waste: { amount: 25, stat: RES, overCap: 40, overCapBy: { fire: 40 }, reason: 'r' } }),
    ])
    const w = gearFitReport({ items: [two], tiers, defensive: null, skillTypes: null }).items[0]!.wasted
    expect(w.map((x) => x.amount)).toEqual([30, 10])
    expect(w[1]!.sharedWith).toEqual([])
    expect(w[1]!.reason).toMatch(/other lines on this item already use 30% of it/)
  })

  it('treats a negative roll as a penalty, never as zero', () => {
    const fit = fitItem(ring(9, [mod('LifeTop', LIFE, -50)]), tiers, weights)
    expect(fit.lines[0]!.ratio).toBe(-1)
    expect(fit.score).toBe(0)
  })

  it('lists lines it cannot score instead of scoring them', () => {
    const odd = ring(9, [
      mod('LifeTop', LIFE, 50),
      mod('Unknown1', 'weird_stat', 5, { tier: null, unresolved: 'not in the affix data' }),
      mod('LifeTop', 'unweighted_stat', 5),
    ])
    const fit = fitItem(odd, tiers, weights)
    expect(fit.unscored.map((u) => u.kind).sort()).toEqual(['not-understood', 'unweighted'])
    expect(fit.lines).toHaveLength(1)
  })

  it('returns missing with the reason, never 0, when it cannot score', () => {
    expect(fitItem(ring(9, [], { rarity: 'Unique', affixCapacity: null }), tiers, weights)).toMatchObject({ score: null, ceiling: null })
    expect(fitItem(ring(9, [], { baseType: 'Nowhere Ring' }), tiers, weights).missing).toMatch(/not in the base data/)
    expect(fitItem(ring(9, [], { baseType: 'Test Staff' }), tiers, weights).missing).toMatch(/no stat weight/)
    expect(fitItem(ring(9, [mod('LifeTop', LIFE, 50)]), tiers, []).missing).toMatch(/no stat weight/)
  })

  it('GF1-6: an item with no scorable line is missing, not 0, and keeps its unscored lines', () => {
    // Real case: Yykiuy's Damnation Grip has six lines the tier data does not know, which scored 0/100.
    const fit = fitItem(ring(9, [mod('Unknown1', 'weird_stat', 5, { tier: null, unresolved: 'not in the affix data' })]), tiers, weights)
    expect(fit.score).toBeNull()
    expect(fit.ceiling).toBeNull()
    expect(fit.missing).toMatch(/None of its 1 line could be scored/)
    expect(fit.unscored.map((u) => u.kind)).toEqual(['not-understood'])
  })

  it('GF1-6: a missing score still reports the waste it measured', () => {
    // Fire res is wasted but carries no weight here, so the item has no scorable line.
    const lifeOnly = weights.filter((w) => w.statId === LIFE)
    const fit = fitItem(ring(9, [mod('ResTop', RES, 30, { waste: { amount: 10, stat: RES, overCap: 10, overCapBy: { fire: 10 }, reason: 'over cap' } })]), tiers, lifeOnly)
    expect(fit.score).toBeNull()
    expect(fit.wasted.map((w) => w.amount)).toEqual([10])
  })

  it('lists reduction stats and stats the item level cannot roll as unscored', () => {
    const reduction = mod('LifeTop', LIFE, -20, { rolled: [{ id: LIFE, value: -20, min: -30, max: -10, quality: null }] })
    expect(fitItem(ring(9, [reduction]), tiers, weights).unscored.map((u) => u.kind)).toEqual(['reduction'])
    expect(fitItem(ring(9, [mod('LifeLow', LIFE, 15)], { itemLevel: 0 }), tiers, weights).unscored.map((u) => u.kind)).toEqual(['no-ceiling'])
  })

  it('uses the best roll at any level when the item level is unknown', () => {
    const fit = fitItem(ring(9, [mod('LifeLow', LIFE, 20)], { itemLevel: null }), tiers, weights)
    expect(fit.score).toBe(fit.ceiling)
  })
})

describe('on the recorded character', () => {
  const here = dirname(fileURLToPath(import.meta.url))
  const payload = mainWithReferenceDefence()
  const model: CharModel = payload.charModel ?? payload
  const real = new ModTiers(JSON.parse(readFileSync(join(here, '..', '..', 'data', 'generated', 'mod-tiers.json'), 'utf8')) as ModTierData)

  it('builds a report from an analysis already done, without touching it', async () => {
    const analysis = await analyzeCharacter(payload)
    const items = normalizeItems(model).map((i) => analyzeItem(i, real, analysis.defense))
    const before = JSON.stringify(items)
    const report = gearFitReport({ items, tiers: real, defensive: model.defensiveStats, skillTypes: new Set(['Attack', 'Projectile']) })
    expect(JSON.stringify(items)).toBe(before)

    expect(report.archetype).toMatchObject({ defence: 'evasion', offence: 'attack' })
    expect(report.weights.length).toBeGreaterThan(0)
    expect(report.items.length).toBe(items.filter((i) => i.active).length)
    for (const f of report.items) {
      if (f.score === null) expect(f.missing).toBeTruthy()
      else {
        expect(f.score).toBeGreaterThanOrEqual(0)
        expect(f.score).toBeLessThanOrEqual(100)
        expect(f.ceiling).toBeLessThanOrEqual(f.score + 1e-9)
      }
    }
  })

  it('is wired into analyzeCharacter as a labelled readout that feeds neither order nor grade', async () => {
    const plain = await analyzeCharacter(payload)
    expect(plain.gearFit).toBeNull()

    const withTiers = await analyzeCharacter(payload, { tiers: real })
    const fit = withTiers.gearFit
    expect(fit).not.toBeNull()
    expect(fit!.basis).toBe(GEAR_FIT_BASIS)
    expect(fit!.items.length).toBe(withTiers.items.filter((i) => i.active).length)
    // No catalog, so the main skill's types are unknown: that half is missing, not guessed.
    expect(fit!.archetype.offence).toBeNull()
    expect(fit!.archetype.missing.length).toBeGreaterThan(0)
    expect(fit!.archetype.defence).toBe('evasion')

    // GF1-2: never an input to recommendation order or the grade.
    const strip = (a: typeof withTiers) => JSON.stringify({ r: a.recommendations.recommendations.map((r) => r.id), g: a.assessment })
    const noFit = { ...withTiers, gearFit: null }
    expect(strip(noFit)).toBe(strip(withTiers))
    expect(JSON.stringify(withTiers.recommendations)).not.toMatch(/"ceiling"/)
    expect(JSON.stringify(withTiers.assessment)).not.toMatch(/gearFit|"ceiling"/)
  })
})
