/**
 * Regression test for the character the analyzer was validated against: Yykiuy,
 * level 88 Martial Artist (test/fixtures/yykiuy-v51.json, captured 2026-11-08).
 * Expected values come from the evidence pack: what this app read from poe.ninja
 * and the attached PoB export. The reference tool's different numbers (uncapped
 * resistances +10, higher max hits) are deliberately NOT asserted: they are
 * hints to verify, not targets to match. Athrynas was dropped from the pack.
 */

import { beforeAll, describe, expect, it } from 'vitest'
import type { Analysis } from '../src/analyze.js'
import { analyzeCharacter } from '../src/analyze.js'
import { analyzePob } from './helpers/pob.js'
import { findFixture } from './helpers/fixtures.js'

const yykiuy = findFixture(/^yykiuy-v51\.json$/)

describe('Yykiuy (level 88 Martial Artist) evidence pack', () => {
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


  it('does not raise a banner for the unmapped stat id', () => {
    expect(a.warnings.join(' ')).not.toMatch(/disagree between poe.ninja/)
  })
})
