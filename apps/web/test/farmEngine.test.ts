import { describe, expect, it } from 'vitest'
import { farmData as d } from '@/data/farm'
import { computeTotals, effectScalars } from '@/lib/farm/totals'
import { validate, legalMods, roomOn } from '@/lib/farm/rules'
import { formatChange, pctChange, presetFor, scoreLoadout, dangerWeight } from '@/lib/farm/score'
import { allSwaps, applySwap, bestSwaps, netLabels } from '@/lib/farm/swaps'
import { starterLoadout } from '@/lib/farm/starter'
import { layersFromSnapshot } from '@/lib/farm/danger'
import type { Loadout, ModPick, Tablet } from '@/lib/farm/types'

const m = (modId: string, value: number): ModPick => ({ modId, tier: 1, value })
const opts = { presetId: 'general', risk: 'balanced' as const, layers: null }
const base = (over: Partial<Loadout> = {}): Loadout => ({
  strategyId: 'x',
  tablets: [{ type: 'irradiated', rarity: 'rare', prefixes: [], suffixes: [] }],
  waystone: { tier: 15, rarity: 'rare', corrupted: false, prefixes: [], suffixes: [] },
  options: { mapContext: 'standard', keystones: false, effects: [] },
  ...over,
})
const tab = (rarity: 'magic' | 'rare', prefixes: ModPick[], suffixes: ModPick[], type = 'irradiated'): Tablet => ({ type, rarity, prefixes, suffixes })

describe('rules', () => {
  it('magic tablets: 1 prefix + 1 suffix', () => {
    const l = base({ tablets: [tab('magic', [m('t-pack-size', 5), m('t-item-rarity', 8)], [m('t-rare-monsters', 30), m('t-magic-monsters', 31)])] })
    expect(validate(d, l)).toEqual(['Tablet 1: Magic tablets have 1 prefix', 'Tablet 1: Magic tablets have 1 suffix'])
  })
  it('rare tablets: 2+2 only with both keystones, 3 otherwise', () => {
    const four = tab('rare', [m('t-pack-size', 5), m('t-item-rarity', 8)], [m('t-rare-monsters', 30), m('t-magic-monsters', 31)])
    expect(validate(d, base({ tablets: [four] }))).toEqual(['Tablet 1: Rare tablets have 3 modifiers at most'])
    expect(validate(d, base({ tablets: [four], options: { mapContext: 'standard', keystones: true, effects: [] } }))).toEqual([])
    expect(validate(d, base({ tablets: [tab('rare', [m('t-pack-size', 5), m('t-item-rarity', 8), m('t-item-quantity', 4)], [])] }))).toEqual(['Tablet 1: Rare tablets have 2 prefixes'])
  })
  it('a rare tablet takes a 2nd prefix, a magic one does not', () => {
    const rare = tab('rare', [m('t-pack-size', 5)], [])
    const magic = tab('magic', [m('t-pack-size', 5)], [])
    const s = (t: Tablet) => ({ kind: 'tablet' as const, tablet: t })
    expect(roomOn(d, s(rare), 'prefix', false)).toBe(1)
    expect(roomOn(d, s(magic), 'prefix', false)).toBe(0)
  })
  it('no duplicate modGroup; replacing a mod frees its own group', () => {
    const t = tab('rare', [m('t-pack-size', 5)], [])
    const ids = legalMods(d, { kind: 'tablet', tablet: t }, 'prefix').map((x) => x.id)
    expect(ids).not.toContain('t-pack-size')
    expect(legalMods(d, { kind: 'tablet', tablet: t }, 'prefix', t.prefixes[0]).map((x) => x.id)).toContain('t-pack-size')
    expect(validate(d, base({ tablets: [tab('rare', [m('t-pack-size', 5), m('t-pack-size', 6)], [])] }))).toContain('Tablet 1: two modifiers of group MapPackSizeIncrease')
  })
  it('mechanic mods only roll on their tablet type', () => {
    const ids = (type: string) => legalMods(d, { kind: 'tablet', tablet: tab('rare', [], [], type) }, 'suffix').map((x) => x.id)
    expect(ids('abyss')).toContain('t-abyss-rares')
    expect(ids('breach')).not.toContain('t-abyss-rares')
    expect(validate(d, base({ tablets: [tab('rare', [], [m('t-abyss-rares', 2)], 'breach')] }))[0]).toMatch(/does not roll on breach/)
  })
  it('range, tablet count and city-only passives', () => {
    expect(validate(d, base({ tablets: [tab('rare', [m('t-pack-size', 99)], [])] }))[0]).toMatch(/outside 5–7/)
    const four = Array.from({ length: 4 }, () => tab('rare', [], []))
    expect(validate(d, base({ tablets: four }))).toEqual(['At most 3 tablets can affect this map'])
    expect(validate(d, base({ tablets: four, options: { mapContext: 'city', keystones: false, effects: [] } }))).toEqual([])
    expect(validate(d, base({ options: { mapContext: 'standard', keystones: false, effects: ['city-tablet-effect'] } }))).toEqual(['city-tablet-effect applies on City maps only'])
  })
  it('Waystone caps: 6 rare, 10 corrupted, tier 16 is corrupted', () => {
    const w = (n: number, corrupted: boolean, tier = 15) => {
      const pre = ['w-quantity', 'w-pack-size', 'w-rare-monsters', 'w-magic-monsters', 'w-rarity'].slice(0, Math.min(n, 5))
      const suf = ['w-extra-fire', 'w-extra-cold', 'w-extra-lightning', 'w-extra-chaos', 'w-less-recovery'].slice(0, Math.max(0, n - 5))
      const pick = (id: string) => m(id, d.waystoneMods.find((x) => x.id === id)!.tiers[0]!.min)
      return base({ waystone: { tier, rarity: 'rare', corrupted, prefixes: pre.map(pick), suffixes: suf.map(pick) } })
    }
    expect(validate(d, w(6, false))[0]).toMatch(/Rare Waystones have 3 prefixes/)
    expect(validate(d, w(10, true))).toEqual([])
    expect(validate(d, w(10, false, 16))).toEqual([])
    expect(validate(d, w(10, false, 15)).length).toBeGreaterThan(0)
  })
})

