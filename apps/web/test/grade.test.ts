import { describe, expect, it } from 'vitest'
import { gradeText } from '@/lib/grade'

const hit = (type: string, value: number) => ({ type, value, isLowest: false, ratioToHighest: 1 })
const defense = { maxHits: [hit('physical', 5182), hit('cold', 22500)], resistances: [] } as never

describe('gradeText: the defence axis is the headline grade (Batch 2.4)', () => {
  it('grades the defence half alone: 0.42 of 0.5 is an A at 84%, whatever damage would be', () => {
    const assessment = { defence: 0.42, defenceUnscoredReason: null, tier: null, tierRange: { worst: 'C', best: 'A' } } as never
    expect(gradeText({ assessment, defense })).toMatchObject({ letter: 'A', score: '84%' })
  })

  it('is a range only when the max hit went unreported', () => {
    const assessment = { defence: 0.2, defenceUnscoredReason: 'Survivability not graded' } as never
    expect(gradeText({ assessment, defense })).toMatchObject({ letter: 'C–A', score: '40%–100%' })
  })
})
