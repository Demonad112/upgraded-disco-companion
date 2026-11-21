/**
 * GF1 item 9 part 1: every judgement number in thresholds.ts has a provenance entry (source, sample
 * size, range), and the entry reads the live value, so the record cannot drift from the code.
 */

import { describe, expect, it } from 'vitest'
import * as thresholds from '../src/thresholds.js'
import { ASSUMED_CONSTANTS, assumedConstant, formatAssumption, unmeasuredConstants } from '../src/provenance/assumptions.js'

function leaves(value: unknown, path: string, out: Map<string, number>): void {
  if (typeof value === 'number') out.set(path, value)
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) leaves(v, `${path}.${k}`, out)
}

const live = new Map<string, number>()
for (const [name, value] of Object.entries(thresholds)) leaves(value, name, live)

describe('assumed constants', () => {
  it('covers every number in thresholds.ts, and nothing else', () => {
    expect(ASSUMED_CONSTANTS.map((c) => c.name).sort()).toEqual([...live.keys()].sort())
  })

  it('reads each value from the code', () => {
    for (const c of ASSUMED_CONSTANTS) expect(c.value, c.name).toBe(live.get(c.name))
  })

  it('names a source for each, and never claims a sample nobody took', () => {
    for (const c of ASSUMED_CONSTANTS) {
      expect(c.source.length, c.name).toBeGreaterThan(0)
      expect(c.usedBy.length, c.name).toBeGreaterThan(0)
      if (c.sampleSize !== null) expect(c.basis, c.name).toBe('measured')
      if (c.range) expect(c.range.min, c.name).toBeLessThanOrEqual(c.range.max)
    }
  })

  it('looks up one constant and formats it', () => {
    const chaos = assumedConstant('CHAOS_TARGET')!
    expect(chaos.value).toBe(30)
    expect(chaos.basis).toBe('judgement')
    expect(formatAssumption(chaos)).toMatch(/^CHAOS_TARGET = 30 .*judgement.*no sample/)
    expect(assumedConstant('NOPE')).toBeNull()
    const override = assumedConstant('GEAR_FIT.rollCeilingRatio')!
    expect(override.basis).toBe('borrowed')
  })

  it('lists the unmeasured ones, which today is all of them', () => {
    expect(unmeasuredConstants().length).toBe(ASSUMED_CONSTANTS.filter((c) => c.sampleSize === null).length)
    expect(unmeasuredConstants()).toContain('MAX_HIT_SCORE.zeroAt')
  })
})
