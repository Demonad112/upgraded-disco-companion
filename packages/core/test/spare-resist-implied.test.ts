/**
 * HG1-10: an over-cap resistance is not "spare to trade" when poe.ninja's
 * maximum hits imply it is under cap (defense/implied.ts), and it is not
 * offered as a donor for another resistance.
 */
import { describe, expect, it } from 'vitest'
import { analyzeDefense, spareResistances } from '../src/defense/index.js'
import { recommend } from '../src/recommend/index.js'
import type { CharModel } from '../src/model/types.js'

// Pool 1,721 (life 1,111 + ES 610) equals the physical max hit, so the
// elemental max hits imply resistance: 6,374 → 73% lightning, under the 75 cap,
// though the sheet shows lightning 75 with 12 over cap. Fire implies 75+.
const model = {
  defensiveStats: {
    life: 1111, energyShield: 610,
    physicalMaximumHitTaken: 1721, fireMaximumHitTaken: 6884, coldMaximumHitTaken: 4000, lightningMaximumHitTaken: 6374,
    fireResistance: 75, fireResistanceMax: 75, fireResistanceOverCap: 9,
    coldResistance: 60, coldResistanceMax: 75, coldResistanceOverCap: 0,
    lightningResistance: 75, lightningResistanceMax: 75, lightningResistanceOverCap: 12,
    chaosResistance: 75, chaosResistanceMax: 75, chaosResistanceOverCap: 0,
  },
} as unknown as CharModel

describe('spare resistance against the max hits', () => {
  const defense = analyzeDefense(model)

  it('drops a resistance the max hits put under cap', () => {
    expect(spareResistances(defense).map((r) => r.type)).toEqual(['fire'])
  })

  it('keeps every over-cap resistance when the max hits say nothing', () => {
    const plain = analyzeDefense({ defensiveStats: { ...model.defensiveStats, physicalMaximumHitTaken: 9000 } } as unknown as CharModel)
    expect(spareResistances(plain).map((r) => r.type)).toEqual(['fire', 'lightning'])
  })

  it('never names it as the donor for another shortfall', () => {
    const report = recommend(model)
    const cold = report.recommendations.find((r) => r.id.includes('cold'))!
    expect(JSON.stringify(cold.evidence)).not.toContain('lightningResistanceOverCap')
  })
})
