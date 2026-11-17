/**
 * The multi-swap check must include the swap the finding describes.
 *
 * The chaos finding describes the swap with the most waste: Ring A's 25% fire
 * line. Ring A's item level only reaches the 22-25% chaos tier; Rings B and C
 * reach 25-27%. The check picked the counted swaps by candidate maximum, so it
 * checked B and C (fire 115 to 75, fine) and never A. Taking A and one other,
 * as the finding says, removes 45% fire from a 40% overcap: 115 to 70.
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
    FireResA: { g: 'FireResistance', t: 's', lvl: 1, name: 'of Fire', stats: [[FIRE, 16, 25]], text: '+(16-25)% to Fire Resistance', spawn: [['ring', 1]] },
    FireResB: { g: 'FireResistance', t: 's', lvl: 1, name: 'of Embers', stats: [[FIRE, 16, 25]], text: '+(16-25)% to Fire Resistance', spawn: [['ring', 1]] },
    ChaosRes1: { g: 'ChaosResistanceMinor', t: 's', lvl: 1, name: 'of Chaos', stats: [[CHAOS, 22, 25]], text: '+(22-25)% to Chaos Resistance', spawn: [['ring', 1]] },
    ChaosRes2: { g: 'ChaosResistance', t: 's', lvl: 60, name: 'of the Void', stats: [[CHAOS, 25, 27]], text: '+(25-27)% to Chaos Resistance', spawn: [['ring', 1]] },
  },
} satisfies ModTierData)

const ring = (itemSlot: number, name: string, ilvl: number, mod: string, fire: number) => ({
  itemSlot,
  itemData: {
    name,
    typeLine: 'Test Ring',
    baseType: 'Test Ring',
    ilvl,
    frameType: 2,
    mods: { explicit: [{ id: mod, stats: { [FIRE]: fire } }] },
  },
})

describe('the multi-swap check and the swap it describes', () => {
  it('checks the described swap among the ones it counts on', () => {
    const model = {
      defensiveStats: {
        fireResistance: 75, fireResistanceMax: 75, fireResistanceOverCap: 40,
        coldResistance: 75, coldResistanceMax: 75, coldResistanceOverCap: 0,
        lightningResistance: 75, lightningResistanceMax: 75, lightningResistanceOverCap: 0,
        chaosResistance: 25, chaosResistanceMax: 75, chaosResistanceOverCap: 0,
      },
      // Two ring slots plus the amulet slot; the tier data treats all three as rings.
      items: [ring(8, 'Ring A', 50, 'FireResA', 25), ring(9, 'Ring B', 80, 'FireResB', 20), ring(4, 'Ring C', 80, 'FireResB', 20)],
    } as unknown as CharModel
    const recs = gearRecommendations({ items: normalizeItems(model), defense: analyzeDefense(model), tiers })
    const swap = recs.find((r) => r.id === 'gear-swap-chaos')!
    expect(swap.action).toContain('Ring A')
    expect(swap.detail).toContain('2 swaps of this kind cover the 50% chaos shortfall')
    expect(swap.tradeoff ?? '').toMatch(/fire resistance from 115 to 70, below the 75 floor/)
  })
})
