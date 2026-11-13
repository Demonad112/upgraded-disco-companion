import { describe, expect, it } from 'vitest'
import type { ItemAnalysis, ItemModAnalysis } from '@poe2/core'
import { rankImprovements, tierSummary } from '../src/components/character/gearImprovements'

const up = (tier: number, reachableOnThisItem: boolean) => ({
  tier,
  ilvl: 80,
  affix: null,
  text: null,
  reachableOnThisItem,
  gain: null,
  lowerIsBetter: false,
})
const mod = (text: string, kind: 'prefix' | 'suffix' | null, tier: number | null, extra: Partial<ItemModAnalysis> = {}): ItemModAnalysis => ({
  id: null,
  source: 'explicit',
  kind,
  affix: null,
  text,
  tier,
  tiers: 8,
  ilvlRequired: null,
  rolled: [],
  upgrades: [],
  waste: null,
  unresolved: null,
  ...extra,
})
const item = (mods: ItemModAnalysis[], extra: Partial<ItemAnalysis> = {}): ItemAnalysis =>
  ({
    slotId: 1,
    slotLabel: 'Helmet',
    name: 'Test',
    baseType: 'Base',
    itemClass: null,
    itemLevel: 80,
    rarity: 'Rare',
    corrupted: false,
    active: true,
    mods,
    affixCounts: {
      prefix: mods.filter((m) => m.kind === 'prefix').length,
      suffix: mods.filter((m) => m.kind === 'suffix').length,
    },
    tierProfile: null,
    warnings: [],
    ...extra,
  }) as ItemAnalysis

describe('improvement ranking', () => {
  const mods = [
    mod('big change', 'prefix', 6, { upgrades: [up(1, true)] }),
    mod('small change', 'prefix', 3, { upgrades: [up(2, true)] }),
    mod('needs base', 'suffix', 5, { upgrades: [up(1, false)] }),
    mod('over cap', 'suffix', 2, { waste: { amount: 12, stat: 'fire', reason: 'over cap' }, upgrades: [up(1, true)] }),
    mod('top', 'suffix', 1),
  ]

  it('orders Wasted > Open slot > Change (largest gap first) > New base', () => {
    const out = rankImprovements(item(mods, { affixCounts: { prefix: 2, suffix: 3 } }))
    expect(out.map((x) => [x.kind, x.rank])).toEqual([
      ['wasted', 1],
      ['open', 2],
      ['change', 3],
      ['change', 4],
      ['newbase', 5],
    ])
    expect(out[2]!.modIndex).toBe(0) // gap 5 before gap 1
    expect(out[1]).toMatchObject({ affix: 'prefix', modIndex: null })
  })

  it('counts a wasted line once, even when a better tier exists', () => {
    const out = rankImprovements(item(mods))
    expect(out.filter((x) => x.modIndex === 3)).toHaveLength(1)
  })

  it('gives a corrupted item no Change, New base or open slots', () => {
    const out = rankImprovements(item(mods, { corrupted: true }))
    expect(out.map((x) => x.kind)).toEqual(['wasted'])
  })

  it('reports no open slots when an affix line could not be placed or the rarity has no budget', () => {
    expect(rankImprovements(item([mod('?', null, null)])).filter((x) => x.kind === 'open')).toHaveLength(0)
    expect(rankImprovements(item([], { rarity: 'Unique' }))).toEqual([])
  })

  it('summarises T1 x of y over placed affix lines only', () => {
    expect(tierSummary(item([...mods, mod('unplaced', 'prefix', null), mod('rune', null, 1, { source: 'rune' })]))).toEqual({ top: 1, of: 5 })
  })
})
