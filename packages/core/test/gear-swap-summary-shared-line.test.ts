/**
 * summarizeSwaps counts one swap twice.
 *
 * Each shortfall is summarised on its own, so one wasted line that could be
 * recrafted into cold OR lightning is counted as "1 swap covers" for both.
 * The recommendations already fold that into one choice (mergeSameLineSwaps);
 * this pins it. The raw summary (`summarizeSwaps`) still counts the line
 * once per stat: see REMAINING-WORK.
 */

import { describe, expect, it } from 'vitest'
import { analyzeDefense } from '../src/defense/index.js'
import { analyzeItem, findResistanceSwaps, summarizeSwaps } from '../src/gear/analyze.js'
import { ModTiers, type ModTierData } from '../src/gear/tiers.js'
import { normalizeItems } from '../src/model/slots.js'
import { gearRecommendations } from '../src/recommend/gear.js'
import type { CharModel } from '../src/model/types.js'

const FIRE = 'base_fire_damage_resistance_%'
const COLD = 'base_cold_damage_resistance_%'
const LIGHTNING = 'base_lightning_damage_resistance_%'

const data = {
  version: 1,
  generatedFrom: ['inline test data'],
  note: '',
  baseTags: { 'Test Ring': ['ring'] },
  baseClass: { 'Test Ring': 'Ring' },
  mods: {
    FireRes1: { g: 'FireResistance', t: 's', lvl: 1, name: 'of Fire', stats: [[FIRE, 16, 20]], text: '+(16-20)% to Fire Resistance', spawn: [['ring', 1]] },
    ColdRes1: { g: 'ColdResistance', t: 's', lvl: 1, name: 'of Cold', stats: [[COLD, 25, 27]], text: '+(25-27)% to Cold Resistance', spawn: [['ring', 1]] },
    LightningRes1: { g: 'LightningResistance', t: 's', lvl: 1, name: 'of Lightning', stats: [[LIGHTNING, 25, 27]], text: '+(25-27)% to Lightning Resistance', spawn: [['ring', 1]] },
  },
} satisfies ModTierData
const tiers = new ModTiers(data)

const model = {
  defensiveStats: {
    fireResistance: 75, fireResistanceMax: 75, fireResistanceOverCap: 30,
    coldResistance: 60, coldResistanceMax: 75, coldResistanceOverCap: 0,
    lightningResistance: 60, lightningResistanceMax: 75, lightningResistanceOverCap: 0,
    chaosResistance: 75, chaosResistanceMax: 75, chaosResistanceOverCap: 0,
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

describe('one wasted line that two shortfalls could use', () => {
  const defense = analyzeDefense(model)
  const items = normalizeItems(model).filter((i) => i.active)
  const swaps = findResistanceSwaps(items.map((i) => analyzeItem(i, tiers, defense)), items, tiers, defense)

  it('has one swap to offer', () => {
    expect(swaps).toHaveLength(1)
  })

  it('presents the line as one choice in the recommendations', () => {
    const recs = gearRecommendations({ items: normalizeItems(model), defense, tiers })
    const onLine = recs.filter((r) => r.id.startsWith('gear-swap-'))
    expect(onLine).toHaveLength(1)
    expect(onLine[0]!.action).toContain('one line, so it is one choice')
    expect(onLine[0]!.action).toMatch(/cold 60% → 75%.*; or .*lightning 60% → 75%/)
  })
})
