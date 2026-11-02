import { describe, expect, it } from 'vitest'
import { farmData, validateFarmData, unverifiedCount, countByConfidence, findMod } from '@/data/farm'
import { farmingStrategies } from '@/data/strategies'

describe('farm data (patch 0.5.5)', () => {
  it('validates: sources, stats, ranges, unique ids', () => {
    expect(validateFarmData()).toEqual([])
  })
  it('every mod has a source or says unverified', () => {
    for (const m of [...farmData.tabletMods, ...farmData.waystoneMods]) expect(m.sources.length > 0 || m.confidence === 'unverified').toBe(true)
  })
  it('tier ranges satisfy min <= max and every mod id resolves', () => {
    for (const m of [...farmData.tabletMods, ...farmData.waystoneMods]) {
      expect(findMod(m.id)).toBe(m)
      for (const t of m.tiers) expect(t.min).toBeLessThanOrEqual(t.max)
    }
  })
  it('the validator catches a broken file', () => {
    const bad = structuredClone(farmData)
    bad.tabletMods[0]!.stat = 'nope'
    bad.tabletMods[1]!.tiers[0]!.min = 99
    bad.tabletMods[2]!.id = bad.tabletMods[3]!.id
    const errs = validateFarmData(bad)
    expect(errs.some((e) => e.includes('unknown stat nope'))).toBe(true)
    expect(errs.some((e) => e.includes('min > max'))).toBe(true)
    expect(errs.some((e) => e.includes('duplicate id'))).toBe(true)
  })
  it('counts confidence labels; the one fact-check "unverified" weight is counted', () => {
    const c = countByConfidence()
    expect(c.unverified).toBe(unverifiedCount)
    expect(unverifiedCount).toBeGreaterThanOrEqual(1)
  })
  it('strategy presets point at real strategies and presets', () => {
    const ids = new Set(farmingStrategies.map((s) => s.id))
    for (const [sid, pid] of Object.entries(farmData.weights.strategyPreset)) {
      expect(ids.has(sid)).toBe(true)
      expect(farmData.weights.presets[pid]).toBeDefined()
    }
  })
  it('rules come from the fact-check, not the old plan assumptions', () => {
    expect(farmData.rules.maxTabletsPerMap).toBe(3)
    expect(farmData.rules.maxTabletsPerCityMap).toBe(4)
    expect(farmData.rules.rarity.rare.totalBase).toBe(3)
    expect(farmData.rules.waystoneMaxModsCorrupted).toBe(10)
  })
})
