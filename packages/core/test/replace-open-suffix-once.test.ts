/**
 * One open suffix is one craft.
 *
 * After a replacement, a resistance the new item does not carry is closed by
 * follow-ups on other gear. The same free suffix was offered once per
 * resistance type: a ring with a single free suffix got "craft fire" and
 * "craft cold", both counted, and the gap read as closed when it was not.
 */

import { describe, expect, it } from 'vitest'
import { COLD, DEX, FIRE, STR, plan } from './helpers/replace-plan.js'

describe('one open suffix is one craft', () => {
  // The ring has two suffixes of three, so exactly one is free.
  const p = plan(
    [
      { id: 'FireRes1', stats: { [FIRE]: 30 } },
      { id: 'ColdRes1', stats: { [COLD]: 30 } },
    ],
    [
      { id: 'Dex1', stats: { [DEX]: 8 } },
      { id: 'Str1', stats: { [STR]: 8 } },
    ],
    ['fire', 'cold'],
  )

  it('sets up a 30-point hole in fire and in cold', () => {
    expect(p.resistances.map((r) => [r.type, r.deficitIfRemoved, r.remaining])).toEqual([
      ['fire', 30, 30],
      ['cold', 30, 30],
    ])
  })

  it('crafts into the ring once', () => {
    const crafts = p.followUps.filter((f) => f.action === 'craft-open-suffix' && f.itemName === 'Band')
    expect(crafts).toHaveLength(1)
    expect(crafts[0]!.closes).toBe(26)
  })

  it('reports the rest as uncovered', () => {
    // 26 of one type is closed by the single craft; 4 of it and all 30 of the other stay open.
    expect(p.uncovered.reduce((sum, u) => sum + u.points, 0)).toBe(34)
    expect(p.uncovered.map((u) => u.type).sort()).toEqual(['cold', 'fire'])
  })
})
