/**
 * Content headroom with a missing input.
 *
 * `analyzeContent` read an unreported maximum hit as 0. Every tier then had 0x
 * headroom and read "dangerous", and the summary said "A unknown hit of 0 kills
 * this character". A missing figure must give "not measured", never a verdict.
 */

import { describe, expect, it } from 'vitest'
import { analyzeDefense } from '../src/defense/index.js'
import { analyzeContent, type MonsterStatData } from '../src/gear/content.js'

const monsters: MonsterStatData = {
  version: 1,
  generatedFrom: 'inline test data',
  limitation: 'base monsters only',
  physicalDamage: { '65': 300, '66': 320, '80': 600, '82': 650, '85': 700 },
  tiers: [
    { tier: 1, areaLevel: 65, dropLevel: 65, dropLevelMatches: false },
    { tier: 2, areaLevel: 66, dropLevel: 66, dropLevelMatches: true },
    { tier: 16, areaLevel: 80, dropLevel: 80, dropLevelMatches: true },
  ],
  enemyLevels: { source: 'inline', maxNormalAndBoss: 85, pinnacleMinimum: 82, note: '' },
  mapLevels: [65, 66, 80],
  mapsByLevel: {},
}

const noHits = analyzeDefense({ defensiveStats: { life: 1500, energyShield: 900 } })
const withHits = analyzeDefense({
  defensiveStats: {
    life: 1500,
    energyShield: 900,
    lowestMaximumHitTaken: 6000,
    physicalMaximumHitTaken: 6000,
    fireMaximumHitTaken: 9000,
  },
})

describe('analyzeContent without a maximum hit', () => {
  it('has no maximum hit to read', () => {
    expect(noHits.lowestMaximumHit).toBeNull()
  })

  it('grades no tier and no boss', () => {
    const report = analyzeContent(noHits, monsters)
    expect(report.tiers).toEqual([])
    expect(report.bosses).toEqual([])
    expect(report.highestComfortableTier).toBeNull()
    expect(report.firstDangerousTier).toBeNull()
  })

  it('says the headroom was not measured, and why', () => {
    const report = analyzeContent(noHits, monsters)
    expect(report.summary).not.toMatch(/kills this character|Survivability is the constraint/)
    expect(report.summary).toMatch(/not measured/)
    expect(report.unresolved.some((u) => /maximum hit/i.test(u.missing))).toBe(true)
  })

  it('still reads as "no maximum hit" to the waystone planner', () => {
    expect(analyzeContent(noHits, monsters).lowestMaximumHit).toBe(0)
  })
})

describe('analyzeContent without monster data', () => {
  it('does not call the character thin when no tier could be graded', () => {
    const report = analyzeContent(withHits, { ...monsters, tiers: [], physicalDamage: {} })
    expect(report.tiers).toEqual([])
    expect(report.summary).not.toMatch(/thin against a base monster/)
    expect(report.summary).toMatch(/not measured/)
  })

  it('grades no boss at a level the data does not state', () => {
    const report = analyzeContent(withHits, { ...monsters, enemyLevels: undefined as never })
    expect(report.bosses).toEqual([])
  })
})

describe('analyzeContent with both inputs', () => {
  it('still grades every tier and both boss points', () => {
    const report = analyzeContent(withHits, monsters)
    expect(report.tiers.map((t) => [t.tier, t.headroom, t.comfort])).toEqual([
      [1, 20, 'comfortable'],
      [2, 18.8, 'comfortable'],
      [16, 10, 'thin'],
    ])
    expect(report.bosses.map((b) => [b.level, b.headroom])).toEqual([
      [82, 9.2],
      [85, 8.6],
    ])
    expect(report.summary).toMatch(/comfortable to tier 2/)
  })
})
