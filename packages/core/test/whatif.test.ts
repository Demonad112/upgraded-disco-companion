import { describe, expect, it } from 'vitest'
import { analyzeDefense } from '../src/defense/index.js'
import { whatIfDefense, whatIfModel } from '../src/defense/whatif.js'

const base = analyzeDefense({
  defensiveStats: {
    life: 1000,
    energyShield: 0,
    fireResistance: 75,
    fireResistanceMax: 75,
    coldResistance: 30,
    coldResistanceMax: 75,
    lightningResistance: 75,
    lightningResistanceMax: 75,
    chaosResistance: -60,
    chaosResistanceMax: 75,
    physicalMaximumHitTaken: 2000,
    fireMaximumHitTaken: 4000,
    coldMaximumHitTaken: 1428,
    lightningMaximumHitTaken: 4000,
    chaosMaximumHitTaken: 625,
    lowestMaximumHitTaken: 625,
    effectiveHealthPool: 2500,
  },
} as never)

describe('whatIfDefense', () => {
  it('is the identity with no overrides', () => {
    expect(whatIfDefense(base, {})).toEqual(base)
  })

  it('scales the max hit by the change in damage taken, and re-sorts', () => {
    const next = whatIfDefense(base, { chaos: 0 })
    const chaos = next.maxHits.find((h) => h.type === 'chaos')!
    expect(chaos.value).toBe(Math.round(625 * (1.6 / 1)))
    expect(next.lowestMaximumHit).toBe(next.maxHits[0]!.value)
    expect(next.lowestMaximumHitType).toBe('chaos')
    expect(next.resistances.find((r) => r.type === 'chaos')).toMatchObject({ value: 0, capped: false, underCap: 75 })
    expect(next.ehpOverstatementRatio).toBeCloseTo(2500 / next.lowestMaximumHit!)
  })

  it('clamps the effective value at the cap and reports the overcap', () => {
    const next = whatIfDefense(base, { cold: 90 })
    expect(next.maxHits.find((h) => h.type === 'cold')!.value).toBe(Math.round(1428 * (0.7 / 0.25)))
    expect(next.resistances.find((r) => r.type === 'cold')).toMatchObject({ overCap: 15, capped: true, underCap: 0 })
  })

  it('leaves a type alone when its resistance is not in the payload', () => {
    const sparse = analyzeDefense({ defensiveStats: { fireMaximumHitTaken: 3000 } } as never)
    const next = whatIfDefense(sparse, { fire: 75 })
    expect(next.resistances.find((r) => r.type === 'fire')!.value).toBeNull()
    expect(next.maxHits).toEqual(sparse.maxHits)
    expect(next.lowestMaximumHit).toBe(sparse.lowestMaximumHit)
  })

  it('ignores non-finite overrides', () => {
    expect(whatIfDefense(base, { fire: Number.NaN })).toEqual(base)
  })
})

describe('whatIfModel', () => {
  const model = {
    defensiveStats: {
      fireResistance: 75,
      fireResistanceMax: 75,
      coldResistance: 30,
      coldResistanceMax: 75,
      physicalMaximumHitTaken: 2000,
      fireMaximumHitTaken: 4000,
      coldMaximumHitTaken: 1428,
      lowestMaximumHitTaken: 1428,
    },
  } as never

  it('is the same stats with no overrides', () => {
    expect(whatIfModel(model, {})).toEqual(model)
  })

  it('patches the resistance, the overcap, the max hit and the lowest', () => {
    const next = whatIfModel(model, { cold: 75 }) as { defensiveStats: Record<string, number> }
    expect(next.defensiveStats.coldResistance).toBe(75)
    expect(next.defensiveStats.coldResistanceOverCap).toBe(0)
    expect(next.defensiveStats.coldMaximumHitTaken).toBe(Math.round(1428 * (0.7 / 0.25)))
    expect(next.defensiveStats.lowestMaximumHitTaken).toBe(2000)
    expect(next.defensiveStats.fireMaximumHitTaken).toBe(4000)
  })
})
