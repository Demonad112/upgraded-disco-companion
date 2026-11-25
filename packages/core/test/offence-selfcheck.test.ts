/**
 * Batch 3.2: the self-check compares the main skill's estimate with the code's TotalDPS. `ratio = code / estimate`.
 *   |ratio − 1| ≤ 0.25 : the other skills are scaled by the ratio and labelled "≈ est., calibrated";
 *   |ratio − 1| > 0.25 : they are hidden (Full DPS steps shown instead), or, on request, shown "unreliable";
 *   no estimate, or a TotalDPS of 0 : "≈ est., unchecked".
 */

import { describe, expect, it } from 'vitest'
import { applySelfCheck, type RawEstimate } from '../src/offence/self-check.js'

const rows: RawEstimate[] = [
  { group: 1, name: 'Main', estimate: 100, reason: null, unread: [] },
  { group: 2, name: 'Other', estimate: 50, reason: null, unread: [] },
  { group: 3, name: 'Spell', estimate: null, reason: 'Not estimated: only attack skills are estimated', unread: [] },
]

describe('applySelfCheck', () => {
  it('calibrates the other skills by code / estimate when the main skill is within 25%', () => {
    const r = applySelfCheck(rows, 1, 120)
    expect(r.state).toBe('calibrated')
    expect(r.ratio).toBeCloseTo(1.2)
    const other = r.skills.find((s) => s.group === 2)!
    expect(other.value).toBeCloseTo(60)
    expect(other.label).toBe('≈ est., calibrated')
    expect(r.skills.find((s) => s.group === 1)!.value).toBe(120) // the main skill is the code's own number
  })

  it('hides the other skills when the main skill is off by more than 25%', () => {
    const r = applySelfCheck(rows, 1, 200)
    expect(r.state).toBe('hidden')
    expect(r.errorPct).toBe(-50)
    expect(r.skills.find((s) => s.group === 2)!.value).toBeNull()
    expect(r.fullDpsHint).toMatch(/Include in Full DPS/)
  })

  it('shows them labelled unreliable when asked', () => {
    const r = applySelfCheck(rows, 1, 200, { showAnyway: true })
    const other = r.skills.find((s) => s.group === 2)!
    expect(other.value).toBeCloseTo(50) // the raw estimate, not scaled
    expect(other.label).toBe('≈ est., unreliable (main skill off by 50%)')
  })

  it('is unchecked with no main estimate or a TotalDPS of 0, and never scales', () => {
    for (const [main, dps] of [[1, 0], [3, 120]] as const) {
      const r = applySelfCheck(rows, main, dps)
      expect(r.state).toBe('unchecked')
      expect(r.skills.find((s) => s.group === 2)!.label).toBe('≈ est., unchecked')
      expect(r.skills.find((s) => s.group === 2)!.value).toBeCloseTo(50)
    }
  })

  it('keeps the reason for a skill that is not estimated', () => {
    const s = applySelfCheck(rows, 1, 120).skills.find((x) => x.group === 3)!
    expect(s.value).toBeNull()
    expect(s.label).toBeNull()
    expect(s.reason).toMatch(/only attack skills/)
  })
})
