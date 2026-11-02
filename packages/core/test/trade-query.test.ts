import { describe, expect, it } from 'vitest'
import {
  buildSearchQuery,
  buildTradeQueries,
  buildTradeUrl,
  constraintsFromHoldingUp,
  URL_MAX_LENGTH,
  TRADE_MIN_ILVL,
  URL_WARN_LENGTH,
  type TradeStatMap,
} from '../src/trade/query.js'
import type { HoldingUpMap } from '../src/constraints/holding-up.js'

const map: TradeStatMap = { 'base_fire_damage_resistance_%': 'explicit.fake_fire', 'base_life': 'explicit.fake_life' }

describe('buildTradeQueries', () => {
  it('builds exact, wider and best-value variants', () => {
    const v = buildTradeQueries(
      {
        baseType: 'Ruby Ring',
        mustKeep: [{ statId: 'base_fire_damage_resistance_%', min: 31 }],
        wanted: [
          { statId: 'base_life', min: 60 },
          { statId: 'unknown_stat', min: 5 },
          { statId: 'base_life', min: 80 },
        ],
      },
      map,
    )
    expect(v.map((x) => x.name)).toEqual(['exact', 'wider', 'best-value'])
    expect(v[0]!.query).toMatchInlineSnapshot(`
      {
        "query": {
          "stats": [
            {
              "filters": [
                {
                  "disabled": false,
                  "id": "explicit.fake_fire",
                  "value": {
                    "min": 31,
                  },
                },
              ],
              "type": "and",
            },
            {
              "filters": [
                {
                  "disabled": false,
                  "id": "explicit.fake_life",
                  "value": {
                    "min": 60,
                  },
                },
                {
                  "disabled": false,
                  "id": "explicit.fake_life",
                  "value": {
                    "min": 80,
                  },
                },
              ],
              "type": "and",
            },
          ],
          "status": {
            "option": "online",
          },
          "type": "Ruby Ring",
        },
        "sort": {
          "price": "asc",
        },
      }
    `)
    expect(v[1]!.query.query.stats[1]).toMatchObject({ type: 'count', value: { min: 1 } }) // n=2 -> max(1, 1)
    expect(v[2]!.query.query.stats[1]).toMatchObject({ type: 'count', value: { min: 1 } })
  })

  it('keeps the must-keep group as a hard "and" in every variant', () => {
    for (const v of buildTradeQueries({ mustKeep: [{ statId: 'base_life', min: 10 }], wanted: [] }, map)) {
      expect(v.query.query.stats).toEqual([{ type: 'and', filters: [{ id: 'explicit.fake_life', value: { min: 10 }, disabled: false }] }])
    }
  })

  it('wider requires all-but-one when there are three wanted mods', () => {
    const w = [1, 2, 3].map((min) => ({ statId: 'base_life', min }))
    const wider = buildTradeQueries({ mustKeep: [], wanted: w }, map)[1]!
    expect(wider.query.query.stats[0]).toMatchObject({ type: 'count', value: { min: 2 } })
  })

  it('reports unmapped stats instead of guessing an id', () => {
    const v = buildTradeQueries({ mustKeep: [{ statId: 'nope', min: 1 }], wanted: [] }, {})
    expect(v[0]!.unmapped).toEqual([{ statId: 'nope', reason: expect.stringMatching(/No trade stat id/) }])
    expect(v[0]!.query.query.stats).toEqual([])
  })
})

describe('constraintsFromHoldingUp', () => {
  const holding = {
    items: [
      {
        slotId: 8,
        holds: [
          { stat: 'fireResistance', minToKeep: 31 },
          { stat: 'coldResistance', minToKeep: 0 },
          { stat: 'life', minToKeep: null },
        ],
      },
    ],
  } as unknown as HoldingUpMap

  it('emits only capped resistances with a positive minimum', () => {
    expect(constraintsFromHoldingUp(holding, 8)).toEqual([{ statId: 'base_fire_damage_resistance_%', min: 31 }])
  })
  it('is empty for a slot with no row', () => {
    expect(constraintsFromHoldingUp(holding, 99)).toEqual([])
  })
})

