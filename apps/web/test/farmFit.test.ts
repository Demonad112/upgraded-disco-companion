import { describe, expect, it } from 'vitest'
import { farmData } from '@/data/farm'
import { buildFit } from '@/lib/farm/fit'
import type { Loadout } from '@/lib/farm/types'

const withSuffixes = (suffixes: Loadout['waystone']['suffixes']): Loadout => ({
  strategyId: 'breach-rares',
  tablets: [],
  waystone: { tier: 15, rarity: 'rare', corrupted: false, prefixes: [{ modId: 'w-pack-size', tier: 1, value: 15 }], suffixes },
  options: { mapContext: 'standard', keystones: false, effects: [] },
})

describe('R36 fits your build', () => {
  const fire = withSuffixes([{ modId: 'w-extra-fire', tier: 1, value: 20 }])
  const chaos = withSuffixes([{ modId: 'w-extra-chaos', tier: 1, value: 20 }])

  it('reads its threshold from the data', () => {
    expect(farmData.weights.danger.fitsBuild.maxRatio).toBe(1)
    expect(farmData.weights.danger.fitsBuild.confidence).toBe('unverified')
  })

  it('gives no verdict for a loadout with no danger mods (nothing to compare)', () => {
    expect(buildFit(farmData, withSuffixes([]), 'breach', ['es'])).toEqual({ ratio: null, verdict: null })
  })

  it('extra fire: easier for ES (2 vs generic 2 → even), harder for armour (3 vs 2)', () => {
    // Severities from the data: fire es 2, armour 3, evasion 2, recovery 1; generic 2.
    expect(buildFit(farmData, fire, 'breach', ['es']).verdict).toBe('even')
    expect(buildFit(farmData, fire, 'breach', ['armour']).verdict).toBe('harder')
    expect(buildFit(farmData, fire, 'breach', ['recovery']).verdict).toBe('fits')
  })

  it('extra chaos hits ES and mana builds harder (3 vs generic 2.2)', () => {
    expect(buildFit(farmData, chaos, 'breach', ['es']).verdict).toBe('harder')
    expect(buildFit(farmData, chaos, 'breach', ['armour', 'evasion']).verdict).toBe('fits')
    expect(buildFit(farmData, chaos, 'breach', ['armour', 'evasion']).ratio).toBeCloseTo(2 / 2.2, 6)
  })
})
