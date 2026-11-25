/**
 * Batch 2.4: what the site shows from the core-only Batch 2 output, on both reference codes. The gear axis is the
 * mean of the graded slots on the gear score's S–D bands; at most five swaps, each with up to three options; each
 * resistance's over-cap shared across the lines that spend it (closes plan "What Batch 2 still lacks" item 3).
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { analyzeCharacter } from '../src/analyze.js'
import { gearReview } from '../src/advice/gear-review.js'
import { ModTiers, type ModTierData, type MonkGloveEntry } from '../src/gear/tiers.js'
import { SupportCatalog } from '../src/gems/catalog.js'
import { pobToCharModel } from '../src/pob/to-model.js'
import { GEAR_SCORE } from '../src/thresholds.js'

const data = (f: string) => JSON.parse(readFileSync(fileURLToPath(new URL(`../../data/generated/${f}`, import.meta.url)), 'utf8')) as unknown
const tiers = new ModTiers(data('mod-tiers.json') as ModTierData).withMonkGloves(data('monk-gloves.json') as MonkGloveEntry[])
const catalog = new SupportCatalog(data('pob-skills.json') as ConstructorParameters<typeof SupportCatalog>[0])

describe.each(['ninja-default', 'pob2-own'])('gearReview on %s', async (name) => {
  const code = readFileSync(fileURLToPath(new URL(`reference/${name}/code.txt`, import.meta.url)), 'utf8').trim()
  const analysis = await analyzeCharacter(await pobToCharModel(code), { source: 'pob-export', tiers, catalog })
  const review = gearReview({ analysis, tiers, skillTypes: catalog.activeTypes(analysis.dps.primary!.name) })

  it('grades the gear axis as the mean of the graded slots, and counts the ungraded ones', () => {
    const graded = review.report.slots.filter((s) => s.score !== null)
    expect(review.axis.graded).toBe(7)
    expect(review.axis.total).toBe(9)
    const mean = Math.round((graded.reduce((n, s) => n + s.score!, 0) / graded.length) * 10) / 10
    expect(review.axis.score).toBe(mean)
    expect(review.axis).toMatchObject({ score: 56.3, grade: 'B' })
  })

  it('offers at most five swaps, each with up to three options', () => {
    expect(review.swaps.length).toBeGreaterThan(0)
    expect(review.swaps.length).toBeLessThanOrEqual(GEAR_SCORE.swapShown)
    for (const s of review.swaps) expect(s.candidates.length).toBeLessThanOrEqual(3)
  })

  it('shares each resistance’s over-cap across the lines that spend it: Cold 59 = Boots 36 + Ring 2 23', () => {
    const cold = review.overCap.find((o) => o.type === 'cold')!
    expect(cold).toMatchObject({ overCap: 59, lines: [{ slotLabel: 'Boots', amount: 36 }, { slotLabel: 'Ring 2', amount: 23 }] })
    expect(cold.sentence).toBe('Cold is 59% over the cap: Boots 36%, Ring 2 23%.')
    expect(review.overCap.map((o) => o.type)).toEqual(['fire', 'cold', 'lightning'])
  })
})
