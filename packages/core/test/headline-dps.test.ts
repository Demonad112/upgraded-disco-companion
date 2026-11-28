/** One DPS number for the Overview: the skill's hit DPS (PoB's TotalDPS), so the hero and the Sheet agree (Overview fix 6). */

import { describe, expect, it } from 'vitest'
import { headlineDps } from '../src/dps/index.js'

describe('headlineDps', () => {
  it('is the hit DPS, not hit plus damage over time', () => {
    expect(headlineDps({ dps: 186706, dotDps: 1200, totalDps: 187906 })).toEqual({ value: 186706, includesDot: false })
  })
  it('falls back to the damage-over-time total, flagged, for a skill that only ticks', () => {
    expect(headlineDps({ dps: 0, dotDps: 900, totalDps: 900 })).toEqual({ value: 900, includesDot: true })
  })
  it('is null with no skill or no damage', () => {
    expect(headlineDps(null)).toBeNull()
    expect(headlineDps({ dps: 0, dotDps: 0, totalDps: 0 })).toBeNull()
  })
})
