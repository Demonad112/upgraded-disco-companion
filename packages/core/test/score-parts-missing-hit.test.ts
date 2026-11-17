/**
 * defenceParts reported an unknown maximum hit as 0.
 *
 * With no maximum-hit figure in the payload, `maxHit` read 0: the same value
 * as a character that dies to anything. Unknown is null and listed in
 * `missing`; it earns no credit in `total`, as the caveat already says.
 */

import { describe, expect, it } from 'vitest'
import { analyzeDefense } from '../src/defense/index.js'
import { defenceParts } from '../src/score/index.js'

const noHits = analyzeDefense({ defensiveStats: { life: 1500, energyShield: 900 } })
const withHits = analyzeDefense({
  defensiveStats: { life: 1500, lowestMaximumHitTaken: 6000, physicalMaximumHitTaken: 6000, fireMaximumHitTaken: 9000 },
})

describe('defenceParts with no maximum hit', () => {
  it('reports the survivability part as missing, not 0', () => {
    const parts = defenceParts(noHits)
    expect(parts.maxHit).toBeNull()
    expect(parts.missing).toEqual(['maxHit'])
  })

  it('gives the unknown part no credit in the total', () => {
    const parts = defenceParts(noHits)
    expect(parts.total).toBeCloseTo(parts.elemental + parts.chaos, 10)
  })

  it('reports a known hit as a number with nothing missing', () => {
    const parts = defenceParts(withHits)
    expect(typeof parts.maxHit).toBe('number')
    expect(parts.missing).toEqual([])
  })
})
