/**
 * Waystone plan: risk against XP, on the real captured character and in
 * reference mode (level only).
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { analyzeCharacter } from '../src/analyze.js'
import { analyzeContent, COMFORT_THRESHOLDS, type MonsterStatData } from '../src/gear/content.js'
import {
  characterRisk,
  CORRUPT_ONLY_TIERS,
  planWaystones,
  referenceRisk,
  REFERENCE_RISK_PER_LEVEL,
  riskBand,
  safeZone,
  XP_WORTH_FLOOR,
  xpMultiplier,
} from '../src/gear/waystone.js'

const here = dirname(fileURLToPath(import.meta.url))
const monsters = JSON.parse(
  readFileSync(join(here, '..', '..', 'data', 'generated', 'monster-stats.json'), 'utf8'),
) as MonsterStatData
const analysis = await analyzeCharacter(JSON.parse(readFileSync(join(here, 'fixtures', 'athrynas-v43.json'), 'utf8')))
const report = analyzeContent(analysis.defense, monsters)

describe('xp penalty', () => {
  it('uses floor(3 + level / 16) as the safe zone', () => {
    expect(safeZone(24)).toBe(4)
    expect(safeZone(70)).toBe(7)
    expect(safeZone(80)).toBe(8)
    expect(safeZone(96)).toBe(9)
  })

  it('gives full XP inside the safe zone and the stated curve outside it', () => {
    expect(xpMultiplier(86, 78)).toBe(1)
    expect(xpMultiplier(86, 94)).toBe(1)
    // 86 - 75 = 11, minus safe zone 8 = 3: (91 / (91 + 3^2.5))^1.3
    expect(xpMultiplier(86, 75)).toBeCloseTo(Math.pow(91 / (91 + Math.pow(3, 2.5)), 1.5), 10)
    expect(xpMultiplier(86, 65)).toBeLessThan(xpMultiplier(86, 75))
  })
})

describe('risk', () => {
  it('scales character risk from 0 at comfortable to 100 at dangerous', () => {
    expect(characterRisk(COMFORT_THRESHOLDS.comfortable)).toBe(0)
    expect(characterRisk(30)).toBe(0)
    expect(characterRisk(COMFORT_THRESHOLDS.dangerous)).toBe(100)
    expect(characterRisk(1)).toBe(100)
    expect(characterRisk(9)).toBe(50)
  })

  it('adds reference risk per level above the character', () => {
    expect(referenceRisk(77, 77)).toBe(0)
    expect(referenceRisk(70, 77)).toBe(0)
    expect(referenceRisk(80, 77)).toBe(3 * REFERENCE_RISK_PER_LEVEL)
    expect(referenceRisk(90, 77)).toBe(100)
  })

  it('bands 0 as low, 100 as high, the rest as some', () => {
    expect(riskBand(0)).toBe('low')
    expect(riskBand(1)).toBe('some')
    expect(riskBand(99)).toBe('some')
    expect(riskBand(100)).toBe('high')
  })
})

describe('planWaystones, character mode', () => {
  const plan = planWaystones({ level: 86, tiers: monsters.tiers, report, defense: analysis.defense })

  it('covers every tier, T16 marked corruption-only', () => {
    expect(plan.mode).toBe('character')
    expect(plan.rows.map((r) => r.tier)).toEqual(Array.from({ length: 16 }, (_, i) => i + 1))
    expect(plan.rows.filter((r) => r.corruptOnly).map((r) => r.tier)).toEqual([...CORRUPT_ONLY_TIERS])
  })

  it('derives the verdict from headroom and the XP floor', () => {
    expect(report.highestComfortableTier).toBe(14)
    expect(plan.riskLimitTier).toBe(report.highestComfortableTier)
    expect(plan.runTo).toBe(14)
    expect(plan.best).toBe(14)
    // T12 keeps at least the floor, T11 does not.
    expect(1 - plan.rows[11]!.xpLost).toBeGreaterThanOrEqual(XP_WORTH_FLOOR)
    expect(1 - plan.rows[10]!.xpLost).toBeLessThan(XP_WORTH_FLOOR)
    expect(plan.runFrom).toBe(12)
    expect(plan.xpLimitTier).toBe(12)
    expect(plan.rows.find((r) => r.tier === 15)).toMatchObject({ band: 'some', xpLost: 0 })
  })

  it('names what gets the next tiers to low risk, from the weakest side', () => {
    const chaos = plan.needs.filter((n) => n.stat === 'Chaos resistance')
    expect(chaos.map((n) => n.tier)).toEqual([15, 16])
    for (const n of chaos) {
      expect(n.from).toBe(18)
      const t = report.tiers.find((r) => r.tier === n.tier)!
      // The target resistance must clear the comfortable threshold.
      const hit = (report.lowestMaximumHit * (100 - n.from!)) / (100 - n.to)
      expect(hit / t.baseMonsterHit).toBeGreaterThanOrEqual(COMFORT_THRESHOLDS.comfortable)
    }
    expect(plan.needs.find((n) => n.stat === 'Cold resistance')).toMatchObject({ from: 74, to: 75, tier: null })
  })

  it('has no limit line or needs when every tier is low risk', () => {
    const strong = planWaystones({
      level: 86,
      tiers: monsters.tiers,
      report: analyzeContent({ ...analysis.defense, lowestMaximumHit: 100000 }, monsters),
      defense: { ...analysis.defense, resistances: [] },
    })
    expect(strong.riskLimitTier).toBeNull()
    expect(strong.needs).toEqual([])
  })

  it('falls back to a pool increase when resistance cannot close the gap', () => {
    const weak = { ...analysis.defense, lowestMaximumHit: 500 }
    const plan = planWaystones({ level: 86, tiers: monsters.tiers, report: analyzeContent(weak, monsters), defense: weak })
    expect(plan.runFrom).toBeNull()
    expect(plan.best).toBeNull()
    expect(plan.needs[0]).toMatchObject({ stat: 'Life and energy shield', unit: '% more', tier: 1 })
  })
})

describe('planWaystones, reference mode', () => {
  it('uses the level gap when there is no character', () => {
    const plan = planWaystones({ level: 77, tiers: monsters.tiers })
    expect(plan.mode).toBe('reference')
    expect(plan.needs).toEqual([])
    expect(plan.rows.find((r) => r.tier === 13)!.risk).toBe(0)
    expect(plan.rows.find((r) => r.tier === 16)!.risk).toBe(60)
    expect(plan.riskLimitTier).toBe(13)
    expect(plan.best).toBe(13)
  })

  it('treats a report with no max hit as reference mode', () => {
    const empty = analyzeContent({ ...analysis.defense, lowestMaximumHit: null }, monsters)
    expect(planWaystones({ level: 70, tiers: monsters.tiers, report: empty }).mode).toBe('reference')
  })
})
