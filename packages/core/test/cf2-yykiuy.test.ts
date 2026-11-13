/**
 * CF2: rubric, ranking and wording for Yykiuy (audit items 5-19).
 * Fixture: yykiuy-v80.json. Every number asserted is poe.ninja's value as given,
 * or derived from it (`whatIfDefense`, `assessBuild`).
 *
 * The ladder sample is a test stand-in: ninja's 192,498 DPS placed in the
 * 25th-50th percentile band, which is where the audit graded it (damage 0.28).
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { analyzeCharacter } from '../src/analyze.js'
import { whatIfDefense } from '../src/defense/whatif.js'
import { analyzeContent, type MonsterStatData } from '../src/gear/content.js'
import { ModTiers, type ModTierData } from '../src/gear/tiers.js'
import { characterRisk, planWaystones } from '../src/gear/waystone.js'
import type { LadderSummary } from '../src/ninja/ladder.js'
import { COST_WEIGHT } from '../src/recommend/rank.js'
import { classifyDrift } from '../src/reconcile/index.js'
import { assessBuild, defenceParts } from '../src/score/index.js'

const here = dirname(fileURLToPath(import.meta.url))
const payload = JSON.parse(readFileSync(join(here, 'fixtures', 'yykiuy-v80.json'), 'utf8'))
const tiers = new ModTiers(
  JSON.parse(readFileSync(join(here, '..', '..', 'data', 'generated', 'mod-tiers.json'), 'utf8')) as ModTierData,
)

const ladder: LadderSummary = {
  league: 'runesofaldur',
  class: 'Invoker',
  snapshot: 'test',
  sampleSize: 100,
  totalInPool: null,
  levelRange: null,
  dps: { n: 100, p25: 150_000, median: 400_000, p75: 900_000, max: 3_000_000 },
  ehp: null,
  pool: null,
  caveat: 'Test sample.',
}

const analysis = await analyzeCharacter(payload, { ladder })
const { defense, dps } = analysis
const grade = (d = defense) => assessBuild({ defense: d, dps, ladder })

// The old rubric (pool bands 4k/6k, binary "all elemental capped", chaos >= 30)
// was locked in the previous commit as defence 0.20, damage 0.28, total 0.48 (C),
// with "of Ephij" at +0.15 (0.63 B) and "of Bameth" at 0. The values below are
// the deliberate update to the new rubric (audit items 11-14).
describe('CF2 rubric: Yykiuy on the new rubric', () => {
  it('scores defence 0.37, damage 0.28, total 0.65 (B)', () => {
    const a = grade()
    expect(a.defence).toBe(0.37)
    expect(a.offence).toBe(0.28)
    expect(a.score).toBe(0.65)
    expect(a.tier).toBe('B')
  })

  it('scores each part continuously', () => {
    const p = defenceParts(defense)
    // Lowest max hit 4,399 on the 2,000 -> 6,000 ramp.
    expect(p.maxHit).toBeCloseTo(0.3 * (4399 - 2000) / 4000, 10)
    // Lightning 74 of 76: (1 - 0.76) / (1 - 0.74) = 24/26 of its third.
    expect(p.elemental).toBeCloseTo(0.05 * (1 + 1 + 24 / 26), 10)
    // Chaos 69 of 75: 25/31.
    expect(p.chaos).toBeCloseTo(0.05 * (25 / 31), 10)
  })

  it('pool is life + energy shield 4,399, chaos pool 2,938, and no ward', () => {
    const a = grade()
    expect(a.pool.total).toBe(4399)
    expect(a.pool.chaos).toBe(2938)
    expect(a.pool.label).toBe('combined life + energy shield')
    expect(JSON.stringify(a)).not.toMatch(/\bward\b/i)
  })

  it('takes the headline from the lowest max hit (physical 4,399), not resistances', () => {
    const a = grade()
    expect(a.note).toBe('Physical hits are the biggest thing holding this back — the largest you survive is 4,399.')
    const res = a.weaknesses.find((w) => w.text.startsWith('Uncapped elemental'))!
    // 2 points short of 76 is 8% more lightning damage taken: a warning, not CRITICAL.
    expect(res.text).toContain('Lightning 74% of 76%, 8% more lightning damage taken')
    expect(res.severity).toBe('warning')
  })

  it('makes no one-shot claim', () => {
    const a = grade()
    expect(JSON.stringify(a)).not.toMatch(/one-shot/i)
    expect(JSON.stringify(analysis.recommendations)).not.toMatch(/one-shot (risk|threshold)|kills you first/i)
  })

  it('bounds an ungraded range by the lowest damage score: [defence + 0.15, defence + 0.5]', () => {
    const a = assessBuild({ defense, dps })
    expect(a.scoreRange).toEqual({ min: 0.52, max: 0.87 })
  })
})

describe('CF2 ranking (D1): Ephij vs Bameth follows Δgrade', () => {
  const before = defenceParts(defense).total
  const ephij = defenceParts(whatIfDefense(defense, { lightning: 76 })).total - before
  const bameth = defenceParts(whatIfDefense(defense, { chaos: 75 })).total - before

  it('measures "of Bameth" above "of Ephij" on the new rubric', () => {
    // Chaos 31% -> 25% damage taken (-19%) beats lightning 26% -> 24% (-7.7%).
    expect(bameth).toBeCloseTo(0.05 * (1 - 25 / 31), 10)
    expect(ephij).toBeCloseTo(0.05 * (1 - 24 / 26), 10)
    expect(bameth).toBeGreaterThan(ephij)
  })

  it('leads the Mind Spur decision with the option Δgrade puts first', async () => {
    const a = await analyzeCharacter(payload, { tiers, ladder })
    const rec = a.recommendations.recommendations.find((r) => r.id === 'gear-swap-chaos')!
    expect(rec.action).toMatch(/"of Bameth".*score \+0\.01; or "of Ephij".*score under \+0\.01/)
    expect(rec.measured!.grade).toBeCloseTo(bameth, 10)
    expect(rec.alsoCovers).toEqual(['res-lightning-under-cap'])
  })
})

describe('CF2 ranking (items 7-9)', () => {
  it('gives a concrete physical change: +1 life or ES = +1 physical max hit', async () => {
    const a = await analyzeCharacter(payload, { tiers, ladder })
    const recs = a.recommendations.recommendations
    const phys = recs.find((r) => r.id === 'one-shot-physical')!
    expect(phys.action).toBe('Add 3,252 life or energy shield — it raises your 4,399 physical maximum hit to 7,651.')
    expect(phys.impact).toMatchObject({ stat: 'physicalMaximumHitTaken', from: 4399, to: 7651, delta: 3252 })
    expect(phys.impact!.label).not.toMatch(/ceiling/i)
    expect(phys.measured).toEqual({ grade: expect.closeTo(0.3 - 0.3 * (4399 - 2000) / 4000, 10), lowestMaxHit: 3252, dps: null })
    // Ranked by Δgrade per cost: the physical change leads.
    expect(recs[0]!.id).toBe('one-shot-physical')
  })

  it('has no mixed-unit gain text', async () => {
    const a = await analyzeCharacter(payload, { tiers, ladder })
    expect(JSON.stringify(a.recommendations)).not.toMatch(/% of (the )?(killed-by|resistance) gap|affix slots \d+→\d+|closes \d+ of the/)
  })

  it('keeps one cost table, with unknown cost in its own group', () => {
    expect(COST_WEIGHT).toEqual({ free: 0.5, passive: 2, gear: 4, currency: 5 })
  })
})

describe('CF2 item 17: waystone risk reads the lowest max hit', () => {
  const stats = JSON.parse(
    readFileSync(join(here, '..', '..', 'data', 'generated', 'monster-stats.json'), 'utf8'),
  ) as MonsterStatData

  it('measures every tier against 4,399, the physical max hit', () => {
    const report = analyzeContent(defense, stats)
    expect(report.lowestMaximumHit).toBe(4399)
    expect(report.lowestMaximumHitType).toBe('physical')
    for (const t of report.tiers) expect(t.headroom).toBe(Number((4399 / stats.physicalDamage[String(t.areaLevel)]!).toFixed(1)))
    const plan = planWaystones({ level: payload.charModel.level, tiers: stats.tiers, report, defense })
    for (const row of plan.rows) {
      const t = report.tiers.find((x) => x.tier === row.tier)!
      expect(row.risk).toBe(characterRisk(t.headroom))
    }
  })
})

describe('CF2 item 19: capped values compare in absolute points', () => {
  it('calls a 1-point resistance or charge difference major, not a 1.3% match', () => {
    expect(classifyDrift(75, 74, 'fireResistance').severity).toBe('major')
    expect(classifyDrift(3, 4, 'breakdown:powerCharges').severity).toBe('major')
    expect(classifyDrift(75, 75, 'fireResistance').severity).toBe('match')
    // Uncapped values keep the relative tolerance.
    expect(classifyDrift(4399, 4400, 'life').severity).toBe('match')
  })
})
