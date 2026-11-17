/**
 * The remaining judgement constants live in thresholds.ts (CA1-5).
 *
 * The score rubric weights, the content comfort thresholds, the cost weights,
 * the XP floor and the trade item-level floor were declared next to their
 * users, while the score comment said every rubric value is declared in
 * thresholds.ts. Each old import path must read the same object
 * (HG1-4: value pins and source-text scans were dropped; they broke on every tuning).
 */

import { describe, expect, it } from 'vitest'
import * as thresholds from '../src/thresholds.js'
import { RUBRIC } from '../src/score/index.js'
import { COMFORT_THRESHOLDS } from '../src/gear/content.js'
import { COST_WEIGHT } from '../src/recommend/rank.js'
import { XP_WORTH_FLOOR } from '../src/gear/waystone.js'
import { TRADE_MIN_ILVL } from '../src/trade/query.js'

const T = thresholds as Record<string, unknown>

describe('rubric and planning constants in thresholds.ts', () => {
  it('is the one copy the old import paths read', () => {
    expect(RUBRIC.weights).toBe(T.DEFENCE_PART_WEIGHTS)
    expect(RUBRIC.defenceWeight).toBe(T.DEFENCE_WEIGHT)
    expect(COMFORT_THRESHOLDS).toBe(T.COMFORT_THRESHOLDS)
    expect(COST_WEIGHT).toBe(T.COST_WEIGHT)
    expect(XP_WORTH_FLOOR).toBe(T.XP_WORTH_FLOOR)
    expect(TRADE_MIN_ILVL).toBe(T.TRADE_MIN_ILVL)
  })
})
