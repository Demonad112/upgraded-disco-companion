/**
 * Easy wins: the merged findings ranked by effort first, then by measured gain
 * in the build score's own units (audit item 8): Δgrade, then Δ lowest maximum
 * hit, then ΔDPS, as `measureRecommendations` filled them in.
 *
 * Nothing here is priced or guessed. A finding whose gain cannot be measured is
 * kept, with `grade: null`, and listed in `missing`.
 */

import type { DefenseSummary } from '../defense/index.js'
import type { ReplacementPriority } from '../gear/priority.js'
import type { ScorePriority } from '../upgrade/scoring.js'
import { COST_WEIGHT } from './rank.js'
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
  /** Δ build score (defence half, unrounded). Null when not measured. */
  grade: number | null
  /** Δ lowest maximum hit. Null when not measured. */
  lowestMaxHit: number | null
  /** ΔDPS. Null unless poe.ninja supplies it. */
  dps: number | null
  missing: string[]
}

export interface EasyWinsReport {
  wins: EasyWin[]
  missing: { id: string; reason: string }[]
}

const effortRank = (k: CostKind) => (k === 'unknown' ? Infinity : COST_WEIGHT[k])
const desc = (a: number | null, b: number | null) => (a === null ? 1 : 0) - (b === null ? 1 : 0) || (b ?? 0) - (a ?? 0)

/** Rank findings by effort (unknown last), then by measured gain. */
export function rankEasyWins(input: EasyWinsInput): EasyWinsReport {
  const missing: EasyWinsReport['missing'] = []
  const wins: EasyWin[] = []
  for (const rec of input.recommendations) {
    if (rec.category === 'question') continue
    const m = rec.measured ?? { grade: null, lowestMaxHit: null, dps: null }
    const why: string[] = []
    if (m.grade === null) why.push('score gain not measured')
    if (rec.cost.kind === 'unknown') why.push('cost unknown')
    wins.push({
      id: rec.id,
      action: rec.action,
      effort: rec.cost.kind,
      cost: rec.cost,
      grade: m.grade,
      lowestMaxHit: m.lowestMaxHit,
      dps: m.dps,
      missing: why,
    })
    for (const reason of why) missing.push({ id: rec.id, reason })
  }

  const scoreOf = new Map(input.recommendations.map((r) => [r.id, r.score]))
  const score = (w: EasyWin) => scoreOf.get(w.id) ?? 0
  wins.sort(
    (a, b) =>
      effortRank(a.effort) - effortRank(b.effort) ||
      desc(a.grade, b.grade) ||
      desc(a.lowestMaxHit, b.lowestMaxHit) ||
      desc(a.dps, b.dps) ||
      score(b) - score(a) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  )
  return { wins, missing }
}
