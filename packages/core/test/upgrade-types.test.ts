import { describe, expect, it } from 'vitest'
import { buildTradeoffLine } from '../src/upgrade/tradeoff.js'
import { isEstimated, type EstimatedCard, type ObservedCard, type UpgradeCard } from '../src/upgrade/types.js'
import { scoreUpgrade } from '../src/upgrade/scoring.js'

const score = scoreUpgrade({ dps: 1, lowestMaxHit: 1, ehp: 1 }, { dps: 1, lowestMaxHit: 1, ehp: 1 }, { mode: 'bossing' })
const common: Omit<ObservedCard, 'source'> = {
  id: 'x',
  slotId: 8,
  slotLabel: 'Ring 1',
  itemName: 'Test Ring',
  gain: { damage: { kind: 'unknown', reason: 'n/a' }, survivability: { kind: 'unknown', reason: 'n/a' } },
  tradeoff: null,
  mods: [],
  assumptions: [],
  rarityLabel: null,
  score,
}

describe('buildTradeoffLine', () => {
  it('lists only what is given up', () => {
    expect(
      buildTradeoffLine([
        { label: 'damage', value: 4.2, unit: '%' },
        { label: 'survivability', value: -0.64, unit: '%' },
        { label: 'mana', value: -33, unit: '' },
      ]),
    ).toBe('-0.6% survivability, -33 mana')
  })
  it('is null when nothing is lost or values are not finite', () => {
    expect(buildTradeoffLine([{ label: 'damage', value: 1, unit: '%' }])).toBeNull()
    expect(buildTradeoffLine([{ label: 'x', value: Number.NaN, unit: '' }])).toBeNull()
    expect(buildTradeoffLine([])).toBeNull()
  })
})

describe('card source typing', () => {
  it('an estimated card needs estimate metadata; an observed card cannot carry it', () => {
    // @ts-expect-error estimate without its metadata
    const bad: EstimatedCard = { ...common, source: 'estimate' }
    // @ts-expect-error observed card with estimate metadata
    const bad2: ObservedCard = { ...common, source: 'ninja', estimate: { configHash: 'y', conditions: [] } }
    expect([bad, bad2]).toHaveLength(2)

    const est: UpgradeCard = { ...common, source: 'estimate', estimate: { configHash: 'h', conditions: [] } }
    const obs: UpgradeCard = { ...common, source: 'ninja' }
    expect(isEstimated(est)).toBe(true)
    expect(isEstimated(obs)).toBe(false)
  })
})
