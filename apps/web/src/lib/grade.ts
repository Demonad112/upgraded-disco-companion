import type { BuildAssessment } from '@poe2/core'

/**
 * The headline grade, which is a range whenever damage could not be graded.
 *
 * A single letter over one measured half would be a guess, and the guess the
 * arithmetic used to make was the flattering one — perfect defences and no
 * ladder sample read as a confident A. A range says the same thing without
 * claiming the half nobody measured.
 */
export function gradeText(assessment: BuildAssessment): { letter: string; score: string } | null {
  const { tier, tierRange, score, scoreRange } = assessment
  if (tier && score !== null) return { letter: tier, score: score.toFixed(2) }
  if (!tierRange || !scoreRange) return null
  const same = tierRange.worst === tierRange.best
  return {
    letter: same ? tierRange.worst : `${tierRange.worst}–${tierRange.best}`,
    score: same ? scoreRange.min.toFixed(2) : `${scoreRange.min.toFixed(2)}–${scoreRange.max.toFixed(2)}`,
  }
}
