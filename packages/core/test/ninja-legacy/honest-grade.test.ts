/**
 * B1 "Honest grade" (outside review 2026-11-17, items 1-3).
 *
 * - Damage below the ladder's 25th percentile earns credit in proportion to
 *   dps / p25, not a flat 30 % of the damage half however low it is.
 * - An unknown maximum hit widens the score into a range by the max-hit
 *   weight instead of silently scoring survivability as 0 (CA1-9).
 * - Mind Over Matter is applied from the passive tree and labelled as such;
 *   note-only keystones show their note instead of a warning.
 */

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { unwrapCharModel } from '../../src/analyze.js'
import { analyzeDefense } from '../../src/defense/index.js'
import { analyzeDps } from '../../src/dps/index.js'
import { effectivePool, keystoneEffectsOf } from '../../src/keystones/index.js'
import { assessBuild, RUBRIC } from '../../src/score/index.js'
import type { LadderSummary } from '../../src/ninja/ladder.js'

const fixturePath = fileURLToPath(new URL('./fixtures/athrynas-v43.json', import.meta.url))
const model = unwrapCharModel(JSON.parse(readFileSync(fixturePath, 'utf8')) as unknown)
const defense = analyzeDefense(model)
const dps = analyzeDps(model) // primary 109,859 DPS

function ladder(over: Partial<NonNullable<LadderSummary['dps']>> = {}): LadderSummary {
  return {
    league: 'runesofaldur',
    class: 'Deadeye',
    snapshot: 'test',
    sampleSize: 100,
    totalInPool: 4213,
    levelRange: { min: 98, max: 100 },
    dps: { n: 100, p25: 200_000, median: 400_000, p75: 900_000, max: 3_000_000, ...over },
    ehp: null,
    pool: null,
    caveat: 'Top-of-ladder sample only.',
  }
}

const round = (n: number) => Math.round(n * 100) / 100

describe('damage below the 25th percentile', () => {
  it('scales by dps / p25 instead of a flat grade', () => {
    // 109,859 against a p25 of 1,000,000 is 11 % of the way: 0.28 x 0.11 = 0.03.
    const far = assessBuild({ defense, dps, ladder: ladder({ p25: 1_000_000, median: 2_000_000, p75: 2_500_000 }) })
    expect(far.offence).toBe(0.03)
  })

  it('earns almost nothing at 1 DPS', () => {
    const one = { ...dps, primary: { ...dps.primary!, totalDps: 1 } }
    expect(assessBuild({ defense, dps: one, ladder: ladder() }).offence).toBe(0)
  })

  it('is continuous at the 25th percentile', () => {
    const at = { ...dps, primary: { ...dps.primary!, totalDps: 200_000 } }
    const under = { ...dps, primary: { ...dps.primary!, totalDps: 199_999 } }
    expect(assessBuild({ defense, dps: at, ladder: ladder() }).offence).toBe(0.28)
    expect(assessBuild({ defense, dps: under, ladder: ladder() }).offence).toBe(0.28)
  })

  it('floors the ungraded damage range at 0, the bottom of the scale', () => {
    const unscored = assessBuild({ defense, dps })
    expect(unscored.scoreRange!.min).toBe(unscored.defence)
  })
})

describe('an unknown maximum hit (CA1-9)', () => {
  const noHits = { ...defense, maxHits: [], lowestMaximumHit: null, lowestMaximumHitType: null }

  it('reports a range as wide as the max-hit weight, not a point that assumes the worst', () => {
    const a = assessBuild({ defense: noHits, dps, ladder: ladder() })
    expect(a.offence).not.toBeNull()
    expect(a.score).toBeNull()
    expect(a.tier).toBeNull()
    expect(a.scoreRange).toEqual({
      min: round(a.defence + a.offence!),
      max: round(a.defence + a.offence! + RUBRIC.weights.maxHit),
    })
    expect(a.tierRange).not.toBeNull()
  })

  it('says why the defence half is incomplete, and names both gaps in the note', () => {
    const graded = assessBuild({ defense, dps, ladder: ladder() })
    expect(graded.defenceUnscoredReason).toBeNull()
    const a = assessBuild({ defense: noHits, dps })
    expect(a.defenceUnscoredReason).toContain('maximum hit')
    expect(a.note).toContain('largest survivable hit')
  })

  it('combines with an ungraded damage half', () => {
    const a = assessBuild({ defense: noHits, dps })
    expect(a.scoreRange).toEqual({
      min: a.defence,
      max: round(a.defence + RUBRIC.offenceWeight + RUBRIC.weights.maxHit),
    })
  })
})

describe('keystones whose rule is game data', () => {
  it('applies Mind Over Matter from the tree and says so', () => {
    const effects = keystoneEffectsOf([{ name: 'Mind Over Matter' }], defense)
    expect(effects.manaIsPool).toBe(true)
    expect(effects.fromTree).toEqual(['Mind Over Matter'])
    expect(effects.unverified).toEqual([])
    expect(effects.notes.map((n) => n.keystone)).toEqual(['Mind Over Matter'])

    const pool = effectivePool({ ...defense, life: 1000, energyShield: 2000, mana: 500 }, effects)
    expect(pool).toMatchObject({ total: 3500, parts: ['life', 'energy shield', 'mana'] })

    const a = assessBuild({ defense, dps, keystones: effects })
    expect(a.caveats.some((c) => c.includes('Mind Over Matter') && c.includes('passive tree'))).toBe(true)
  })

  it('shows the note for keystones that change no figure, instead of a warning', () => {
    const names = ['Avatar of Fire', 'Necromantic Talisman', 'Resolute Technique']
    const effects = keystoneEffectsOf(
      names.map((name) => ({ name })),
      defense,
    )
    expect(effects.unverified).toEqual([])
    expect(effects.notes.map((n) => n.keystone)).toEqual(names)
    expect(effects.applied).toEqual(names)
  })
})
