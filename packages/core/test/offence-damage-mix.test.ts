/**
 * A PoB code carries no damage split for its main skill (poe.ninja's model did). The mini-calc's per-type hit averages
 * give one, labelled "≈ est.": a share of the average hit, so the self-check's scale factor does not change it.
 */

import { describe, expect, it } from 'vitest'
import { damageMixOf } from '../src/offence/index.js'
import { applySelfCheck, type RawEstimate } from '../src/offence/self-check.js'

describe('damageMixOf', () => {
  it('splits the average hit by damage type, largest first, dropping zero types', () => {
    const mix = damageMixOf({ PhysicalHitAverage: 25, LightningHitAverage: 50, ColdHitAverage: 25, FireHitAverage: 0, AverageHit: 100 })
    expect(mix).toEqual([
      { type: 'lightning', percent: 50 },
      { type: 'physical', percent: 25 },
      { type: 'cold', percent: 25 },
    ])
  })

  it('is null when the pass computed no hit', () => {
    expect(damageMixOf({ TotalDPS: 0 })).toBeNull()
  })
})

describe('applySelfCheck with a mix', () => {
  const rows: RawEstimate[] = [
    { group: 1, name: 'Main', estimate: 100, reason: null, unread: [], mix: [{ type: 'cold', percent: 100 }] },
    { group: 2, name: 'Other', estimate: 50, reason: null, unread: [], mix: [{ type: 'fire', percent: 100 }] },
  ]

  it('keeps each mix when the estimates are shown, including the main skill', () => {
    const r = applySelfCheck(rows, 1, 110)
    expect(r.skills.find((s) => s.group === 1)!.mix).toEqual([{ type: 'cold', percent: 100 }])
    expect(r.skills.find((s) => s.group === 2)!.mix).toEqual([{ type: 'fire', percent: 100 }])
  })

  it('drops every mix when the estimates are hidden', () => {
    const r = applySelfCheck(rows, 1, 300)
    expect(r.skills.every((s) => s.mix === null)).toBe(true)
  })
})
