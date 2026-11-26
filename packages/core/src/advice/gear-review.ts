/**
 * What the site shows from Batch 2 (the V1 plan (deleted; `git show 2e9c146:docs/plans/simple-code-analysis.md`), 2.4): the gear axis, the per-slot
 * table, at most `GEAR_SCORE.swapShown` stat swaps (each with up to `swapCandidates` options), and each
 * resistance's over-cap shared across the lines that spend it. One call, so every tab reads the same numbers.
 *
 * Pure: the analysis, the mod tiers and the main skill's tags in; nothing is simulated.
 */

import type { Analysis } from '../analyze.js'
import type { ResistanceState } from '../defense/index.js'
import { analyzeItem } from '../gear/analyze.js'
import { gradeFor, resistanceTypesOf, scoreGear, type GearScoreReport, type Grade } from '../gear/score.js'
import type { ModTiers } from '../gear/tiers.js'
import { GEAR_SCORE } from '../thresholds.js'
import { findStatSwaps, type StatSwap } from './swaps.js'

export interface OverCapShare {
  type: ResistanceState['type']
  /** The code's over-cap for this resistance. */
  overCap: number
  /** The item lines that spend it, biggest first, as `scoreGear` spent it. */
  lines: { slotLabel: string; amount: number }[]
  /** Over-cap no item line accounts for (tree, jewels, charms, buffs). */
  other: number
  sentence: string
}

export interface GearReview {
  report: GearScoreReport
  /** Mean of the graded slots on the gear score's S–D bands. Null when no slot was graded. */
  axis: { score: number | null; grade: Grade | null; graded: number; total: number }
  swaps: StatSwap[]
  overCap: OverCapShare[]
}

export interface GearReviewInput {
  analysis: Pick<Analysis, 'items' | 'defense' | 'model'>
  tiers: ModTiers
  /** The main skill's tags (`SupportCatalog.activeTypes`). Null when the catalogue has not loaded. */
  skillTypes: ReadonlySet<string> | null
}

export function gearReview({ analysis, tiers, skillTypes }: GearReviewInput): GearReview {
  const items = analysis.items.map((i) => analyzeItem(i, tiers))
  const resistances = analysis.defense.resistances
  const report = scoreGear({ items, tiers, defensive: analysis.model.defensiveStats, skillTypes, resistances })
  const graded = report.slots.filter((s) => s.score !== null)
  const mean = graded.length ? Math.round((graded.reduce((n, s) => n + s.score!, 0) / graded.length) * 10) / 10 : null
  const swaps = findStatSwaps({ report, items, tiers, resistances }).slice(0, GEAR_SCORE.swapShown)

  const overCap: OverCapShare[] = []
  for (const r of resistances) {
    if (typeof r.overCap !== 'number' || r.overCap <= 0) continue
    const lines = report.slots
      .flatMap((s) => s.wasted)
      .filter((w) => w.kind === 'over-cap' && (w.amount ?? 0) > 0 && resistanceTypesOf(w.statId).includes(r.type))
      .map((w) => ({ slotLabel: w.slotLabel, amount: w.amount! }))
      .sort((a, b) => b.amount - a.amount)
    const other = Math.max(0, r.overCap - lines.reduce((n, l) => n + l.amount, 0))
    const parts = [...lines.map((l) => `${l.slotLabel} ${l.amount}%`), ...(other > 0 ? [`other sources ${other}%`] : [])]
    overCap.push({ type: r.type, overCap: r.overCap, lines, other, sentence: `${cap(r.type)} is ${r.overCap}% over the cap: ${parts.join(', ')}.` })
  }

  return { report, axis: { score: mean, grade: mean === null ? null : gradeFor(mean), graded: graded.length, total: report.slots.length }, swaps, overCap }
}

const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1)
