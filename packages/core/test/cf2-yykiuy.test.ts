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
import type { LadderSummary } from '../src/ninja/ladder.js'
import { assessBuild } from '../src/score/index.js'

const here = dirname(fileURLToPath(import.meta.url))
const payload = JSON.parse(readFileSync(join(here, 'fixtures', 'yykiuy-v80.json'), 'utf8'))

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

describe('CF2 baseline: old rubric (locked before any rubric change)', () => {
  it('scores Yykiuy defence 0.20, damage 0.28, total 0.48 (C)', () => {
    const a = grade()
    expect(a.defence).toBe(0.2)
    expect(a.offence).toBe(0.28)
    expect(a.score).toBe(0.48)
    expect(a.tier).toBe('C')
  })

  it('gives "of Ephij" (lightning 74 -> 76) +0.15 and "of Bameth" (chaos 69 -> 75) nothing', () => {
    const ephij = grade(whatIfDefense(defense, { lightning: 76 }))
    const bameth = grade(whatIfDefense(defense, { chaos: 75 }))
    expect(ephij.score).toBe(0.63)
    expect(ephij.tier).toBe('B')
    expect(bameth.score).toBe(0.48)
    expect(ephij.score!).toBeGreaterThan(bameth.score!)
  })
})
