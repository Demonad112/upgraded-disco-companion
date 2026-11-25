/**
 * The defence axis (plan `docs/plans/simple-code-analysis.md`, Batch 2.4): the defence half of `assessBuild`,
 * unchanged, graded on its own out of its weight with the gear S–D scale, plus up to three beginner tips in
 * `docs/COPY.md` voice (action first, one reason).
 *
 * Tip order follows the assessment's headline: what kills first (a weak hit type, lowest first), then uncapped
 * elemental resistances (biggest extra damage taken first), then chaos resistance. Pure; every figure is the
 * code's own.
 */

import type { DefenseSummary, ResistanceState } from '../defense/index.js'
import { gradeFor, type Grade } from '../gear/grade.js'
import { DEFENCE_PART_WEIGHTS, DEFENCE_WEIGHT, WEAK_HIT_RATIO } from '../thresholds.js'
import { resGapDamageTaken, type BuildAssessment } from './index.js'

export interface DefenceTip {
  kind: 'weak-hit' | 'res-gap' | 'chaos-gap'
  type: DefenseSummary['maxHits'][number]['type']
  text: string
}

export interface DefenceAxis {
  /** 0–1: the defence half over its weight. Null when part of it went ungraded; read `range`. */
  score: number | null
  grade: Grade | null
  range: { min: number; max: number; worst: Grade; best: Grade } | null
  /** The letter to show: `A`, or `C–A` for a range. */
  letter: string
  /** Why part of the axis went ungraded. Null when all of it was graded. */
  missing: string | null
  /** At most three, most urgent first. */
  tips: DefenceTip[]
  /** The headline sentence: the first tip, or a plain all-clear. */
  sentence: string
}

export const DEFENCE_TIP_LIMIT = 3

/** The gear S–D scale (85/70/55/40) applied to the 0–1 defence score (B2-4a). */
const tierOf = (n: number): Grade => gradeFor(n * 100)
const round = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * 100) / 100
const pct = (n: number) => `${Math.round(n * 100)}%`

const HIT_FIX: Record<DefenceTip['type'], string> = {
  physical: 'Add life, energy shield or armour.',
  chaos: 'Add chaos resistance, life or energy shield.',
  fire: 'Cap fire resistance, then add life or energy shield.',
  cold: 'Cap cold resistance, then add life or energy shield.',
  lightning: 'Cap lightning resistance, then add life or energy shield.',
}

export function defenceAxis(
  assessment: Pick<BuildAssessment, 'defence' | 'defenceUnscoredReason'>,
  defense: Pick<DefenseSummary, 'maxHits' | 'resistances'>,
): DefenceAxis {
  const base = assessment.defence / DEFENCE_WEIGHT
  const missing = assessment.defenceUnscoredReason
  const score = missing ? null : round(base)
  const range = missing
    ? (() => {
        const min = round(base)
        const max = round((assessment.defence + DEFENCE_PART_WEIGHTS.maxHit) / DEFENCE_WEIGHT)
        return { min, max, worst: tierOf(min), best: tierOf(max) }
      })()
    : null
  const grade = score === null ? null : tierOf(score)
  const letter = grade ?? (range!.worst === range!.best ? range!.worst : `${range!.worst}–${range!.best}`)

  const tips: DefenceTip[] = []
  const hits = defense.maxHits.filter((h) => h.value > 0)
  const best = Math.max(0, ...hits.map((h) => h.value))
  for (const h of hits.filter((x) => x.value < best * WEAK_HIT_RATIO).sort((a, b) => a.value - b.value)) {
    tips.push({
      kind: 'weak-hit',
      type: h.type,
      text: `Survive bigger ${h.type} hits: your largest is ${h.value.toLocaleString('en-US')}. ${HIT_FIX[h.type]}`,
    })
  }
  const gaps = defense.resistances
    .filter((r): r is ResistanceState & { value: number; max: number } => typeof r.value === 'number' && typeof r.max === 'number')
    .map((r) => ({ r, taken: resGapDamageTaken(r) }))
    .filter((x) => x.taken > 0)
  for (const { r, taken } of gaps.filter((x) => x.r.type !== 'chaos').sort((a, b) => b.taken - a.taken)) {
    tips.push({
      kind: 'res-gap',
      type: r.type,
      text: `Cap ${r.type} resistance: it is ${r.max - r.value}% short, so you take ${pct(taken)} more ${r.type} damage.`,
    })
  }
  for (const { r, taken } of gaps.filter((x) => x.r.type === 'chaos')) {
    tips.push({
      kind: 'chaos-gap',
      type: 'chaos',
      text: `Raise chaos resistance by ${r.max - r.value}% to reach ${r.max}%. Until then you take ${pct(taken)} more chaos damage.`,
    })
  }
  const top = tips.slice(0, DEFENCE_TIP_LIMIT)
  return {
    score,
    grade,
    range,
    letter,
    missing,
    tips: top,
    sentence: top[0]?.text ?? 'No big gaps in your defences. Keep resistances capped as you swap gear.',
  }
}
