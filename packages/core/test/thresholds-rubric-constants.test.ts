/**
 * The remaining judgement constants live in thresholds.ts (CA1-5).
 *
 * The score rubric weights, the content comfort thresholds, the cost weights,
 * the XP floor and the trade item-level floor were declared next to their
 * users, while the score comment said every rubric value is declared in
 * thresholds.ts. Values are pinned so moving them cannot change a verdict.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import * as thresholds from '../src/thresholds.js'
import { RUBRIC } from '../src/score/index.js'
import { COMFORT_THRESHOLDS } from '../src/gear/content.js'
import { COST_WEIGHT } from '../src/recommend/rank.js'
import { XP_WORTH_FLOOR } from '../src/gear/waystone.js'
import { TRADE_MIN_ILVL } from '../src/trade/query.js'

const T = thresholds as Record<string, unknown>
const src = (path: string): string => readFileSync(fileURLToPath(new URL(`../src/${path}`, import.meta.url)), 'utf8')

describe('rubric and planning constants in thresholds.ts', () => {
  it('pins each value', () => {
    expect(T.DEFENCE_PART_WEIGHTS).toEqual({ maxHit: 0.3, elemental: 0.15, chaos: 0.05 })
    expect(T.DEFENCE_WEIGHT).toBe(0.5)
    expect(T.COMFORT_THRESHOLDS).toEqual({ comfortable: 12, dangerous: 6 })
    expect(T.COST_WEIGHT).toEqual({ free: 0.5, passive: 2, gear: 4, currency: 5 })
    expect(T.XP_WORTH_FLOOR).toBe(0.8)
    expect(T.TRADE_MIN_ILVL).toBe(60)
  })

  it('is the one copy the old import paths read', () => {
    expect(RUBRIC.weights).toBe(T.DEFENCE_PART_WEIGHTS)
    expect(RUBRIC.defenceWeight).toBe(T.DEFENCE_WEIGHT)
    expect(COMFORT_THRESHOLDS).toBe(T.COMFORT_THRESHOLDS)
    expect(COST_WEIGHT).toBe(T.COST_WEIGHT)
    expect(XP_WORTH_FLOOR).toBe(T.XP_WORTH_FLOOR)
    expect(TRADE_MIN_ILVL).toBe(T.TRADE_MIN_ILVL)
  })

  it.each([
    ['score/index.ts', /maxHit: 0\.3|defenceWeight: 0\.5/],
    ['gear/content.ts', /comfortable: 12|dangerous: 6/],
    ['recommend/rank.ts', /free: 0\.5|currency: 5/],
    ['gear/waystone.ts', /XP_WORTH_FLOOR = 0\.8/],
    ['trade/query.ts', /TRADE_MIN_ILVL = 60/],
  ] as const)('%s has no literal copy left', (file, literal) => {
    expect(src(file)).not.toMatch(literal)
  })
})
