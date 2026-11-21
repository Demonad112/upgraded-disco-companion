/** Compare-target choice (GF1 plan item 5). Synthetic base data so every branch is checkable. */

import { describe, expect, it } from 'vitest'
import { ModTiers, type ModTierData } from '../src/gear/tiers.js'
import { compareTarget } from '../src/gear/compare-target.js'

const data: ModTierData = {
  version: 1,
  generatedFrom: [],
  note: 'test',
  baseTags: { Ring: ['ring'], Hat: ['helmet'], Bow: ['bow', 'twohand'], Wand: ['wand'], Buckler: ['shield'], Mystery: [] },
  baseClass: { Ring: 'Ring', Hat: 'Helmet', Bow: 'Bow', Wand: 'Wand', Buckler: 'Buckler', Mystery: 'Gizmo' },
  mods: {},
}
const tiers = new ModTiers(data)
const eq = (slotId: number, name: string, baseType: string, active = true) => ({ slotId, slotLabel: `Slot ${slotId}`, name, baseType, active })
const run = (candidate: { name: string; baseType: string }, equipped: ReturnType<typeof eq>[], extra = {}) => compareTarget({ candidate, equipped, tiers, ...extra })

describe('compareTarget', () => {
  it('labels an item already worn instead of comparing it with itself', () => {
    expect(run({ name: 'Doom Loop', baseType: 'Ring' }, [eq(8, 'Doom Loop', 'Ring')])).toMatchObject({ kind: 'already-equipped', slotIds: [] })
    // Same name in the inactive set is not "worn".
    expect(run({ name: 'W', baseType: 'Wand' }, [eq(15, 'W', 'Wand', false)]).kind).toBe('empty-slot')
  })

  it('reports unknown bases and classes rather than guessing a slot', () => {
    expect(run({ name: 'x', baseType: 'Nope' }, []).note).toMatch(/not in the base data/)
    expect(run({ name: 'x', baseType: 'Mystery' }, []).note).toMatch(/no equipped slot is known for Gizmo/)
  })

  it('prefers an empty ring slot, then the weaker ring by Gear fit', () => {
    expect(run({ name: 'n', baseType: 'Ring' }, [eq(8, 'A', 'Ring')])).toMatchObject({ kind: 'empty-slot', slotIds: [9] })
    const both = [eq(8, 'A', 'Ring'), eq(9, 'B', 'Ring')]
    const weak = run({ name: 'n', baseType: 'Ring' }, both, { fits: [{ slotId: 8, score: 70 }, { slotId: 9, score: 40 }] })
    expect(weak).toMatchObject({ kind: 'replace', slotIds: [9] })
    expect(weak.note).toMatch(/40/)
  })

  it('offers both rings and says why when a fit score is missing', () => {
    const both = [eq(8, 'A', 'Ring'), eq(9, 'B', 'Ring')]
    for (const fits of [undefined, [{ slotId: 8, score: 70 }, { slotId: 9, score: null }]]) {
      const t = run({ name: 'n', baseType: 'Ring' }, both, { fits })
      expect(t.slotIds).toEqual([8, 9])
      expect(t.note).toMatch(/Can't name the weaker ring/)
    }
  })

  it('compares a single-slot item with what is worn', () => {
    expect(run({ name: 'n', baseType: 'Hat' }, [eq(1, 'Old Hat', 'Hat')])).toMatchObject({ kind: 'replace', slotIds: [1] })
    expect(run({ name: 'n', baseType: 'Hat' }, [])).toMatchObject({ kind: 'empty-slot', slotIds: [1] })
  })

  it('compares a two-hander with main hand and off hand together, in the active set', () => {
    expect(run({ name: 'n', baseType: 'Bow' }, [])).toMatchObject({ kind: 'replace-pair', slotIds: [7, 6] })
    expect(run({ name: 'n', baseType: 'Bow' }, [], { weaponSet: 2 }).slotIds).toEqual([15, 16])
  })

  it('handles one-handers and off hands, including one held back by a two-hander', () => {
    expect(run({ name: 'n', baseType: 'Wand' }, [eq(7, 'Old Wand', 'Wand')])).toMatchObject({ kind: 'replace', slotIds: [7] })
    expect(run({ name: 'n', baseType: 'Wand' }, [])).toMatchObject({ kind: 'empty-slot', slotIds: [7] })
    expect(run({ name: 'n', baseType: 'Buckler' }, [eq(6, 'Old', 'Buckler')])).toMatchObject({ kind: 'replace', slotIds: [6] })
    expect(run({ name: 'n', baseType: 'Buckler' }, [])).toMatchObject({ kind: 'empty-slot', slotIds: [6] })
    expect(run({ name: 'n', baseType: 'Buckler' }, [eq(7, 'Big Bow', 'Bow')])).toMatchObject({ kind: 'replace-pair', slotIds: [7, 6] })
  })
})
