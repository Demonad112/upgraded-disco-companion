import { describe, expect, it } from 'vitest'
import { combineScores, scoreUpgrade, type ScoreProfile } from '../src/upgrade/scoring.js'

const base: ScoreProfile = { dps: 100_000, lowestMaxHit: 4_000, ehp: 12_000 }
const none: ScoreProfile = { dps: null, lowestMaxHit: null, ehp: null }

describe('combineScores with nothing known', () => {
  it('keeps the known part null when no input has one, as scoreUpgrade does', () => {
    const u = scoreUpgrade(none, none, { mode: 'bossing' })
    expect(u).toMatchObject({ kind: 'unknown', knownPart: null })
    const c = combineScores([u, u]).result
    expect(c.kind).toBe('unknown')
    // A {min: 0, max: 0} here would read as "the known part is exactly no change".
    expect(c).toMatchObject({ kind: 'unknown', knownPart: null })
  })

  it('keeps the known part null for a single unknown input', () => {
    const u = scoreUpgrade(none, none, { mode: 'bossing' })
    expect(combineScores([u]).result).toMatchObject({ kind: 'unknown', knownPart: null })
  })

  it('still sums what is known when another input is fully unknown', () => {
    const a = scoreUpgrade(base, { ...base, dps: 110_000 }, { mode: 'bossing' })
    const u = scoreUpgrade(none, none, { mode: 'bossing' })
    if (a.kind !== 'point') throw new Error(`expected point, got ${a.kind}`)
    const c = combineScores([a, u]).result
    if (c.kind !== 'unknown') throw new Error(`expected unknown, got ${c.kind}`)
    expect(c.knownPart).not.toBeNull()
    expect(c.knownPart?.min).toBeCloseTo(a.value, 12)
    expect(c.knownPart?.max).toBeCloseTo(a.value, 12)
  })

  it('still reports a known part when an unknown input carries one', () => {
    const partial = scoreUpgrade({ ...base, dps: null }, { ...base, ehp: 13_200, lowestMaxHit: 4_400 }, { mode: 'bossing' })
    if (partial.kind !== 'unknown') throw new Error(`expected unknown, got ${partial.kind}`)
    expect(partial.knownPart).not.toBeNull()
    const c = combineScores([partial]).result
    if (c.kind !== 'unknown') throw new Error(`expected unknown, got ${c.kind}`)
    expect(c.knownPart).toEqual(partial.knownPart)
  })
})
