/** Deflection and spirit the payload omits are null, never 0 (CA2-3). */

import { describe, expect, it } from 'vitest'
import { analyzeDefense } from '../src/defense/index.js'

describe('absent deflection and spirit', () => {
  it('are null when poe.ninja did not report them', () => {
    const d = analyzeDefense({ defensiveStats: {} })
    expect(d.deflectionRating).toBeNull()
    expect(d.deflectChance).toBeNull()
    expect(d.deflectEffect).toBeNull()
    expect(d.spirit).toBeNull()
  })

  it('keep a reported 0 as 0', () => {
    const d = analyzeDefense({ defensiveStats: { deflectionRating: 0, deflectChance: 0, deflectEffect: 0, spirit: 0 } })
    expect([d.deflectionRating, d.deflectChance, d.deflectEffect, d.spirit]).toEqual([0, 0, 0, 0])
  })
})
