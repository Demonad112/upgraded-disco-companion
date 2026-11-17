import { describe, expect, it } from 'vitest'
import * as constants from '../src/defense/constants.js'

// HG1-4: judgement constants are no longer pinned by value or scanned for in
// source text; those tests broke on every tuning and caught no bug. Game
// constants stay pinned: they change only with a patch.
describe('game constants', () => {
  it('keeps the effective-resistance ceiling and the default cap', () => {
    expect(constants.EFFECTIVE_RES_CEILING).toBe(99)
    expect(constants.RES_CAP_DEFAULT).toBe(75)
  })
})
