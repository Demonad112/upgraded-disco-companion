/**
 * The reconciliation banner reads "1 stat disagree": the noun was made
 * singular but the verb was not. One stat disagrees; two stats disagree.
 * The sparse-defence golden variant has exactly one major PoB disagreement.
 */

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { analyzeCharacter } from '../src/analyze.js'
import { mainWithReferenceDefence } from './helpers/main-build.js'

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url))
const recorded = mainWithReferenceDefence() as Record<string, unknown>
const ops = JSON.parse(readFileSync(here('./golden/sparse-defence.patch.json'), 'utf8')) as { ops: { path: string; set?: unknown; delete?: true }[] }

function patched(): Record<string, unknown> {
  const doc = structuredClone(recorded)
  for (const op of ops.ops) {
    const keys = op.path.split('.')
    const last = keys.pop()!
    let node = doc as Record<string, unknown>
    for (const k of keys) node = node[k] as Record<string, unknown>
    if (op.delete) delete node[last]
    else node[last] = op.set
  }
  return doc
}

describe('the PoB disagreement banner', () => {
  it('agrees its verb with one stat', async () => {
    const a = await analyzeCharacter(patched())
    const banner = a.warnings.find((w) => w.includes('between poe.ninja and the attached Path of Building export'))
    expect(banner).toMatch(/^1 stat disagrees between/)
  })
})
