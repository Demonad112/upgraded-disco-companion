/**
 * A swap is credited with the roll it guarantees, not its best roll.
 *
 * findResistanceSwaps and summarizeSwaps credited a candidate with its tier's
 * maximum, while the replacement planner (replace.ts) credits the minimum: a
 * fresh line can roll anywhere in its range. Against a 26% chaos gap a 25-27%
 * line was said to close all 26 and "1 swap covers" the gap; a 25 roll leaves
 * it open.
 */

import { describe, expect, it } from 'vitest'
import { analyzeDefense } from '../src/defense/index.js'
import { analyzeItem, findResistanceSwaps, summarizeSwaps } from '../src/gear/analyze.js'
import { ModTiers, type ModTierData } from '../src/gear/tiers.js'
import { normalizeItems } from '../src/model/slots.js'
import type { CharModel } from '../src/model/types.js'

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

const model = {
  defensiveStats: {
    fireResistance: 75, fireResistanceMax: 75, fireResistanceOverCap: 30,
    coldResistance: 75, coldResistanceMax: 75, coldResistanceOverCap: 0,
    lightningResistance: 75, lightningResistanceMax: 75, lightningResistanceOverCap: 0,
    chaosResistance: 49, chaosResistanceMax: 75, chaosResistanceOverCap: 0,
  },
  items: [
    {
      itemSlot: 8,
      itemData: {
        name: 'Ring A', typeLine: 'Test Ring', baseType: 'Test Ring', ilvl: 80, frameType: 2,
        mods: { explicit: [{ id: 'FireRes1', stats: { [FIRE]: 20 } }] },
      },
    },
  ],
} as unknown as CharModel

describe('a swap against a gap inside its roll range', () => {
  const defense = analyzeDefense(model)
  const items = normalizeItems(model).filter((i) => i.active)
  const swaps = findResistanceSwaps(items.map((i) => analyzeItem(i, tiers, defense)), items, tiers, defense)

  it('closes only the guaranteed minimum roll', () => {
    expect(swaps[0]!.candidates[0]!.closesShortfall).toBe(25)
  })

  it('does not say one swap covers the gap', () => {
    const chaos = summarizeSwaps(swaps, defense).find((s) => s.type === 'chaos')!
    expect(chaos.shortfall).toBe(26)
    expect(chaos.swapsNeeded).toBeNull()
  })
})
