/**
 * Easy wins: the merged findings ranked by effort first, then by how much of
 * the character's own measured gap each one closes.
 *
 * Nothing here is priced or guessed. A win's value is the axis weight the
 * score already uses (`PRIORITY_WEIGHTS`) times the share of a gap it closes,
 * where the gap is read from the defence summary or the replacement ranking.
 * Anything that cannot be measured is reported in `missing` with `value: null`.
 */

import type { DefenseSummary } from '../defense/index.js'
import type { ReplacementPriority } from '../gear/priority.js'
import { PRIORITY_WEIGHTS, type ScorePriority } from '../upgrade/scoring.js'
import { axisOf } from './axis.js'
import { COST_WEIGHT } from './index.js'
import type { Cost, CostKind, Recommendation } from './types.js'

export type EffortGroup = CostKind

export interface EasyWinsInput {
  /** The merged list, as shown on the page. */
  recommendations: readonly Recommendation[]
  defense: Pick<DefenseSummary, 'resistances' | 'maxHits' | 'lowestMaximumHit'>
  /** `rankReplacements(...).ranked`. */
  replacements: readonly ReplacementPriority[]
  /** Default `balanced`. */
  priority?: ScorePriority
}

export interface EasyWin {
  id: string
  action: string
  effort: EffortGroup
  cost: Cost
  gapKind: 'resistance' | 'killed-by' | 'affix-slots'
  /** Size of the gap this kind of finding works on, in the gap's own unit. */
  gap: number
  /** How much of it this finding closes (never more than the gap). */
  closed: number
  /** `closed / gap`; 0 when there is no gap. */
  share: number
  /** Axis weight x share. Null when an input is missing. */
  value: number | null
  /** `upper` when the figure is a ceiling rather than a point estimate. */
  bound: 'point' | 'upper'
  missing: string[]
}

export interface EasyWinsReport {
  wins: EasyWin[]
  missing: { id: string; reason: string }[]
}

type GapKind = EasyWin['gapKind']

const RESISTANCE_STAT = /^(fire|cold|lightning|chaos)Resistance$/

function gapKindOf(stat: string): GapKind | null {
  if (RESISTANCE_STAT.test(stat)) return 'resistance'
  if (stat === 'lowestMaximumHitTaken') return 'killed-by'
  if (stat === 'affixSlotsUsed') return 'affix-slots'
  return null
}

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0)

/** Rank findings by effort, then by the share of the character's gap they close. */
export function rankEasyWins(input: EasyWinsInput): EasyWinsReport {
  const weights = PRIORITY_WEIGHTS[input.priority ?? 'balanced']
  const { defense, replacements } = input
  const missing: EasyWinsReport['missing'] = []

  const resGap = sum(defense.resistances.map((r) => r.underCap ?? 0))
  const maxHit = defense.maxHits.length ? Math.max(...defense.maxHits.map((m) => m.value)) : null
  const killedByGap =
    maxHit !== null && defense.lowestMaximumHit !== null ? Math.max(0, maxHit - defense.lowestMaximumHit) : null
  const affixGap = sum(replacements.map((r) => r.openSlots ?? 0))
  const unknownSlots = replacements.filter((r) => r.openSlots === null).map((r) => r.itemName)

  const wins: EasyWin[] = []
  for (const rec of input.recommendations) {
    if (rec.category === 'question') continue
    if (!rec.impact) {
      missing.push({ id: rec.id, reason: 'no measured impact' })
      continue
    }
    const { stat, delta } = rec.impact
    const gapKind = gapKindOf(stat)
    if (!gapKind) {
      missing.push({ id: rec.id, reason: `no gap is measured for ${stat}` })
      continue
    }

    const why: string[] = []
    let gap: number | null
    let closed = 0
    if (gapKind === 'resistance') {
      gap = resGap
      const type = RESISTANCE_STAT.exec(stat)![1]
      const res = defense.resistances.find((r) => r.type === type)
      if (!res || res.underCap === null) {
        gap = null
        why.push(`${type} resistance not reported`)
      } else closed = Math.min(delta, res.underCap)
    } else if (gapKind === 'killed-by') {
      gap = killedByGap
      if (gap === null) why.push('maximum hits not reported')
      else closed = Math.min(delta, gap)
    } else {
      gap = affixGap
      closed = Math.min(delta, gap)
      for (const name of unknownSlots) why.push(`open affix slots unknown for ${name}`)
    }

    const axis = axisOf(rec)
    if (axis === 'unclassified') why.push('no axis weight')
    if (rec.cost.kind === 'unknown') why.push('cost unknown')

    const share = gap ? closed / gap : 0
    const measurable = gap !== null && axis !== 'unclassified' && rec.cost.kind !== 'unknown'
    wins.push({
      id: rec.id,
      action: rec.action,
      effort: rec.cost.kind,
      cost: rec.cost,
      gapKind,
      gap: gap ?? 0,
      closed,
      share,
      value: measurable ? weights[axis] * share : null,
      bound: rec.id.startsWith('one-shot-') ? 'upper' : 'point',
      missing: why,
    })
    for (const reason of why) missing.push({ id: rec.id, reason })
  }

  const scoreOf = new Map(input.recommendations.map((r) => [r.id, r.score]))
  const score = (w: EasyWin) => scoreOf.get(w.id) ?? 0
  wins.sort(
    (a, b) =>
      COST_WEIGHT[a.effort] - COST_WEIGHT[b.effort] ||
      (a.value === null ? 1 : 0) - (b.value === null ? 1 : 0) ||
      (b.value ?? 0) - (a.value ?? 0) ||
      (a.bound === b.bound ? 0 : a.bound === 'point' ? -1 : 1) ||
      score(b) - score(a) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  )
  return { wins, missing }
}
