import { describe, expect, it } from 'vitest'
import { STEP_TITLES, nextStepTitle } from '@/data/stepTitles'
import { nextIncompleteStep, orderedSteps } from '@/lib/roadmapOrder'

describe('stepTitles', () => {
  it('matches the roadmap ids, titles and order', () => {
    expect(STEP_TITLES).toEqual(orderedSteps.map(({ id, title }) => ({ id, title })))
  })

  it('agrees with nextIncompleteStep', () => {
    for (const done of [[], [orderedSteps[0].id], orderedSteps.map((s) => s.id)]) {
      expect(nextStepTitle(done)?.id ?? null).toBe(nextIncompleteStep(done)?.id ?? null)
    }
  })
})