describe('totals', () => {
  it('add sums, scaled by the ticked tablet effect only', () => {
    const l = base({ tablets: [tab('rare', [m('t-pack-size', 6)], []), tab('rare', [m('t-pack-size', 4)], [])] })
    expect(computeTotals(d, l)['map_pack_size_+%']!.total).toBe(10)
    const on = { ...l, options: { ...l.options, effects: ['tablet-effect-gateway', 'controlled-climates'] } }
    expect(effectScalars(d, on).tablet).toBeCloseTo(1 + (35 + 10) / 100)
    expect(computeTotals(d, on)['map_pack_size_+%']!.total).toBeCloseTo(14.5, 4)
  })
  it('multiply: Π(1 + v/100) − 1', () => {
    const l = base({ waystone: { tier: 15, rarity: 'rare', corrupted: false, prefixes: [], suffixes: [m('w-less-recovery', 20)] } })
    expect(computeTotals(d, l)['player_recovery_rate_-%']!.total).toBe(20)
    const two = structuredClone(d)
    two.stats.find((s) => s.id === 'map_pack_size_+%')!.combine = 'multiply'
    const l2 = base({ tablets: [tab('rare', [m('t-pack-size', 10)], []), tab('rare', [m('t-pack-size', 10)], [])] })
    expect(computeTotals(two, l2)['map_pack_size_+%']!.total).toBeCloseTo(21, 4)
  })
  it('flag counts occurrences and ignores the roll', () => {
    const l = base({ tablets: [tab('rare', [], [m('t-ovs-hunted', 1)], 'overseer'), tab('rare', [], [m('t-ovs-hunted', 1)], 'overseer')], options: { mapContext: 'standard', keystones: false, effects: ['tablet-effect-gateway'] } })
    expect(computeTotals(d, l).boss_azmeri_possessed!.total).toBe(2)
  })
  it('keeps sources per stat', () => {
    const l = base({ tablets: [tab('rare', [m('t-item-rarity', 10)], [])], waystone: { tier: 15, rarity: 'rare', corrupted: false, prefixes: [m('w-rarity', 120)], suffixes: [] } })
    expect(computeTotals(d, l)['map_item_rarity_+%']!.sources).toEqual([{ from: 'Tablet 1', value: 10 }, { from: 'Waystone', value: 120 }])
  })
})

describe('fixtures from the fact-check', () => {
  for (const f of d.fixtures) {
    it(f.name, () => {
      const totals = computeTotals(d, f.loadout)
      for (const [stat, want] of Object.entries(f.expectedTotals)) expect(totals[stat]!.total, stat).toBeCloseTo(want, 2)
      expect(validate(d, f.loadout)).toHaveLength(f.expectedErrors)
      const o = { presetId: f.preset, risk: 'balanced' as const, layers: null }
      expect(allSwaps(d, f.loadout, o).length).toBeGreaterThan(0)
    })
  }
  it('there are five', () => expect(d.fixtures).toHaveLength(5))
})

