import { defenceAxis, type Analysis, type DefenceAxis } from '@poe2/core'

/**
 * The headline grade: the defence axis on its own (plan Batch 2.4). The combined defence + damage score is
 * retired; damage is graded in Batch 3. A range only when part of the defence half went ungraded (the max hit
 * was not reported), never a guess.
 */
export function gradeText(analysis: Pick<Analysis, 'assessment' | 'defense'>): { letter: string; score: string; axis: DefenceAxis } | null {
  const axis = defenceAxis(analysis.assessment, analysis.defense)
  if (axis.score !== null) return { letter: axis.letter, score: pct(axis.score), axis }
  if (!axis.range) return null
  return { letter: axis.letter, score: axis.range.min === axis.range.max ? pct(axis.range.min) : `${pct(axis.range.min)}–${pct(axis.range.max)}`, axis }
}

const pct = (n: number) => `${Math.round(n * 100)}%`
