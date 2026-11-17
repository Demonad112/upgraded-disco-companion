/**
 * Absent defence fields are missing, not zero (CA1-1).
 *
 * analyzeDefense read an absent armour, evasion and block chance as 0. The
 * score then said "Little armour or block" about a payload that never
 * reported either.
 */

import { describe, expect, it } from 'vitest'
import { analyzeDefense } from '../src/defense/index.js'
import { analyzeDps } from '../src/dps/index.js'
import type { CharModel } from '../src/model/types.js'
import { assessBuild } from '../src/score/index.js'

const sparse = {
  defensiveStats: {
    life: 1500,
    energyShield: 900,
    fireResistance: 75,
    coldResistance: 75,
    lightningResistance: 75,
    chaosResistance: 20,
  },
} as unknown as CharModel

describe('absent defence fields', () => {
  const d = analyzeDefense(sparse)

  it('are null, not 0', () => {
    expect(d.armour).toBeNull()
    expect(d.evasion).toBeNull()
    expect(d.blockChance).toBeNull()
  })

  it('are listed as missing', () => {
    expect(d.missing).toEqual(
      expect.arrayContaining([
        'armour',
        'evasionRating',
        'blockChance',
      ]),
    )
  })

  it('do not produce the "Little armour or block" weakness', () => {
    const a = assessBuild({ defense: d, dps: analyzeDps({ skills: [] }) })
    expect(a.weaknesses.map((w) => w.text).join(' ')).not.toContain('Little armour')
  })

  it('still read a reported 0 as 0', () => {
    const zero = analyzeDefense({
      defensiveStats: { ...sparse.defensiveStats, armour: 0, evasionRating: 0, blockChance: 0 },
    } as unknown as CharModel)
    expect(zero.armour).toBe(0)
    expect(zero.evasion).toBe(0)
    expect(zero.blockChance).toBe(0)
  })
})

describe('an absent resistance maximum', () => {
  const d = analyzeDefense(sparse)

  it('is null, not an assumed 75', () => {
    for (const r of d.resistances) expect(r.max).toBeNull()
  })

  it('is listed as missing', () => {
    expect(d.missing).toEqual(
      expect.arrayContaining(['fireResistanceMax', 'coldResistanceMax', 'lightningResistanceMax', 'chaosResistanceMax']),
    )
  })

  it('leaves the resistance unjudged: no shortfall, no cap state', () => {
    for (const r of d.resistances) {
      expect(r.underCap).toBeNull()
      expect(r.capped).toBeNull()
    }
  })

  it('keeps a reported cap as given', () => {
    const raised = analyzeDefense({
      defensiveStats: { ...sparse.defensiveStats, fireResistanceMax: 76 },
    } as unknown as CharModel)
    const fire = raised.resistances.find((r) => r.type === 'fire')!
    expect(fire.max).toBe(76)
    expect(fire.underCap).toBe(1)
  })
})
