/**
 * Batch 3.3: the damage axis. Time to kill a base rare at the T15/T16 area level, from the code's own main-skill
 * TotalDPS and PoB's monster life table; graded on gear's S–D scale (85/70/55/40). Project judgement, labelled so.
 */

import { describe, expect, it } from 'vitest'
import { damageAxis, RARE_LIFE_MULT, ttkScore } from '../src/score/damage-axis.js'

const life = { '79': 24852, '80': 31065 }

describe('ttkScore', () => {
  it('is log-scaled: 0.1 s is 100, 10 s is 0, and each grade band is a doubling of the time', () => {
    expect(ttkScore(0.1)).toBe(100)
    expect(ttkScore(10)).toBe(0)
    expect(ttkScore(0.01)).toBe(100)
    expect(ttkScore(100)).toBe(0)
    expect(Math.round(ttkScore(0.25))).toBe(80)
    expect(Math.round(ttkScore(0.5))).toBe(65)
  })
})

describe('damageAxis', () => {
  it('grades the reference own-config DPS on the S–D scale from rare life at T15 and T16', () => {
    const axis = damageAxis({ dps: 372908, life })!
    expect(axis.rows.map((r) => r.tier)).toEqual([15, 16])
    expect(axis.rows[1]!.ttk).toBeCloseTo((31065 * RARE_LIFE_MULT) / 372908, 6)
    expect(axis.grade).toBe('A')
    expect(axis.letter).toBe('A')
    expect(axis.label).toBe('project judgement')
  })

  it('grades the poe.ninja-config DPS lower', () => {
    expect(damageAxis({ dps: 186706, life })!.grade).toBe('B')
  })

  it('grades by the harder tier, T16, and states it in one short sentence', () => {
    const axis = damageAxis({ dps: 372908, life })!
    expect(axis.score).toBe(axis.rows[1]!.score)
    expect(axis.sentence).toMatch(/^A base rare at tier 16 dies in 0\.\d+ s/)
    expect(axis.sentence.length).toBeLessThanOrEqual(140)
  })

  it('reaches S at 0.2 s or less and falls to D beyond 1.6 s', () => {
    expect(damageAxis({ dps: 2e6, life })!.grade).toBe('S')
    expect(damageAxis({ dps: 30000, life })!.grade).toBe('D')
  })

  it('is null when the code carries no DPS or the life table lacks the tier', () => {
    expect(damageAxis({ dps: 0, life })).toBeNull()
    expect(damageAxis({ dps: undefined, life })).toBeNull()
    expect(damageAxis({ dps: 1000, life: {} })).toBeNull()
  })
})
