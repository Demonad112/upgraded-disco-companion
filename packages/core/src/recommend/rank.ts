/**
 * One ranking for every finding (audit items 6-9).
 *
 * A finding's gain is measured in the build score's own units, from ninja's
 * figures only: Δgrade (the defence half of `assessBuild`, unrounded), then
 * Δ lowest maximum hit, then ΔDPS. A gain nothing can measure stays null and
 * ranks after every measured one; it is never filled with a guess.
 */

import type { DefenseSummary } from '../defense/index.js'
import { whatIfDefense } from '../defense/whatif.js'
import { NO_KEYSTONE_EFFECTS, type KeystoneEffects } from '../keystones/index.js'
import { defenceParts } from '../score/index.js'
import type { Cost, CostKind, Recommendation } from './types.js'

/**
 * Relative cost weights, the only copy. Judgement values, not data: free work
 * is weighted at half the cheapest paid kind. Gear means owned or swappable;
 * currency means it must be bought or crafted. Unknown cost has no weight: it
 * is its own group, ranked after every known cost.
 */
export const COST_WEIGHT: Readonly<Record<Exclude<CostKind, 'unknown'>, number>> = Object.freeze({
  free: 0.5,
  passive: 2,
  gear: 4,
  currency: 5,
})

/** Significance per unit of cost. Unknown cost is not divided: it is ranked in its own group. */
export function costScore(significance: number, cost: Pick<Cost, 'kind' | 'amount'>): number {
  if (cost.kind === 'unknown') return significance
  return significance / (COST_WEIGHT[cost.kind] * Math.max(1, cost.amount))
}

const RESISTANCE_STAT = /^(fire|cold|lightning|chaos)Resistance$/

const lowestHit = (d: Pick<DefenseSummary, 'maxHits'>, keystones: KeystoneEffects) => {
  const hits = d.maxHits.filter((h) => h.value > 0 && !(keystones.chaosImmune && h.type === 'chaos'))
  return hits.length ? Math.min(...hits.map((h) => h.value)) : null
}

/**
 * The defence after a finding is taken, or null when its effect on the
 * defence cannot be derived from ninja's figures.
 *
 * - A resistance finding moves that resistance to its `impact.to` (`whatIfDefense`).
 * - A maximum-hit finding with a point estimate (`impact.label` not a ceiling)
 *   sets that type's maximum hit to `impact.to`.
 */
export function defenceAfter(rec: Recommendation, defense: DefenseSummary): DefenseSummary | null {
  const impact = rec.impact
  if (!impact) return null
  const res = RESISTANCE_STAT.exec(impact.stat)
  if (res) return whatIfDefense(defense, { [res[1]!]: impact.to })
  const hit = /^(physical|fire|cold|lightning|chaos)MaximumHitTaken$/.exec(impact.stat)
  if (hit) {
    const type = hit[1]
    const maxHits = defense.maxHits.map((h) => (h.type === type ? { ...h, value: impact.to } : h))
    const lowest = Math.min(...maxHits.map((h) => h.value))
    return { ...defense, maxHits, lowestMaximumHit: lowest }
  }
  return null
}

/**
 * Fill `measured` on each finding: Δgrade and Δ lowest max hit from the
 * defence it would leave, ΔDPS only where ninja supplies one (it does not
 * today, so it stays null: "not measured").
 */
export function measureRecommendations(
  recs: Recommendation[],
  defense: DefenseSummary,
  keystones: KeystoneEffects = NO_KEYSTONE_EFFECTS,
): Recommendation[] {
  const before = defenceParts(defense, keystones).total
  const beforeHit = lowestHit(defense, keystones)
  for (const rec of recs) {
    const after = defenceAfter(rec, defense)
    if (!after) {
      rec.measured = { grade: null, lowestMaxHit: null, dps: null }
      continue
    }
    const afterHit = lowestHit(after, keystones)
    rec.measured = {
      grade: defenceParts(after, keystones).total - before,
      lowestMaxHit: afterHit !== null && beforeHit !== null ? afterHit - beforeHit : null,
      dps: null,
    }
  }
  return recs
}

/** Δgrade per unit of cost, or null when Δgrade is not measured. */
function gradePerCost(r: Recommendation): number | null {
  const g = r.measured?.grade
  if (g === null || g === undefined) return null
  return costScore(g, r.cost)
}

const desc = (a: number | null | undefined, b: number | null | undefined) =>
  (a == null ? 1 : 0) - (b == null ? 1 : 0) || (b ?? 0) - (a ?? 0)

/**
 * Known cost before unknown cost; then Δgrade per unit of cost, Δ lowest max
 * hit and ΔDPS (each measured before unmeasured); then the old significance
 * score as the last tie-break.
 */
export function compareRecommendations(a: Recommendation, b: Recommendation): number {
  return (
    Number(a.cost.kind === 'unknown') - Number(b.cost.kind === 'unknown') ||
    desc(gradePerCost(a), gradePerCost(b)) ||
    desc(a.measured?.lowestMaxHit, b.measured?.lowestMaxHit) ||
    desc(a.measured?.dps, b.measured?.dps) ||
    b.score - a.score
  )
}

/** "score +0.12", or "under +0.01" when the gain is real but rounds away. */
export function gradeGainText(grade: number | null | undefined): string {
  if (grade === null || grade === undefined) return 'score gain not measured'
  if (grade <= 0) return 'no score gain'
  return grade < 0.005 ? 'score under +0.01' : `score +${grade.toFixed(2)}`
}
