/**
 * A recraft finding that counts on several swaps must check all of them.
 *
 * Each wasted resistance line is judged alone against the overcap. Fire is 30%
 * over cap and two rings each carry a 20% fire suffix, so each line alone is
 * "wasted". The chaos finding then says two such swaps cover the 50% chaos gap.
 * Taking both removes 40% fire from a 30% overcap: fire ends 10% under its cap.
 * The constraint check looked at one swap only (105 to 85, fine) and said
 * nothing.
 */

import { describe, expect, it } from 'vitest'
import { analyzeDefense } from '../src/defense/index.js'
import { ModTiers, type ModTierData } from '../src/gear/tiers.js'
import { normalizeItems } from '../src/model/slots.js'
import type { CharModel } from '../src/model/types.js'
import { gearRecommendations } from '../src/recommend/gear.js'

const FIRE = 'base_fire_damage_resistance_%'
const CHAOS = 'base_chaos_damage_resistance_%'

const tiers = new ModTiers({
  version: 1,
  generatedFrom: ['inline test data'],
  note: '',
  baseTags: { 'Test Ring': ['ring'] },
  baseClass: { 'Test Ring': 'Ring' },
  mods: {
    FireRes1: { g: 'FireResistance', t: 's', lvl: 1, name: 'of Fire', stats: [[FIRE, 16, 20]], text: '+(16-20)% to Fire Resistance', spawn: [['ring', 1]] },
    ChaosRes1: { g: 'ChaosResistance', t: 's', lvl: 1, name: 'of Chaos', stats: [[CHAOS, 25, 27]], text: '+(25-27)% to Chaos Resistance', spawn: [['ring', 1]] },
  },
} satisfies ModTierData)

const ring = (itemSlot: number, name: string) => ({
  itemSlot,
  itemData: {
    name,
    typeLine: 'Test Ring',
    baseType: 'Test Ring',
    ilvl: 80,
    frameType: 2,
    mods: { explicit: [{ id: 'FireRes1', stats: { [FIRE]: 20 } }] },
  },
})

const build = (fireOverCap: number) => {
  const model = {
    defensiveStats: {
      fireResistance: 75,
      fireResistanceMax: 75,
      fireResistanceOverCap: fireOverCap,
      coldResistance: 75,
      coldResistanceMax: 75,
      coldResistanceOverCap: 0,
      lightningResistance: 75,
      lightningResistanceMax: 75,
      lightningResistanceOverCap: 0,
      chaosResistance: 25,
      chaosResistanceMax: 75,
      chaosResistanceOverCap: 0,
    },
    items: [ring(8, 'Ring A'), ring(9, 'Ring B')],
  } as unknown as CharModel
  const recs = gearRecommendations({ items: normalizeItems(model), defense: analyzeDefense(model), tiers })
  return recs.find((r) => r.id === 'gear-swap-chaos')!
}

describe('a recraft finding that counts on several swaps', () => {
  it('counts on two swaps to cover the chaos gap', () => {
    const swap = build(30)
    expect(swap).toBeDefined()
    expect(swap.detail).toContain('2 swaps of this kind cover the 50% chaos shortfall')
  })

  it('says when those swaps together take fire below its cap', () => {
    // 75 + 30 over cap = 105. Two 20% lines gone leaves 65, 10 under the cap.
    const swap = build(30)
    expect(swap.tradeoff).toContain('Constraint check')
    expect(swap.tradeoff).toMatch(/fire resistance from 105 to 65, below the 75 floor/)
    expect(swap.tradeoff).not.toContain('smaller than the number suggests')
  })

  it('stays quiet when the overcap covers every swap it counts on', () => {
    // 75 + 40 = 115. Both lines gone leaves 75: still at the cap.
    const swap = build(40)
    expect(swap.detail).toContain('2 swaps of this kind')
    expect(swap.tradeoff ?? '').not.toContain('Constraint check')
  })
})
