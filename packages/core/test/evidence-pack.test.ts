/**
 * Regression test for the numbers the analyzer was validated against: Yykiuy,
 * level 88 Martial Artist (captured 2026-11-08, its defence block kept inline in
 * helpers/main-build.ts since PB-5 deleted the capture; the DPS agreement is
 * checked on the main build's own code). Expected values come from the evidence
 * pack: what this app read from poe.ninja and the attached PoB export. The reference tool's different numbers (uncapped
 * resistances +10, higher max hits) are deliberately NOT asserted: they are
 * hints to verify, not targets to match. Athrynas was dropped from the pack.
 */

import { beforeAll, describe, expect, it } from 'vitest'
import type { Analysis } from '../src/analyze.js'
import { analyzeCharacter } from '../src/analyze.js'
import { analyzePob } from './helpers/pob.js'
import { mainPayload, mainWithYykiuyDefence } from './helpers/main-build.js'

const yykiuy = mainWithYykiuyDefence()
const yModel = yykiuy.charModel

describe('Yykiuy (level 88 Martial Artist) evidence pack', () => {
  let a: Analysis
  const s = yModel.defensiveStats ?? {}
  beforeAll(async () => {
    a = await analyzeCharacter(yykiuy)
  })

  it('reads the observed defensive stats', () => {
    expect(yModel.level).toBe(88)
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

  it('reads the main skill DPS as given, and agrees with the export where both come from the code', async () => {
    const top = a.dps.skills.find((k) => k.name === 'Falling Thunder')
    expect(top?.dps).toBe(192_498)
    // The main build's own code: the analyzer's figure and PoB's TotalDPS are the same number.
    const code = mainPayload()
    const main = await analyzeCharacter(code)
    const stats = await analyzePob(code.charModel)
    expect(stats.TotalDPS).toBeCloseTo(186_706, -1)
    expect(main.dps.primary?.dps).toBeCloseTo(stats.TotalDPS, 0)
  })

  it('does not raise a banner for the unmapped stat id', async () => {
    // The main build agrees with its own export; one breakdown stat id nothing maps (99) must not change that.
    const code = mainPayload()
    ;(code.charModel as { breakdowns?: unknown }).breakdowns = {
      sources: [[0]],
      stats: { '99': { base: 0, inc: 0, more: 1, total: 0, basePercent: false, mods: [] } },
    }
    const b = await analyzeCharacter(code)
    expect(b.breakdowns.unmappedIds).toEqual([99])
    expect(b.warnings.join(' ')).not.toMatch(/disagree between poe.ninja/)
  })
})
