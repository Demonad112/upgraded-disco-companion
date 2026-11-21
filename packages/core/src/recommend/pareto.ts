/**
 * Cost versus gain, as a view beside the ranked list (GF1 plan item 6).
 *
 * `rank.ts` order is untouched: `frontier` and `dominated` keep the order of
 * the list they were given. A finding is dominated only when another finding
 * with BOTH a known cost and a measured Δgrade costs no more and gains no less,
 * and is strictly better on one. A finding with an unknown cost or an
 * unmeasured gain is never dominated and never dominates: its cost is not
 * free and its gain is not zero, so it goes in `unplaced` with the reason.
 *
 * Cost is the same scalar `rank.ts` divides by (`COST_WEIGHT` times amount),
 * so the two views cannot disagree about what is cheap. Gain is the measured
 * Δgrade only, from poe.ninja's figures; ΔDPS stays unmeasured.
 */

import { COST_WEIGHT } from '../thresholds.js'
import type { Recommendation } from './types.js'

export type GainLabel = 'exact' | 'missing'

export interface ParetoPoint {
  rec: Recommendation
  /** Relative cost on `COST_WEIGHT`'s scale. Null when the cost is unknown. */
  cost: number | null
  /** Measured Δgrade. Null when not measured. */
  gain: number | null
  gainLabel: GainLabel
}

export interface ParetoView {
  /** Not beaten on cost and gain by any other placed finding, in rank order. */
  frontier: ParetoPoint[]
  /** Beaten on both by a placed finding, in rank order, with the finding that beats it. */
  dominated: { point: ParetoPoint; by: string }[]
  /** Cost unknown or gain not measured: cannot be placed, never dropped. */
  unplaced: { point: ParetoPoint; reason: string }[]
}

function pointOf(rec: Recommendation): ParetoPoint {
  const cost = rec.cost.kind === 'unknown' ? null : COST_WEIGHT[rec.cost.kind] * Math.max(1, rec.cost.amount)
  const gain = rec.measured?.grade ?? null
  return { rec, cost, gain, gainLabel: gain === null ? 'missing' : 'exact' }
}

const beats = (a: ParetoPoint, b: ParetoPoint) =>
  a.cost! <= b.cost! && a.gain! >= b.gain! && (a.cost! < b.cost! || a.gain! > b.gain!)

export function paretoView(ranked: readonly Recommendation[]): ParetoView {
  const points = ranked.map(pointOf)
  const placed = points.filter((p) => p.cost !== null && p.gain !== null)
  const view: ParetoView = { frontier: [], dominated: [], unplaced: [] }
  for (const p of points) {
    if (p.cost === null || p.gain === null) {
      view.unplaced.push({ point: p, reason: p.cost === null ? 'cost unknown' : 'gain not measured' })
      continue
    }
    const winner = placed.find((q) => q !== p && beats(q, p))
    if (winner) view.dominated.push({ point: p, by: winner.rec.id })
    else view.frontier.push(p)
  }
  return view
}
