/**
 * "This build is in good shape" is a verdict, so it needs the inputs it names.
 *
 * `recommend` reports `buildIsSound` when no rule fires. With the resistances
 * or the maximum hits absent from the payload no rule CAN fire, and the summary
 * still said "resistances are capped, no damage type is far weaker than the
 * rest". A missing input must give an explicit "not checked", never a pass.
 */

import { describe, expect, it } from 'vitest'
import { recommend } from '../src/recommend/index.js'
import type { CharModel } from '../src/model/types.js'

const capped = {
  fireResistance: 75,
  fireResistanceMax: 75,
  fireResistanceOverCap: 0,
  coldResistance: 75,
  coldResistanceMax: 75,
  coldResistanceOverCap: 0,
  lightningResistance: 75,
  lightningResistanceMax: 75,
  lightningResistanceOverCap: 0,
  chaosResistance: 75,
  chaosResistanceMax: 75,
  chaosResistanceOverCap: 0,
}

const hits = {
  lowestMaximumHitTaken: 9000,
  physicalMaximumHitTaken: 9000,
  fireMaximumHitTaken: 9500,
  coldMaximumHitTaken: 9500,
  lightningMaximumHitTaken: 9500,
  chaosMaximumHitTaken: 9200,
}

const items = [
  { itemSlot: 7, itemData: { name: 'Good Bow', typeLine: 'Militant Bow', ilvl: 82, frameType: 2 } },
  { itemSlot: 3, itemData: { name: 'Good Chest', typeLine: 'Jacket', ilvl: 82, frameType: 2 } },
  { itemSlot: 1, itemData: { name: 'Good Helm', typeLine: 'Tiara', ilvl: 82, frameType: 2 } },
]

const model = (defensiveStats: Record<string, number>, gear: unknown[] = items) =>
  ({ defensiveStats: { life: 3000, energyShield: 0, ...defensiveStats }, items: gear }) as unknown as CharModel

describe('buildIsSound needs the inputs its summary names', () => {
  it('does not call an empty payload sound', () => {
    const report = recommend({} as CharModel)
    expect(report.recommendations).toEqual([])
    expect(report.buildIsSound).toBe(false)
    expect(report.summary).not.toMatch(/good shape|resistances are capped/)
    expect(report.summary).toMatch(/not in the payload/)
  })

  it('does not claim capped resistances when the payload carries none', () => {
    const report = recommend(model(hits))
    expect(report.buildIsSound).toBe(false)
    expect(report.summary).toMatch(/resistance/i)
    expect(report.summary).not.toMatch(/resistances are capped/)
  })

  it('does not claim balanced damage types when the payload carries no maximum hits', () => {
    const report = recommend(model(capped))
    expect(report.buildIsSound).toBe(false)
    expect(report.summary).toMatch(/maximum hit/i)
    expect(report.summary).not.toMatch(/no damage type is far weaker/)
  })

  it('names one unreported resistance rather than passing it', () => {
    const { chaosResistance: _omitted, ...withoutChaos } = capped
    const report = recommend(model({ ...withoutChaos, ...hits }))
    expect(report.buildIsSound).toBe(false)
    expect(report.summary).toMatch(/chaos resistance/i)
  })

  it('does not call gear consistent when the payload carries no gear', () => {
    const report = recommend(model({ ...capped, ...hits }, []))
    expect(report.buildIsSound).toBe(false)
    expect(report.summary).toMatch(/equipped gear/)
  })

  it('still calls a fully reported, capped build sound', () => {
    const report = recommend(model({ ...capped, ...hits }))
    expect(report.recommendations.filter((r) => r.category !== 'question')).toEqual([])
    expect(report.buildIsSound).toBe(true)
    expect(report.summary).toMatch(/good shape/)
  })
})
