/**
 * GF1-8: user-set targets checked against the numbers a PoB code carries. Pinned to the main reference build
 * (`reference/ninja-default/decoded.md`): Life 1494, ES 2827, fire 75 / cold 80 / lightning 76, chaos 53.
 */

import { describe, expect, it } from 'vitest'
import { analyzeCharacter } from '../src/analyze.js'
import { checkTargets, isTarget, TARGET_STATS, type Target } from '../src/progress/targets.js'
import { mainPayload } from './helpers/main-build.js'

const analysis = await analyzeCharacter(mainPayload(), { source: 'pob-export' })
const t = (id: string, stat: Target['stat'], want: Target['want'], op: Target['op'] = '>='): Target => ({ id, stat, op, want })
const one = (target: Target) => checkTargets(analysis, [target])[0]!

describe('checkTargets on the main reference build', () => {
  it('reads life from the code and fails a 5,000 target', () => {
    expect(one(t('a', 'life', 5000))).toMatchObject({ have: 1494, want: 5000, met: false })
  })

  it('passes chaos 30 at 53 and fails lightning 80 at 76', () => {
    expect(one(t('a', 'chaosRes', 30))).toMatchObject({ have: 53, met: true })
    expect(one(t('a', 'lightningRes', 80))).toMatchObject({ have: 76, met: false })
    expect(one(t('a', 'coldRes', 80))).toMatchObject({ have: 80, met: true })
  })

  it('resolves "max" to each resistance’s own cap from the code', () => {
    expect(one(t('a', 'coldRes', 'max'))).toMatchObject({ want: 80, have: 80, met: true })
    expect(one(t('a', 'lightningRes', 'max'))).toMatchObject({ want: 76, have: 76, met: true })
    expect(one(t('a', 'chaosRes', 'max'))).toMatchObject({ want: 75, have: 53, met: false })
  })

  it('reads block, smallest hit, DPS and level as the code states them', () => {
    expect(one(t('a', 'blockChance', 20))).toMatchObject({ have: 0, met: false })
    expect(one(t('a', 'lowestMaxHit', 5000))).toMatchObject({ have: 5182, met: true })
    expect(one(t('a', 'dps', 100000))).toMatchObject({ have: 186976, met: true })
    expect(one(t('a', 'level', 90))).toMatchObject({ have: 90, met: true })
  })

  it('honours <=', () => {
    expect(one(t('a', 'life', 1000, '<='))).toMatchObject({ met: false })
    expect(one(t('a', 'life', 2000, '<='))).toMatchObject({ met: true })
  })

  it('is missing, never failed, when the code does not carry the stat', async () => {
    const blank = await analyzeCharacter({ type: 'character', charModel: { defensiveStats: { life: 100 } } })
    expect(checkTargets(blank, [t('a', 'blockChance', 20)])[0]).toMatchObject({ have: null, met: 'missing' })
    expect(checkTargets(blank, [t('a', 'fireRes', 'max')])[0]).toMatchObject({ want: null, met: 'missing' })
  })

  it('keeps the order and ids it was given, and labels each stat', () => {
    const res = checkTargets(analysis, [t('x', 'energyShield', 1), t('y', 'pool', 1)])
    expect(res.map((r) => r.id)).toEqual(['x', 'y'])
    expect(res[0]).toMatchObject({ label: 'Energy shield', have: 2827, met: true })
    expect(res[1]!.have).toBe(1494 + 2827)
  })
})

describe('isTarget', () => {
  it('accepts a stored target and rejects bad shapes', () => {
    expect(isTarget(t('a', 'life', 5000))).toBe(true)
    expect(isTarget(t('a', 'fireRes', 'max'))).toBe(true)
    expect(isTarget(t('a', 'life', 'max'))).toBe(false)
    expect(isTarget({ id: 'a', stat: 'nope', op: '>=', want: 1 })).toBe(false)
    expect(isTarget({ id: 'a', stat: 'life', op: '>', want: 1 })).toBe(false)
    expect(isTarget({ id: 'a', stat: 'life', op: '>=', want: Number.NaN })).toBe(false)
    expect(isTarget(null)).toBe(false)
  })

  it('lists every stat with a label', () => {
    for (const s of TARGET_STATS) expect(s.label).toMatch(/^[A-Z]/)
  })
})