describe('buildSearchQuery / buildTradeUrl', () => {
  const ok = (r: ReturnType<typeof buildSearchQuery>) => {
    if (!r.ok) throw new Error('expected ok')
    return r.body
  }

  it('builds the body shape', () => {
    const body = ok(
      buildSearchQuery({ type: 'T', status: 'online', stats: [{ id: 'a', min: 5 }, { id: 'b', min: 1, max: 9 }, { id: 'c' }] }),
    )
    expect(body).toEqual({
      query: {
        status: { option: 'online' },
        type: 'T',
        stats: [
          {
            type: 'and',
            filters: [
              { id: 'a', value: { min: 5 }, disabled: false },
              { id: 'b', value: { min: 1, max: 9 }, disabled: false },
              { id: 'c', value: {}, disabled: false },
            ],
          },
        ],
        filters: {
          type_filters: { filters: { rarity: { option: 'nonunique' } } },
          misc_filters: { filters: { ilvl: { min: 60 } } },
        },
      },
      sort: { price: 'asc' },
    })
  })

  it('carries the chosen rarity and the ilvl floor', () => {
    const body = ok(buildSearchQuery({ status: 'online', rarity: 'rare', stats: [] }))
    expect(body.query.filters.type_filters.filters.rarity).toEqual({ option: 'rare' })
    expect(body.query.filters.misc_filters.filters.ilvl).toEqual({ min: TRADE_MIN_ILVL })
    expect(TRADE_MIN_ILVL).toBe(60)
  })

  it('refuses unique', () => {
    const input = { status: 'online', rarity: 'unique', stats: [] } as unknown as Parameters<typeof buildSearchQuery>[0]
    expect(buildSearchQuery(input)).toEqual({ ok: false, reason: 'unique-not-allowed' })
  })

  it('omits type when absent', () => {
    const body = ok(buildSearchQuery({ status: 'any', stats: [] }))
    expect(body.query.type).toBeUndefined()
    expect(body.query.stats).toEqual([{ type: 'and', filters: [] }])
  })

  it('refuses a null stat id with its index', () => {
    expect(buildSearchQuery({ status: 'online', stats: [{ id: 'a' }, { id: null }] })).toEqual({
      ok: false,
      reason: 'null-stat-id',
      index: 1,
    })
  })

  it('round-trips the body through the URL', () => {
    const body = ok(buildSearchQuery({ type: 'Ruby Ring', status: 'online', stats: [{ id: 'x.y', min: 3 }] }))
    const r = buildTradeUrl('Some League', body)
    if (!r.ok) throw new Error('expected ok')
    expect(r.url.startsWith('https://www.pathofexile.com/trade2/search/poe2/Some%20League?q=')).toBe(true)
    expect(r.warning).toBeNull()
    expect(r.length).toBe(r.url.length)
    expect(JSON.parse(decodeURIComponent(new URL(r.url).search.slice(3)))).toEqual(body)
  })

  const withStats = (n: number) =>
    ok(buildSearchQuery({ status: 'online', stats: Array.from({ length: n }, (_, i) => ({ id: `explicit.stat_${i}`, min: i })) }))

  it('warns past 2000 characters', () => {
    const r = buildTradeUrl('L', withStats(30))
    expect(r.ok && r.length > URL_WARN_LENGTH && r.length <= URL_MAX_LENGTH).toBe(true)
    expect(r.ok && r.warning).toBe('long-url')
  })

  it('refuses past 8000 characters', () => {
    const r = buildTradeUrl('L', withStats(200))
    expect(r).toMatchObject({ ok: false, reason: 'url-too-long' })
    expect(!r.ok && r.length).toBeGreaterThan(URL_MAX_LENGTH)
  })
})
