/**
 * The reconciliation banner reads "1 stat disagree": the noun was made
 * singular but the verb was not. One stat disagrees; two stats disagree.
 * The main build with only its Life changed has exactly one major PoB disagreement.
 */

import { describe, expect, it } from 'vitest'
import { analyzeCharacter } from '../src/analyze.js'
import { mainPayload } from './helpers/main-build.js'

function patched(): Record<string, unknown> {
  const doc = mainPayload() as { charModel: { defensiveStats: { life: number } } }
  doc.charModel.defensiveStats.life += 500
  return doc as unknown as Record<string, unknown>
}

describe('the PoB disagreement banner', () => {
  it('agrees its verb with one stat', async () => {
    const a = await analyzeCharacter(patched())
    const banner = a.warnings.find((w) => w.includes('between poe.ninja and the attached Path of Building export'))
    expect(banner).toMatch(/^1 stat disagrees between/)
  })
})
