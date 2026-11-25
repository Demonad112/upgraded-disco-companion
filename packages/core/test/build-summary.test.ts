/**
 * Batch 3.5: "What your build is" and "Next 3 steps by content". Plain words from the code's own figures; the steps
 * follow the advice rule (defence fix, gear tip, damage, then more fixes), at most three.
 */

import { describe, expect, it } from 'vitest'
import { buildSummary, nextSteps } from '../src/advice/build-summary.js'

const skill = { name: 'Snipe', dominantType: 'physical', damageSplit: [{ type: 'physical', percent: 72.4 }, { type: 'fire', percent: 27.6 }] } as never

describe('buildSummary', () => {
  it('names ascendancy, main skill, damage mix and defence layers in one sentence', () => {
    const s = buildSummary({ className: 'Deadeye', skill, life: 5100, energyShield: 0 })!
    expect(s).toBe('A Deadeye using Snipe, mostly physical damage (72%), on life only.')
  })
  it('names both pools when energy shield is a layer', () => {
    expect(buildSummary({ className: 'Witch', skill: null, life: 1200, energyShield: 4000 })).toBe('A Witch, on life and energy shield.')
  })
  it('is null when the code says nothing to build on', () => {
    expect(buildSummary({ className: null, skill: null, life: null, energyShield: null })).toBeNull()
  })
})

const tip = (text: string) => ({ kind: 'res-gap', type: 'fire', text }) as never
const defence = (tips: string[]) => ({ tips: tips.map(tip) }) as never
const damage = (score: number) => ({ score, sentence: 'A base rare dies in 4.0 s.' }) as never

describe('nextSteps', () => {
  it('orders defence, gear swap, then damage, and stops at three', () => {
    const steps = nextSteps({ defence: defence(['Cap fire.', 'Add life.']), swaps: [{ sentence: 'Swap cold for crit.' }] as never, damage: damage(40) })
    expect(steps.map((s) => s.area)).toEqual(['defence', 'gear', 'damage'])
    expect(steps[0]!.text).toBe('Cap fire.')
  })
  it('skips damage when it grades B or better and fills with the next defence tips', () => {
    const steps = nextSteps({ defence: defence(['a', 'b', 'c']), swaps: [], damage: damage(80) })
    expect(steps.map((s) => s.text)).toEqual(['a', 'b', 'c'])
  })
  it('gives one all-clear step when nothing needs doing', () => {
    const steps = nextSteps({ defence: defence([]), swaps: [], damage: damage(90) })
    expect(steps).toHaveLength(1)
    expect(steps[0]!.area).toBe('clear')
  })
})
