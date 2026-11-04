import { describe, expect, it } from 'vitest'
import { MAPPED_STATS } from '@poe2/core'
import { improvable, resistGaps, weightedTradeLink } from '../src/components/character/gearTargets'

const map = Object.fromEntries(MAPPED_STATS.map((m, i) => [m.internalId, `explicit.stat_${i}`]))

describe('gear targets', () => {
  it('reads gaps only from known, under-cap resistances', () => {
    const d = {
      resistances: [
        { type: 'fire', value: 60, max: 75, overCap: 0, underCap: 15, capped: false },
        { type: 'cold', value: null, max: 75, overCap: null, underCap: null, capped: null },
        { type: 'lightning', value: 75, max: 75, overCap: 0, underCap: 0, capped: true },
      ],
    } as never
    expect(resistGaps(d)).toEqual({ fire: 15 })
  })

  it('links a weight group over the shortfalls with the held-up resistances as minimums', () => {
    const url = weightedTradeLink({ baseType: 'Jungle Tiara', removalCost: { cold: 20 } }, { fire: 15 }, map, 'Standard')!
    const q = JSON.parse(new URL(url).searchParams.get('q')!)
    expect(q.query.type).toBe('Jungle Tiara')
    const [keep, weight] = q.query.stats
    expect(keep.type).toBe('and')
    expect(keep.filters[0].value).toEqual({ min: 20 })
    expect(weight.type).toBe('weight')
    expect(weight.value).toEqual({ min: 15 })
    expect(weight.filters).toHaveLength(2)
  })

  it('has no link when there is no resistance reason, and rows need a reason', () => {
    expect(weightedTradeLink({ baseType: 'x', removalCost: {} }, {}, map, 'Standard')).toBeNull()
    expect(improvable({ reasons: [] })).toBe(false)
    expect(improvable({ reasons: ['x'] })).toBe(true)
  })
})
