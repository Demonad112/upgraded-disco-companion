/**
 * Batch 2.4: the defence grade stands as its own axis (unchanged `assessBuild` logic, A–D bands), with up to three
 * beginner tips in `docs/COPY.md` voice: action first, at most two sentences, about 140 characters.
 */

import { describe, expect, it } from 'vitest'
import { defenceAxis } from '../src/score/defence-axis.js'
import type { BuildAssessment } from '../src/score/index.js'
import type { DefenseSummary } from '../src/defense/index.js'

const res = (type: 'fire' | 'cold' | 'lightning' | 'chaos', value: number, max = 75) => ({
  type, value, max, overCap: Math.max(0, value - max), underCap: Math.max(0, max - value), capped: value >= max,
})
const hit = (type: DefenseSummary['maxHits'][number]['type'], value: number) => ({ type, value, isLowest: false, ratioToHighest: 1 })

function defense(over: Partial<DefenseSummary> = {}): Pick<DefenseSummary, 'maxHits' | 'resistances'> {
  return {
    maxHits: [hit('physical', 5182), hit('chaos', 8003), hit('fire', 18482), hit('lightning', 19167), hit('cold', 22500)],
    resistances: [res('fire', 75), res('cold', 80, 80), res('lightning', 76, 76), res('chaos', 53)],
    ...over,
  }
}
const assessment = (defence: number, defenceUnscoredReason: string | null = null) =>
  ({ defence, defenceUnscoredReason } as Pick<BuildAssessment, 'defence' | 'defenceUnscoredReason'>)

describe('defenceAxis', () => {
  it('grades the defence half on its own, out of its 0.5 weight, on the unchanged A–D bands', () => {
    const axis = defenceAxis(assessment(0.42), defense())
    expect(axis).toMatchObject({ score: 0.84, grade: 'A', range: null, letter: 'A', missing: null })
  })

  it('is a range when the max hit was not reported, widened by the max-hit weight', () => {
    const axis = defenceAxis(assessment(0.2, 'Survivability not graded'), defense({ maxHits: [] }))
    expect(axis).toMatchObject({ score: null, grade: null, range: { min: 0.4, max: 1, worst: 'C', best: 'A' }, letter: 'C–A' })
    expect(axis.missing).toBe('Survivability not graded')
  })

  it('leads with the weakest hit type, then resistance gaps, at most three tips in caddy voice', () => {
    const axis = defenceAxis(assessment(0.42), defense())
    expect(axis.tips.map((t) => t.kind)).toEqual(['weak-hit', 'weak-hit', 'chaos-gap'])
    expect(axis.tips[0]!.text).toBe('Survive bigger physical hits: your largest is 5,182. Add life, energy shield or armour.')
    expect(axis.tips[2]!.text).toBe('Raise chaos resistance by 22% to reach 75%. Until then you take 88% more chaos damage.')
    for (const t of axis.tips) {
      expect(t.text.length).toBeLessThanOrEqual(140)
      expect(t.text.split(/(?<=\.)\s/).length).toBeLessThanOrEqual(2)
    }
  })

  it('names an uncapped elemental resistance before chaos, biggest damage increase first', () => {
    const axis = defenceAxis(
      assessment(0.3),
      defense({
        maxHits: [hit('physical', 9000), hit('fire', 9500)],
        resistances: [res('fire', 60), res('cold', 70), res('lightning', 75), res('chaos', 0)],
      }),
    )
    expect(axis.tips.map((t) => `${t.kind}:${t.type}`)).toEqual(['res-gap:fire', 'res-gap:cold', 'chaos-gap:chaos'])
    expect(axis.tips[0]!.text).toBe('Cap fire resistance: it is 15% short, so you take 60% more fire damage.')
  })

  it('says so plainly when nothing stands out', () => {
    const axis = defenceAxis(
      assessment(0.5),
      defense({ maxHits: [hit('physical', 9000), hit('fire', 9500)], resistances: [res('fire', 75), res('chaos', 75)] }),
    )
    expect(axis.tips).toEqual([])
    expect(axis.sentence).toBe('No big gaps in your defences. Keep resistances capped as you swap gear.')
  })
})
