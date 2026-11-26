/**
 * PoB2 exports deflection as `DeflectionRating` / `DeflectChance` and block as `EffectiveBlockChance` (it has no
 * `BlockChance` PlayerStat). A code that carries them must show them, not "—" and "couldn't check".
 */

import { describe, expect, it } from 'vitest'
import { defensiveStatsFromPob } from '../src/pob/to-model.js'
import { pobCodeGaps } from '../src/pob/analyze.js'

describe('deflection and block from a PoB2 code', () => {
  it('reads DeflectionRating, DeflectChance and EffectiveBlockChance', () => {
    const d = defensiveStatsFromPob({ DeflectionRating: 1925.82, DeflectChance: 15, EffectiveBlockChance: 0 })
    expect(d.deflectionRating).toBe(1925.82)
    expect(d.deflectChance).toBe(15)
    expect(d.blockChance).toBe(0)
  })

  it('prefers BlockChance when a code carries it', () => {
    expect(defensiveStatsFromPob({ BlockChance: 30, EffectiveBlockChance: 25 }).blockChance).toBe(30)
  })

  it('does not list block as a gap when EffectiveBlockChance is exported', () => {
    expect(pobCodeGaps({ EffectiveBlockChance: 0 }).map((g) => g.what)).not.toContain('Block chance')
    expect(pobCodeGaps({}).map((g) => g.what)).toContain('Block chance')
  })
})
