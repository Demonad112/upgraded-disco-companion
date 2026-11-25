/**
 * Batch 2.3: the charm overkill flag (`advice/charm-overkill.ts`). A charm or flask line that raises a value
 * already at its cap is flagged; nothing else about charms or flasks is analysed.
 */

import { describe, expect, it } from 'vitest'
import { findCharmOverkill } from '../../src/advice/charm-overkill.js'
import { resistances } from '../helpers/score-fixture.js'

const ruby = { slot: 'Charm 1', name: 'Ruby Charm', lines: ['Used when you take Fire damage from a Hit', '+25% to Fire Resistance'] }

describe('findCharmOverkill', () => {
  it('flags a fire resistance charm when fire resistance is capped', () => {
    const flags = findCharmOverkill([ruby], resistances({ fire: { over: 12 } }))
    expect(flags).toEqual([
      expect.objectContaining({ slot: 'Charm 1', name: 'Ruby Charm', line: '+25% to Fire Resistance', types: ['fire'] }),
    ])
    expect(flags[0]!.reason).toMatch(/^Fire resistance is already at its cap of 75%, so this line adds nothing\./)
  })

  it('does not flag it when fire is under the cap, nor a line that raises the cap itself', () => {
    expect(findCharmOverkill([ruby], resistances({ fire: { value: 60 } }))).toEqual([])
    const maxRes = { slot: 'Flask 1', name: 'Flask', lines: ['+3% to Maximum Fire Resistance'] }
    expect(findCharmOverkill([maxRes], resistances({}))).toEqual([])
  })

  it('flags all elemental resistances only when all three are capped', () => {
    const all = { slot: 'Flask 2', name: 'Flask', lines: ['+10% to all Elemental Resistances'] }
    expect(findCharmOverkill([all], resistances({ cold: { value: 70 } }))).toEqual([])
    expect(findCharmOverkill([all], resistances({}))[0]).toMatchObject({ types: ['fire', 'cold', 'lightning'] })
  })

  it('stays silent when a resistance is unknown', () => {
    const unknown = resistances({}).map((r) => (r.type === 'fire' ? { ...r, value: null, max: null, underCap: null, capped: null } : r))
    expect(findCharmOverkill([ruby], unknown)).toEqual([])
  })
})
