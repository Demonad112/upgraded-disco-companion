import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import * as thresholds from '../src/thresholds.js'
import * as constants from '../src/defense/constants.js'

const src = (path: string): string => readFileSync(fileURLToPath(new URL(`../src/${path}`, import.meta.url)), 'utf8')

describe('judgement constants live in thresholds.ts', () => {
  // Values are pinned so that moving a constant cannot change a verdict.
  it.each([
    ['ONE_SHOT_GAP_RATIO', 1.5],
    ['EHP_OVERSTATEMENT_WARN', 1.5],
    ['ARMOUR_DR_NEGLIGIBLE', 15],
    ['ANOINT_MIN_LEVEL', 30],
    ['WEAPON_LAG_MIN_ITEMS', 3],
    ['WEAPON_LAG_MIN_ILVL_GAP', 4],
    ['DAMAGE_TYPE_MIN_SHARE', 10],
  ] as const)('exports %s = %s', (name, value) => {
    expect((thresholds as Record<string, unknown>)[name]).toBe(value)
  })

  it('keeps the effective-resistance ceiling with the game constants', () => {
    expect((constants as Record<string, unknown>).EFFECTIVE_RES_CEILING).toBe(99)
    expect(constants.RES_CAP_DEFAULT).toBe(75)
  })
})

describe('no second copy of a moved constant', () => {
  it.each([
    ['recommend/index.ts', ['ONE_SHOT_GAP_RATIO', 'EHP_OVERSTATEMENT_WARN', 'ARMOUR_DR_NEGLIGIBLE', 'ANOINT_MIN_LEVEL', 'WEAPON_LAG_MIN_ITEMS', 'WEAPON_LAG_MIN_ILVL_GAP']],
    ['recommend/damage.ts', ['DAMAGE_TYPE_MIN_SHARE']],
    ['analyze.ts', ['DAMAGE_TYPE_MIN_SHARE']],
    ['recommend/gear.ts', ['RES_CAP_DEFAULT']],
    ['pob/analyze.ts', ['RES_CAP_DEFAULT']],
    ['score/index.ts', ['EFFECTIVE_RES_CEILING']],
    ['defense/whatif.ts', ['EFFECTIVE_RES_CEILING']],
  ] as const)('%s reads the shared constant', (file, names) => {
    const text = src(file)
    for (const name of names) expect(text, `${file} should use ${name}`).toContain(name)
  })

  it.each([
    ['recommend/damage.ts', /const MIN_SHARE = 10\b/],
    ['analyze.ts', /percent >= 10\b/],
    ['recommend/gear.ts', /const RESIST_CAP = 75\b/],
    ['pob/analyze.ts', /const DEFAULT_RESIST_CAP = 75\b/],
    ['score/index.ts', /Math\.min\(r\.max, 99\)/],
    ['defense/whatif.ts', /const EFFECTIVE_CEILING = 99\b/],
    ['recommend/index.ts', /ratio < 1\.5\b|ehpOverstatementRatio > 1\.5\b|dr >= 15\b|level < 30\b|active\.length < 3\b|gap < 4\b/],
  ] as const)('%s has no literal copy left', (file, literal) => {
    expect(src(file)).not.toMatch(literal)
  })
})
