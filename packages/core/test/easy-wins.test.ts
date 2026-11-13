/**
 * Easy wins: merged findings ranked by effort, then by measured score gain
 * (Δgrade, Δ lowest max hit, ΔDPS; CF2, audit item 8). Numbers come from the
 * two captured fixtures, through `whatIfDefense` and the score rubric.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { analyzeCharacter } from '../src/analyze.js'
import { analyzeItem } from '../src/gear/analyze.js'
import { rankReplacements } from '../src/gear/priority.js'
import { ModTiers, type ModTierData } from '../src/gear/tiers.js'
import { normalizeItems } from '../src/model/slots.js'
import { COST_WEIGHT, rankEasyWins, type EasyWinsInput, type Recommendation } from '../src/recommend/index.js'

const here = dirname(fileURLToPath(import.meta.url))
const tiers = new ModTiers(
  JSON.parse(readFileSync(join(here, '..', '..', 'data', 'generated', 'mod-tiers.json'), 'utf8')) as ModTierData,
)

async function load(name: string) {
  const payload = JSON.parse(readFileSync(join(here, 'fixtures', `${name}.json`), 'utf8'))
  const analysis = await analyzeCharacter(payload, { tiers })
  const items = normalizeItems(payload.charModel ?? payload)
    .filter((i) => i.active)
    .map((i) => analyzeItem(i, tiers, analysis.defense))
  const replacements = rankReplacements(items, analysis.defense, analysis.attribution).ranked
  const input: EasyWinsInput = {
    recommendations: analysis.recommendations.recommendations,
    defense: analysis.defense,
    replacements,
  }
  return { analysis, input, report: rankEasyWins(input) }
}

const yk = await load('yykiuy-v51')
const at = await load('athrynas-v43')
const win = (r: typeof yk.report, id: string) => r.wins.find((w) => w.id === id)!

describe('COST_WEIGHT', () => {
  it('is the one copy, with no weight for unknown cost', () => {
    expect(COST_WEIGHT).toEqual({ free: 0.5, passive: 2, gear: 4, currency: 5 })
  })
})

describe('Yykiuy worked examples', () => {
  it('one-shot-physical: +3,252 life or ES lifts the lowest max hit by 3,252 and the score by 0.12', () => {
    const w = win(yk.report, 'one-shot-physical')
    expect(w).toMatchObject({ effort: 'gear', lowestMaxHit: 3252, dps: null, missing: [] })
    expect(w.grade).toBeCloseTo(0.3 - (0.3 * (4399 - 2000)) / 4000, 10)
  })

  it('gear-swap-chaos: chaos 69 -> 75 is worth 0.05 x (1 - 25/31)', () => {
    const w = win(yk.report, 'gear-swap-chaos')
    expect(w).toMatchObject({ effort: 'gear', lowestMaxHit: 0, dps: null, missing: [] })
    expect(w.grade).toBeCloseTo(0.05 * (1 - 25 / 31), 10)
  })

  it('has no open-affix win: Demon Pendant is full once its slot modifiers are applied (CF1 item 2)', () => {
    expect(yk.report.wins.find((w) => w.id === 'gear-open-affixes')).toBeUndefined()
  })

  it('orders by effort, then score gain', () => {
    expect(yk.report.wins.map((w) => w.id)).toEqual(['one-shot-physical', 'gear-swap-chaos'])
  })
})

describe('Athrynas', () => {
  it('ranks measured gains first within an effort, and unknown cost last', () => {
    expect(at.report.wins.map((w) => [w.id, w.effort])).toEqual([
      ['gear-swap-chaos', 'gear'],
      ['gear-swap-cold', 'gear'],
      ['weapon-ilvl-lag', 'gear'],
      ['one-shot-chaos', 'gear'],
      ['anoint-unused', 'currency'],
      ['armour-negligible', 'unknown'],
      ['dps-crit-uninvested', 'unknown'],
    ])
  })

  it('reports unmeasured findings instead of inventing a gain', () => {
    const w = win(at.report, 'one-shot-chaos')
    expect(w.grade).toBeNull()
    expect(at.report.missing).toContainEqual({ id: 'one-shot-chaos', reason: 'score gain not measured' })
    expect(at.report.missing).toContainEqual({ id: 'armour-negligible', reason: 'cost unknown' })
  })
})

describe('missing inputs', () => {
  const rec = (id: string, over: Partial<Recommendation> = {}): Recommendation => ({
    id,
    category: 'gear',
    action: id,
    rationale: '',
    impact: null,
    cost: { kind: 'gear', amount: 1, currencyTier: 'low', detail: '' },
    tradeoff: null,
    evidence: [],
    provenance: 'ninja',
    score: 0,
    ...over,
  })
  const input = (recommendations: Recommendation[]): EasyWinsInput => ({
    recommendations,
    defense: { resistances: [], maxHits: [], lowestMaximumHit: null },
    replacements: [],
  })

  it('skips questions', () => {
    expect(rankEasyWins(input([rec('q', { category: 'question' })])).wins).toEqual([])
  })

  it('a finding with no measured gain gets grade null and a missing entry', () => {
    const r = rankEasyWins(input([rec('a')]))
    expect(r.wins[0]).toMatchObject({ grade: null, lowestMaxHit: null, dps: null })
    expect(r.missing).toEqual([{ id: 'a', reason: 'score gain not measured' }])
  })

  it('unknown cost ranks after every known effort, whatever its gain', () => {
    const r = rankEasyWins(
      input([
        rec('u', { cost: { kind: 'unknown', amount: 1, currencyTier: 'low', detail: '' }, measured: { grade: 0.3, lowestMaxHit: 1, dps: null } }),
        rec('c', { cost: { kind: 'currency', amount: 1, currencyTier: 'low', detail: '' } }),
      ]),
    )
    expect(r.wins.map((w) => w.id)).toEqual(['c', 'u'])
    expect(r.missing).toContainEqual({ id: 'u', reason: 'cost unknown' })
  })

  it('breaks ties by score gain, lowest max hit, score, then id', () => {
    const m = (grade: number | null, lowestMaxHit: number | null) => ({ measured: { grade, lowestMaxHit, dps: null } })
    const r = rankEasyWins(
      input([
        rec('d', { ...m(null, null), score: 2 }),
        rec('c', { ...m(null, null), score: 2 }),
        rec('b', m(0.01, 0)),
        rec('a', m(0.01, 100)),
        rec('e', m(0.02, 0)),
      ]),
    )
    expect(r.wins.map((w) => w.id)).toEqual(['e', 'a', 'b', 'c', 'd'])
  })
})
