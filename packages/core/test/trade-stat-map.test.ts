import { describe, expect, it } from 'vitest'
import {
  MAPPED_STATS,
  normaliseStatText,
  resolveTradeStatMapFromSnapshot,
  type Trade2StatsSnapshot,
} from '../src/pob/trade-stat-map.js'

// Fixture ids are made up for the test; no real trade id is asserted anywhere.
const populated: Trade2StatsSnapshot = {
  patch: '0.0.0-test',
  fetchedAt: '2026-01-01T00:00:00.000Z',
  source: 'fixture',
  entries: [
    { id: 'explicit.t_fire', text: '+#% to Fire Resistance', type: 'explicit' },
    { id: 'explicit.t_cold', text: '+#% to Cold Resistance', type: 'explicit' },
    { id: 'explicit.t_light', text: '+#% to Lightning Resistance', type: 'explicit' },
    { id: 'implicit.t_fire', text: '+#% to Fire Resistance', type: 'implicit' },
    { id: 'explicit.t_other', text: '+#% to Chaos Resistance Something', type: 'explicit' },
  ],
}

describe('normaliseStatText', () => {
  it('lowercases, collapses numbers and ranges, drops a leading plus', () => {
    expect(normaliseStatText('+10% to Fire  Resistance')).toBe('#% to fire resistance')
    expect(normaliseStatText('+#% to Fire Resistance')).toBe('#% to fire resistance')
    expect(normaliseStatText('Adds (5-10) to (12–18) Damage')).toBe('adds # to # damage')
    expect(normaliseStatText('1.5% increased Speed')).toBe('#% increased speed')
  })
})

describe('resolveTradeStatMapFromSnapshot', () => {
  it('maps exact matches of the chosen type and leaves the rest null with a reason', () => {
    const r = resolveTradeStatMapFromSnapshot(populated)
    expect(r).toHaveLength(MAPPED_STATS.length)
    const by = Object.fromEntries(r.map((x) => [x.internalId, x]))
    expect(by['base_fire_damage_resistance_%']).toMatchObject({
      tradeId: 'explicit.t_fire',
      reason: null,
      patch: '0.0.0-test',
      fetchedAt: populated.fetchedAt,
    })
    expect(by['base_cold_damage_resistance_%']!.tradeId).toBe('explicit.t_cold')
    expect(by['base_lightning_damage_resistance_%']!.tradeId).toBe('explicit.t_light')
    expect(by['base_chaos_damage_resistance_%']).toMatchObject({ tradeId: null, reason: 'no-match' })
  })

  it('honours the type filter', () => {
    const r = resolveTradeStatMapFromSnapshot(populated, 'implicit')
    expect(r.find((x) => x.internalId === 'base_fire_damage_resistance_%')!.tradeId).toBe('implicit.t_fire')
    expect(r.find((x) => x.internalId === 'base_cold_damage_resistance_%')!.reason).toBe('no-match')
  })

  it('returns all null with empty-snapshot for an empty snapshot', () => {
    const r = resolveTradeStatMapFromSnapshot({ patch: null, fetchedAt: null, source: 's', entries: [] })
    expect(r.every((x) => x.tradeId === null && x.reason === 'empty-snapshot')).toBe(true)
  })

  it('refuses to pick between duplicate texts', () => {
    const r = resolveTradeStatMapFromSnapshot({
      ...populated,
      entries: [...populated.entries, { id: 'explicit.t_fire2', text: '+#% to fire resistance', type: 'explicit' }],
    })
    expect(r.find((x) => x.internalId === 'base_fire_damage_resistance_%')).toMatchObject({
      tradeId: null,
      reason: 'ambiguous',
    })
  })
})
