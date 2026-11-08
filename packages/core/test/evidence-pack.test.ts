/**
 * Regression tests for the two characters the analyzer was validated against.
 *
 * Both depend on a poe.ninja capture that is NOT in the repository yet. Until
 * the file is committed to test/fixtures/ the suite is skipped (pending), not
 * failing. Expected values come from the evidence pack: what this app read from
 * poe.ninja and the attached PoB export for that character. The reference
 * tool's different numbers (uncapped resistances +10, higher max hits) are
 * deliberately NOT asserted: they are hints to verify, not targets to match.
 *
 * Files to commit (stored verbatim, `{type, charModel}` envelope, see README):
 *   test/fixtures/yykiuy-v<model version>.json     Martial Artist, level 88 (capture v51, 2026-11-08)
 *   test/fixtures/athrynas-94-v<model version>.json  level 94 Athrynas
 */

import { beforeAll, describe, expect, it } from 'vitest'
import type { Analysis } from '../src/analyze.js'
import { analyzeCharacter } from '../src/analyze.js'
import { checkBaseline, ninjaBaselineExpectations } from '../src/pob/baseline-gate.js'
import { analyzePob } from './helpers/pob.js'
import { findFixture } from './helpers/fixtures.js'

const yykiuy = findFixture(/^yykiuy.*\.json$/i)
const athrynas94 = findFixture(/^athrynas.*94.*\.json$/i)

describe.skipIf(!yykiuy)('Yykiuy (level 88 Martial Artist) evidence pack', () => {
  let a: Analysis
  const s = yykiuy?.model.defensiveStats ?? {}
  beforeAll(async () => {
    a = await analyzeCharacter(yykiuy!.raw)
  })

  it('reads the observed defensive stats', () => {
    expect(yykiuy!.model.level).toBe(88)
    expect(s.life).toBe(1477)
    expect(s.energyShield).toBe(2922)
    expect(s.mana).toBe(662)
    expect(s.evasionRating).toBe(8704)
    expect([s.strength, s.dexterity, s.intelligence]).toEqual([97, 142, 124])
    expect(s.movementSpeed).toBe(134)
  })

  it('reads uncapped resistances as capped value plus over-cap', () => {
    const uncapped = Object.fromEntries(a.defense.resistances.map((r) => [r.type, (r.value ?? 0) + (r.overCap ?? 0)]))
    expect(uncapped).toEqual({ fire: 80, cold: 139, lightning: 74, chaos: 69 })
    expect(a.defense.resistances.map((r) => r.max)).toEqual([75, 80, 76, 75])
  })

  it('reads the maximum hits and EHP as given', () => {
    const hit = (t: string) => a.defense.maxHits.find((m) => m.type === t)?.value
    expect([hit('physical'), hit('chaos'), hit('fire'), hit('cold'), hit('lightning')]).toEqual([4399, 9477, 15711, 19126, 15169])
    expect(a.defense.effectiveHealthPool).toBe(18456)
  })

  it('reads Falling Thunder DPS and agrees with the export', async () => {
    const top = a.dps.skills.find((k) => k.name === 'Falling Thunder')
    expect(top?.dps).toBeGreaterThan(225_000)
    expect(top?.dps).toBeLessThan(226_000)
    const stats = await analyzePob(yykiuy!.model)
    expect(stats.TotalDPS).toBeCloseTo(225_652, -1)
  })

  it('the export’s own baseline reproduces poe.ninja, so simulation would be allowed', async () => {
    const stats = await analyzePob(yykiuy!.model)
    const gate = checkBaseline(ninjaBaselineExpectations(yykiuy!.model.defensiveStats), stats)
    expect(gate.failing.map((f) => f.reason)).toEqual([])
  })

  it('does not raise a banner for the unmapped stat id', () => {
    expect(a.warnings.join(' ')).not.toMatch(/disagree between poe.ninja/)
  })
})

describe.skipIf(!athrynas94)('Athrynas (level 94) evidence pack', () => {
  it('is a level 94 capture', () => {
    expect(athrynas94!.model.level).toBe(94)
  })
  it.todo('expected outputs: not in the evidence pack; record them from the committed capture')
})

// Visible in the run as pending until the captures are committed.
if (!yykiuy) it.todo('Yykiuy: commit test/fixtures/yykiuy-v<model version>.json (level 63 Martial Artist)')
if (!athrynas94) it.todo('Athrynas level 94: commit test/fixtures/athrynas-94-v<model version>.json')
