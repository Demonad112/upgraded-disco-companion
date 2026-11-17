/**
 * A counted swap whose removed roll is unknown must say so.
 *
 * The chaos finding describes Ring A and counts on Ring A and Ring B to cover
 * the gap. Ring B's removed fire roll is unknown. The multi-swap check skipped
 * the unknown roll as if removing the line cost nothing, and only the described
 * swap was checked for unknown rolls, so the finding said nothing about it.
 */

import { describe, expect, it, vi } from 'vitest'

vi.mock('../src/gear/analyze.js', async (importOriginal) => {
  const real = await importOriginal<typeof import('../src/gear/analyze.js')>()
  return {
    ...real,
    findResistanceSwaps: (...args: Parameters<typeof real.findResistanceSwaps>) =>
      real
        .findResistanceSwaps(...args)
        .map((s) =>
          s.itemName === 'Ring B' ? { ...s, removes: s.removes.map((r) => ({ ...r, value: null })) } : s,
        ),
  }
})

const { analyzeDefense } = await import('../src/defense/index.js')
const { ModTiers } = await import('../src/gear/tiers.js')
const { normalizeItems } = await import('../src/model/slots.js')
const { gearRecommendations } = await import('../src/recommend/gear.js')
type CharModel = import('../src/model/types.js').CharModel

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
})

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

describe('a counted swap with an unknown removed roll', () => {
  it('says the check leaves out what that swap costs', () => {
    const model = {
      defensiveStats: {
        fireResistance: 75, fireResistanceMax: 75, fireResistanceOverCap: 30,
        coldResistance: 75, coldResistanceMax: 75, coldResistanceOverCap: 0,
        lightningResistance: 75, lightningResistanceMax: 75, lightningResistanceOverCap: 0,
        chaosResistance: 25, chaosResistanceMax: 75, chaosResistanceOverCap: 0,
      },
      items: [ring(8, 'Ring A'), ring(9, 'Ring B')],
    } as unknown as CharModel
    const recs = gearRecommendations({ items: normalizeItems(model), defense: analyzeDefense(model), tiers })
    const swap = recs.find((r) => r.id === 'gear-swap-chaos')!
    expect(swap.action).toContain('Ring A')
    expect(swap.detail).toContain('2 swaps of this kind cover the 50% chaos shortfall')
    expect(swap.tradeoff ?? '').toContain('is not known')
  })
})
