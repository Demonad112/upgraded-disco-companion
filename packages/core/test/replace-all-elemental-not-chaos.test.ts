/**
 * All-elemental resistance is not chaos resistance.
 *
 * A follow-up may upgrade a resistance line on another item. An all-elemental
 * line (fire, cold and lightning) was offered for a CHAOS gap too and counted
 * as closing it. It grants no chaos resistance.
 */

import { describe, expect, it } from 'vitest'
import { ALL, CHAOS, DEX, FIRE, STR, plan } from './helpers/replace-plan.js'

describe('all-elemental resistance is not chaos resistance', () => {
  // The ring is full, and its all-elemental line could go from tier 2 to tier 1.
  const p = plan(
    [{ id: 'ChaosRes1', stats: { [CHAOS]: 30 } }],
    [
      { id: 'AllRes2', stats: { [ALL]: 6 } },
      { id: 'Dex1', stats: { [DEX]: 8 } },
      { id: 'Str1', stats: { [STR]: 8 } },
    ],
    ['chaos'],
  )

  it('sets up a 30-point chaos hole', () => {
    expect(p.resistances.map((r) => [r.type, r.remaining])).toEqual([['chaos', 30]])
  })

  it('does not offer the all-elemental upgrade for it', () => {
    expect(p.followUps.filter((f) => f.type === 'chaos' && f.action === 'upgrade-tier')).toEqual([])
    expect(p.uncovered).toEqual([{ type: 'chaos', points: 30 }])
  })

  it('still offers it for an elemental hole', () => {
    const fire = plan(
      [{ id: 'FireRes1', stats: { [FIRE]: 30 } }],
      [
        { id: 'AllRes2', stats: { [ALL]: 6 } },
        { id: 'Dex1', stats: { [DEX]: 8 } },
        { id: 'Str1', stats: { [STR]: 8 } },
      ],
      ['fire'],
    )
    const up = fire.followUps.filter((f) => f.type === 'fire' && f.action === 'upgrade-tier')
    expect(up).toHaveLength(1)
    // Tier 1 rolls at least 10; the line has 6.
    expect(up[0]!.closes).toBe(4)
  })
})
