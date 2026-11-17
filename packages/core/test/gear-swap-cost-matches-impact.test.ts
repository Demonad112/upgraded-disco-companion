/**
 * A gear-swap finding's cost and impact describe the same action.
 *
 * The impact is what one swap closes, but the cost counted every swap the
 * gap needs (amount 2), so the ranking divided one swap's gain by two swaps'
 * cost and nothing said so.
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
    name, typeLine: 'Test Ring', baseType: 'Test Ring', ilvl: 80, frameType: 2,
    mods: { explicit: [{ id: 'FireRes1', stats: { [FIRE]: 20 } }] },
  },
})

describe('a gear-swap finding that needs two swaps', () => {
  const model = {
    defensiveStats: {
      fireResistance: 75, fireResistanceMax: 75, fireResistanceOverCap: 40,
      coldResistance: 75, coldResistanceMax: 75, coldResistanceOverCap: 0,
      lightningResistance: 75, lightningResistanceMax: 75, lightningResistanceOverCap: 0,
      chaosResistance: 25, chaosResistanceMax: 75, chaosResistanceOverCap: 0,
    },
    items: [ring(8, 'Ring A'), ring(9, 'Ring B')],
  } as unknown as CharModel
  const swap = gearRecommendations({ items: normalizeItems(model), defense: analyzeDefense(model), tiers }).find(
    (r) => r.id === 'gear-swap-chaos',
  )!

  it('costs the one swap its impact describes', () => {
    expect(swap.detail).toContain('2 swaps of this kind cover the 50% chaos shortfall')
    expect(swap.impact!.delta).toBe(25)
    expect(swap.cost.amount).toBe(1)
  })

  it('says the whole gap takes more than this one', () => {
    expect(swap.cost.detail).toMatch(/takes 2 such recrafts/)
  })
})
