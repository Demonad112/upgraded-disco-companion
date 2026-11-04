import { describe, expect, it } from 'vitest'
import { buildWeightedQuery } from '../src/trade/query.js'

const map = { fire_stat: 'explicit.fire', cold_stat: 'explicit.cold' }

describe('buildWeightedQuery', () => {
  it('puts the weighted stats in one weight group with the keep-minimums in an and group', () => {
    const r = buildWeightedQuery(
      {
        baseType: 'Jungle Tiara',
        mustKeep: [{ statId: 'cold_stat', min: 12 }],
        weights: [{ statId: 'fire_stat', weight: 1 }, { statId: 'cold_stat', weight: 1 }],
        minScore: 30.2,
      },
      map,
    )!
    expect(r.query.query.type).toBe('Jungle Tiara')
    expect(r.query.query.stats).toEqual([
      { type: 'and', filters: [{ id: 'explicit.cold', value: { min: 12 }, disabled: false }] },
      {
        type: 'weight',
        value: { min: 31 },
        filters: [
          { id: 'explicit.fire', value: { weight: 1 }, disabled: false },
          { id: 'explicit.cold', value: { weight: 1 }, disabled: false },
        ],
      },
    ])
  })

  it('reports unmapped stats and returns null when none is mapped', () => {
    const r = buildWeightedQuery({ mustKeep: [], weights: [{ statId: 'fire_stat', weight: 1 }, { statId: 'nope', weight: 1 }], minScore: 5 }, map)!
    expect(r.unmapped.map((u) => u.statId)).toEqual(['nope'])
    expect(buildWeightedQuery({ mustKeep: [], weights: [{ statId: 'nope', weight: 1 }], minScore: 5 }, map)).toBeNull()
    expect(buildWeightedQuery({ mustKeep: [], weights: [{ statId: 'fire_stat', weight: 0 }], minScore: 5 }, map)).toBeNull()
  })
})
