/**
 * Easy wins: merged findings ranked by effort, then by the share of the
 * character's own gap they close. Numbers come from the two captured fixtures.
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
import { COST_WEIGHT, rankEasyWins, recommend, type EasyWinsInput, type Recommendation } from '../src/recommend/index.js'

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
  it('is exported with the engine values', () => {
    expect(COST_WEIGHT).toEqual({ free: 0.5, passive: 2, gear: 4, currency: 5, unknown: 6 })
  })
})

describe('Yykiuy worked examples', () => {
  it('gear-swap-chaos closes 6 of an 8 point resistance gap', () => {
    const w = win(yk.report, 'gear-swap-chaos')
    expect(w).toMatchObject({ effort: 'gear', gapKind: 'resistance', gap: 8, closed: 6, share: 0.75, value: 0.375, bound: 'point', missing: [] })
  })

  it('one-shot-physical is an upper bound of the whole killed-by gap', () => {
    const w = win(yk.report, 'one-shot-physical')
    expect(w).toMatchObject({ effort: 'gear', gapKind: 'killed-by', gap: 14727, closed: 14727, share: 1, value: 0.5, bound: 'upper', missing: [] })
  })

  it('has no open-affix win: Demon Pendant is full once its slot modifiers are applied (CF1 item 2)', () => {
    expect(yk.report.wins.find((w) => w.id === 'gear-open-affixes')).toBeUndefined()
  })

  it('orders by effort, then value', () => {
    expect(yk.report.wins.map((w) => [w.id, w.effort, w.value, w.bound])).toEqual([
      ['one-shot-physical', 'gear', 0.5, 'upper'],
      ['gear-swap-chaos', 'gear', 0.375, 'point'],
    ])
  })

  it('priority changes the weight, not the order of gap shares', () => {
    const r = rankEasyWins({ ...yk.input, priority: 'defence' })
    expect(win(r, 'gear-swap-chaos').value).toBeCloseTo(0.5625, 10)
    expect(win(r, 'one-shot-physical').value).toBe(0.75)
  })
})

describe('Athrynas', () => {
  it('ranks from real output', () => {
    expect(at.report.wins.map((w) => [w.id, w.effort, w.bound])).toEqual([
      ['one-shot-chaos', 'gear', 'upper'],
      ['gear-swap-chaos', 'gear', 'point'],
      ['gear-swap-cold', 'gear', 'point'],
    ])
    expect(win(at.report, 'one-shot-chaos')).toMatchObject({ gap: 10803, closed: 10803, value: 0.5 })
    const chaos = win(at.report, 'gear-swap-chaos')
    expect(chaos).toMatchObject({ gap: 58, closed: 27 })
    expect(chaos.value).toBeCloseTo(0.5 * (27 / 58), 12)
    expect(win(at.report, 'gear-swap-cold').value).toBeCloseTo(0.5 / 58, 12)
  })

  it('reports unmeasured findings instead of ranking them', () => {
    const reasons = Object.fromEntries(at.report.missing.map((m) => [m.id, m.reason]))
    expect(reasons['anoint-unused']).toBe('no gap is measured for anoints')
    expect(reasons['weapon-ilvl-lag']).toBe('no gap is measured for weaponItemLevel')
    expect(reasons['armour-negligible']).toBe('no measured impact')
    expect(reasons['dps-crit-uninvested']).toBe('no measured impact')
    expect(at.report.wins.some((w) => w.id === 'weapon-set-idle')).toBe(false)
    expect(at.report.missing.some((m) => m.id === 'weapon-set-idle')).toBe(false)
  })
})

describe('missing inputs', () => {
  const base = yk.input
  const rec = (over: Partial<Recommendation> & { stat?: string; delta?: number }): Recommendation => {
    const { stat = 'chaosResistance', delta = 6, ...rest } = over
    return {
      ...win0(),
      impact: { stat, label: stat, from: 0, to: delta, delta, unit: 'points', significance: 0.1 },
      ...rest,
    }
  }
  const win0 = (): Recommendation => ({
    id: 'x',
    category: 'survivability',
    action: 'do x',
    rationale: '',
    impact: null,
    cost: { kind: 'gear', amount: 1, detail: '' },
    tradeoff: null,
    evidence: [],
    provenance: yk.analysis.recommendations.recommendations[0]!.provenance,
    score: 0.1,
  })

  it('unclassified axis gives value null and a missing entry', () => {
    const r = rankEasyWins({ ...base, recommendations: [rec({ category: 'gear', stat: 'affixSlotsUsed', delta: 1 })] })
    expect(r.wins[0]!.value).toBeNull()
    expect(r.missing).toContainEqual({ id: 'x', reason: 'no axis weight' })
  })

  it('unknown cost gives value null, last effort, and a missing entry', () => {
    const r = rankEasyWins({
      ...base,
      recommendations: [
        rec({ id: 'u', cost: { kind: 'unknown', amount: 1, detail: '' } }),
        rec({ id: 'f', cost: { kind: 'free', amount: 0, detail: '' } }),
      ],
    })
    expect(r.wins.map((w) => w.id)).toEqual(['f', 'u'])
    expect(r.wins[1]!.value).toBeNull()
    expect(r.missing).toContainEqual({ id: 'u', reason: 'cost unknown' })
  })

  it('null openSlots are listed, not counted', () => {
    const r = rankEasyWins({
      ...base,
      recommendations: [rec({ category: 'survivability', stat: 'affixSlotsUsed', delta: 1 })],
    })
    expect(r.wins[0]!.gap).toBe(0)
    expect(r.wins[0]!.missing.filter((m) => m.startsWith('open affix slots unknown'))).toHaveLength(2)
  })

  it('unreported resistance or hits give value null', () => {
    const noRes = rankEasyWins({
      ...base,
      defense: { ...base.defense, resistances: base.defense.resistances.map((r) => ({ ...r, value: null, underCap: null })) },
      recommendations: [rec({})],
    })
    expect(noRes.wins[0]!.value).toBeNull()
    expect(noRes.wins[0]!.missing).toContain('chaos resistance not reported')
    const noHits = rankEasyWins({
      ...base,
      defense: { ...base.defense, maxHits: [], lowestMaximumHit: null },
      recommendations: [rec({ stat: 'lowestMaximumHitTaken', delta: 100 })],
    })
    expect(noHits.wins[0]).toMatchObject({ value: null, gap: 0, share: 0 })
    expect(noHits.wins[0]!.missing).toContain('maximum hits not reported')
  })

  it('capped resistances give an empty gap and no division by zero', () => {
    const capped = {
      ...base,
      defense: {
        ...base.defense,
        resistances: base.defense.resistances.map((r) => ({ ...r, underCap: 0, capped: true })),
      },
      recommendations: [rec({})],
    }
    const w = rankEasyWins(capped).wins[0]!
    expect(w).toMatchObject({ gap: 0, closed: 0, share: 0, value: 0 })
    expect(Number.isFinite(w.value!)).toBe(true)
  })

  it('breaks ties by bound, score, then id', () => {
    const mk = (id: string, score: number, over = {}) => rec({ id, score, ...over })
    const r = rankEasyWins({
      ...base,
      recommendations: [
        mk('b', 0.1),
        mk('a', 0.1),
        mk('c', 0.5),
        mk('one-shot-z', 0.1, { impact: { stat: 'lowestMaximumHitTaken', label: '', from: 0, to: 0, delta: 0, unit: 'flat', significance: 0 } }),
      ],
    })
    // 'one-shot-z' closes nothing (value 0) so it sorts after the 0.375 findings.
    expect(r.wins.map((w) => w.id)).toEqual(['c', 'a', 'b', 'one-shot-z'])
    const twin = rankEasyWins({
      ...base,
      recommendations: [
        mk('one-shot-a', 0.1, { impact: { stat: 'lowestMaximumHitTaken', label: '', from: 0, to: 1, delta: 0, unit: 'flat', significance: 0 } }),
        mk('p', 0.1, { impact: { stat: 'chaosResistance', label: '', from: 0, to: 0, delta: 0, unit: 'points', significance: 0 } }),
      ],
    })
    expect(twin.wins.map((w) => w.id)).toEqual(['p', 'one-shot-a'])
  })
})

describe('add-only', () => {
  it('does not mutate its inputs', () => {
    const before = JSON.stringify(yk.input)
    rankEasyWins(yk.input)
    expect(JSON.stringify(yk.input)).toBe(before)
  })

  it('leaves recommend() output stable', async () => {
    const a = await load('yykiuy-v51')
    expect(a.analysis.recommendations.recommendations.map((r) => r.id)).toEqual([
      'one-shot-physical',
      'gear-swap-chaos',
    ])
    expect(typeof recommend).toBe('function')
  })
})
