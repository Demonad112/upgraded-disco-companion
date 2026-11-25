/** The S–D grade bands (85/70/55/40) as a leaf module, so the axes can use them without pulling in the gear scorer. */

import { GEAR_SCORE } from '../thresholds.js'

export type Grade = 'S' | 'A' | 'B' | 'C' | 'D'

export function gradeFor(score: number): Grade {
  for (const band of GEAR_SCORE.grades) if (score >= band.min) return band.grade
  return 'D'
}