describe('score', () => {
  it('pctChange edge cases', () => {
    expect(pctChange(0, 5)).toEqual({ kind: 'new' })
    expect(pctChange(0, 0)).toEqual({ kind: 'none' })
    expect(pctChange(100, 112)).toEqual({ kind: 'pct', pct: 12 })
    expect(pctChange(-50, -25)).toEqual({ kind: 'pct', pct: 50 }) // negative net improving is up
    expect(pctChange(-50, -75)).toEqual({ kind: 'pct', pct: -50 })
    expect(pctChange(10, -10)).toEqual({ kind: 'pct', pct: -200 }) // sign flip
    expect(formatChange(pctChange(100, 118))).toBe('▲ +18%')
    expect(formatChange(pctChange(100, 90))).toBe('▼ −10%')
    expect(formatChange(pctChange(0, 3))).toBe('▲ new')
    expect(formatChange(pctChange(7, 7))).toBe('no change')
  })
  it('reward uses preset weights; danger scales with the risk setting', () => {
    const l = base({ waystone: { tier: 15, rarity: 'rare', corrupted: false, prefixes: [m('w-quantity', 28)], suffixes: [m('w-extra-fire', 38)] } })
    const safe = scoreLoadout(d, l, { ...opts, risk: 'safe' })
    const greedy = scoreLoadout(d, l, { ...opts, risk: 'greedy' })
    expect(safe.reward).toBeCloseTo(28 * 1.5)
    expect(safe.danger).toBeGreaterThan(0)
    expect(greedy.net).toBeGreaterThan(safe.net)
  })
  it('a stat without a preset weight adds nothing; unknown strategy falls back to general', () => {
    const l = base({ tablets: [tab('rare', [], [m('t-gold', 30)])] })
    expect(scoreLoadout(d, l, opts).reward).toBe(0)
    expect(presetFor(d, 'no-such')).toEqual({ id: 'general', fallback: true })
    expect(presetFor(d, 'abyss-amanamu')).toEqual({ id: 'abyss', fallback: false })
  })
  it('build-aware danger uses only the layers the build relies on', () => {
    const r = d.weights.danger.per_stat['monster_damage_extra_fire']!
    const mult = d.weights.danger.build_multipliers
    expect(dangerWeight(r, null, mult)).toBe(r.generic)
    expect(dangerWeight(r, ['armour'], mult)).toBe(3)
    expect(dangerWeight(r, ['es', 'evasion'], mult)).toBe(2)
    expect(layersFromSnapshot(d, { energyShield: 6000, armour: 200, evasion: 100 })).toEqual(['es'])
    expect(layersFromSnapshot(d, { energyShield: null, armour: 4000, evasion: 3000 })).toEqual(['armour', 'evasion'])
    expect(layersFromSnapshot(d, { energyShield: null, armour: 0, evasion: 0 })).toBeNull()
    expect(layersFromSnapshot(d, null)).toBeNull()
    // R37: mana (Mind Over Matter) and recovery (gear leech) from the snapshot flags; older rows lack them.
    expect(layersFromSnapshot(d, { energyShield: 6000, armour: 200, evasion: 100, manaBeforeLife: true, gearLeech: true })).toEqual(['es', 'mana', 'recovery'])
    expect(layersFromSnapshot(d, { energyShield: null, armour: 0, evasion: 0, gearLeech: true })).toEqual(['recovery'])
    expect(layersFromSnapshot(d, { energyShield: 6000, armour: 0, evasion: 0, manaBeforeLife: false })).toEqual(['es'])
  })
})

