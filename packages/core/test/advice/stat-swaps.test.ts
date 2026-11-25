/**
 * Batch 2.2: stat swaps (`advice/swaps.ts`). A line the gear score lists as wasted becomes "this line could be X",
 * where X is an affix of the same kind the slot can roll and the profile values.
 */

import { describe, expect, it } from 'vitest'
import { findStatSwaps } from '../../src/advice/swaps.js'
import { scoreGear } from '../../src/gear/score.js'
import type { ItemAnalysis } from '../../src/gear/analyze.js'
import type { ResistanceState } from '../../src/defense/index.js'
import { fixtureTiers, resistances, ringItem } from '../helpers/score-fixture.js'

const defensive = { life: 1500, energyShield: 2800, armour: 75, evasionRating: 7400 }
const attack = new Set(['Attack'])

function swaps(items: ItemAnalysis[], res: ResistanceState[]) {
  const report = scoreGear({ items, tiers: fixtureTiers, defensive, skillTypes: attack, resistances: res })
  return findStatSwaps({ report, items, tiers: fixtureTiers, resistances: res })
}

const coldRing = (opts: { itemLevel?: number; corrupted?: boolean } = {}) =>
  ringItem(1, 'Ring 1', [
    { id: 'Life1', stats: { base_maximum_life: 95 } },
    { id: 'Cold1', stats: { 'base_cold_damage_resistance_%': 45 } },
    { id: 'Atk1', stats: { 'attack_speed_+%': 8 } },
  ], opts)

describe('findStatSwaps', () => {
  it('turns a wholly over-cap resistance line into a short resistance first, then a valued stat, same affix kind', () => {
    const [s] = swaps([coldRing()], resistances({ cold: { over: 50 }, chaos: { value: 55 } }))
    expect(s).toMatchObject({ slotLabel: 'Ring 1', kind: 'over-cap', line: { modId: 'Cold1', value: 45, wasted: 45 }, belowCapAfter: [] })
    expect(s!.candidates[0]).toMatchObject({ modId: 'Chaos1', affix: 'of Order', tier: 1, reachableOnThisItem: true, closes: { type: 'chaos', points: 20 } })
    // Never a resistance that is already capped, never a stat the item already has, never a prefix for a suffix.
    const ids = s!.candidates.map((c) => c.modId)
    expect(ids).not.toContain('Fire1')
    expect(ids).not.toContain('Atk1')
    expect(ids).not.toContain('Cast1')
    expect(ids).not.toContain('Life1')
    expect(ids).toContain('EvaMove1')
    expect(s!.sentence).toMatch(/^Ring 1: 45% cold resistance on this line is over the cap\. It could be \+\(23-27\)% to Chaos Resistance \(of Order, tier 1\) instead\./)
  })

  it('says how far below the cap a partly wasted line would leave the resistance', () => {
    const [s] = swaps([coldRing()], resistances({ cold: { over: 30 }, chaos: { value: 55 } }))
    expect(s!.belowCapAfter).toEqual([{ type: 'cold', points: 15 }])
    expect(s!.sentence).toMatch(/drops cold resistance 15% below the cap/)
  })

  it('offers no swap for a line mostly needed to hold the cap', () => {
    // 10 of 45 is waste: removing the line would leave cold 35% short to gain 10%.
    expect(swaps([coldRing()], resistances({ cold: { over: 10 }, chaos: { value: 55 } }))).toEqual([])
  })

  it('offers the best tier the item’s level allows, and says when a better one needs a new base', () => {
    const [s] = swaps([coldRing({ itemLevel: 75 })], resistances({ cold: { over: 50 }, chaos: { value: 55 } }))
    expect(s!.candidates[0]).toMatchObject({ modId: 'Chaos2', tier: 2, reachableOnThisItem: true, betterOnNewBase: { modId: 'Chaos1', tier: 1, ilvl: 80 } })
  })

  it('turns a stat the build does not use into a valued one', () => {
    const ring = ringItem(1, 'Ring 1', [{ id: 'Cast1', stats: { 'base_cast_speed_+%': 16 } }])
    const [s] = swaps([ring], resistances({}))
    expect(s).toMatchObject({ kind: 'off-profile', line: { modId: 'Cast1' } })
    expect(s!.candidates.map((c) => c.modId)).toEqual(expect.arrayContaining(['Atk1']))
  })

  it('says a corrupted item needs replacing', () => {
    const [s] = swaps([coldRing({ corrupted: true })], resistances({ cold: { over: 50 } }))
    expect(s!.cost).toMatch(/corrupted/)
  })
})