describe('swaps', () => {
  const o = { presetId: 'general', risk: 'balanced' as const, layers: null }
  const loaded = (): Loadout => starterLoadout(d, 'x', 'general', o, 2)
  it('the starter loadout is legal and non-empty', () => {
    const l = loaded()
    expect(validate(d, l)).toEqual([])
    expect(l.tablets[0]!.prefixes.length + l.tablets[0]!.suffixes.length).toBeGreaterThan(0)
    expect(l.waystone.prefixes.length + l.waystone.suffixes.length).toBeGreaterThan(0)
  })
  it('the best swap, once applied, raises Net, and it stays legal', () => {
    const l: Loadout = { ...loaded(), tablets: [tab('rare', [m('t-gold', 0)].slice(0, 0), [m('t-gold', 30)])] }
    const before = scoreLoadout(d, l, o).net
    const [best] = bestSwaps(d, l, o, 3)
    expect(best).toBeDefined()
    const next = applySwap(l, best!)
    expect(scoreLoadout(d, next, o).net).toBeGreaterThan(before)
    expect(validate(d, next)).toEqual([])
  })
  it('is deterministic: same input, same order, ties broken by tablet, side, mod id', () => {
    const l = loaded()
    const a = allSwaps(d, l, o).map((s) => `${s.target.index}${s.target.side}${s.target.slot}${s.to.modId}`)
    const b = allSwaps(structuredClone(d), structuredClone(l), o).map((s) => `${s.target.index}${s.target.side}${s.target.slot}${s.to.modId}`)
    expect(a).toEqual(b)
    const tied = allSwaps(d, base({ tablets: [tab('rare', [], []), tab('rare', [], [])] }), { ...o, presetId: 'nonexistent' })
    // every delta is 0 with no weights: pure tie-break order
    expect(tied[0]!.target.index).toBe(0)
    expect(tied[0]!.target.side).toBe('prefix')
    const idsAtFirst = tied.filter((s) => s.netDelta === 0 && s.target.index === 0 && s.target.side === 'prefix').map((s) => s.to.modId)
    expect(idsAtFirst).toEqual([...idsAtFirst].sort())
  })
  it('a value keeps its relative position in the new range', () => {
    const l = base({ tablets: [tab('rare', [m('t-item-rarity', 12)], [])] }) // top of 8–12
    const s = allSwaps(d, l, o).find((x) => x.to.modId === 't-pack-size' && x.from)!
    expect(s.to.value).toBe(7) // top of 5–7
  })
  it('picker labels cover exactly the legal mods', () => {
    const l = loaded()
    const labels = netLabels(d, l, o, { index: 0, side: 'suffix', slot: 0 })
    const legal = legalMods(d, { kind: 'tablet', tablet: l.tablets[0]! }, 'suffix', l.tablets[0]!.suffixes[0]).map((x) => x.id)
    expect([...labels.keys()].sort()).toEqual([...legal].sort())
  })
  it('stays under 30 ms for 4 rare tablets and a 6-mod Waystone', () => {
    const l: Loadout = { ...loaded(), options: { mapContext: 'city', keystones: true, effects: [] } }
    const full: Loadout = {
      ...l,
      tablets: Array.from({ length: 4 }, () => tab('rare', [m('t-pack-size', 6), m('t-item-rarity', 10)], [m('t-rare-monsters', 30), m('t-magic-monsters', 35)])),
      waystone: { tier: 15, rarity: 'rare', corrupted: false, prefixes: [m('w-quantity', 28), m('w-pack-size', 45), m('w-rare-monsters', 60)], suffixes: [m('w-extra-fire', 38), m('w-extra-chaos', 25), m('w-less-recovery', 25)] },
    }
    allSwaps(d, full, o) // warm up
    const t0 = performance.now()
    const n = allSwaps(d, full, o).length
    const ms = performance.now() - t0
    expect(n).toBeGreaterThan(100)
    expect(ms).toBeLessThan(30)
  })
})

import { removePick, setMapContext, setTabletRarity, setTabletType, setWaystone } from '@/lib/farm/edit'
describe('edit helpers', () => {
  const full = (): Loadout => ({
    ...base({ tablets: [tab('rare', [m('t-pack-size', 5), m('t-item-rarity', 8)], [m('t-rare-monsters', 30), m('t-magic-monsters', 31)])] }),
    options: { mapContext: 'standard', keystones: true, effects: [] },
  })
  it('rare → magic trims to 1 + 1', () => {
    const t = setTabletRarity(d, full(), 0, 'magic').tablets[0]!
    expect([t.prefixes.length, t.suffixes.length]).toEqual([1, 1])
    expect(validate(d, setTabletRarity(d, full(), 0, 'magic'))).toEqual([])
  })
  it('changing tablet type drops mods that do not roll there', () => {
    const l = { ...full(), tablets: [tab('rare', [], [m('t-abyss-rares', 2), m('t-rare-monsters', 30)], 'abyss')] }
    expect(setTabletType(l, 0, 'breach').tablets[0]!.suffixes.map((x) => x.modId)).toEqual(['t-rare-monsters'])
  })
  it('Waystone tier 16 keeps up to 10; dropping to a plain rare trims to 6', () => {
    const pick = (id: string) => m(id, d.waystoneMods.find((x) => x.id === id)!.tiers[0]!.min)
    const l = base({ waystone: { tier: 16, rarity: 'rare', corrupted: true, prefixes: ['w-quantity', 'w-pack-size', 'w-rare-monsters', 'w-magic-monsters', 'w-rarity'].map(pick), suffixes: ['w-extra-fire', 'w-extra-cold', 'w-extra-lightning', 'w-extra-chaos', 'w-less-recovery'].map(pick) } })
    expect(validate(d, l)).toEqual([])
    const down = setWaystone(d, l, { tier: 15, corrupted: false })
    expect(down.waystone.prefixes.length + down.waystone.suffixes.length).toBe(6)
    expect(validate(d, down)).toEqual([])
  })
  it('leaving City drops the City passive; removePick removes one mod', () => {
    const l = { ...full(), options: { mapContext: 'city' as const, keystones: true, effects: ['city-tablet-effect', 'tablet-effect-gateway'] } }
    expect(setMapContext(l, 'standard').options.effects).toEqual(['tablet-effect-gateway'])
    expect(removePick(full(), { index: 0, side: 'suffix', slot: 0 }).tablets[0]!.suffixes.map((x) => x.modId)).toEqual(['t-magic-monsters'])
  })
})
