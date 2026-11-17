import { describe, expect, it } from 'vitest'
import { MAPPED_STATS, URL_MAX_LENGTH } from '@poe2/core'
import { improvable, resistGaps, weightedTradeLink } from '../src/components/character/gearTargetsData'

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
    expect(weight.filters).toHaveLength(1) // held-up cold is a minimum only, not a weight
  })

  it('keeps the full held-up resistance as the minimum, not one affix roll (pseudo totals, R65)', () => {
    const url = weightedTradeLink({ baseType: 'Jungle Tiara', removalCost: { cold: 70 } }, { fire: 15 }, map, 'Standard')!
    const keep = JSON.parse(new URL(url).searchParams.get('q')!).query.stats[0]
    expect(keep.filters[0].value).toEqual({ min: 70 })
  })

  it('weighs only resistances the base can roll (B1-1: a quarterstaff rolls none)', () => {
    const row = { baseType: 'Long Quarterstaff', removalCost: {} }
    const gaps = { lightning: 2, chaos: 6 }
    expect(weightedTradeLink(row, gaps, map, 'Standard', () => false)).toBeNull()
    const onlyChaos = (id: string) => id.includes('chaos')
    const q = JSON.parse(new URL(weightedTradeLink(row, gaps, map, 'Standard', onlyChaos)!).searchParams.get('q')!)
    expect(q.query.stats.at(-1).filters).toHaveLength(1)
    expect(q.query.stats.at(-1).value).toEqual({ min: 6 })
  })

  it('has no link when no resistance is short, even if the item holds some up', () => {
    expect(weightedTradeLink({ baseType: 'x', removalCost: { cold: 20 } }, {}, map, 'Standard')).toBeNull()
  })

  it('has no link when the URL would pass URL_MAX_LENGTH (the row shows Open /trade instead)', () => {
    const row = { baseType: 'Jungle Tiara', removalCost: { cold: 20 } }
    expect(weightedTradeLink(row, { fire: 15 }, map, 'Standard')).not.toBeNull()
    expect(weightedTradeLink(row, { fire: 15 }, map, 'x'.repeat(URL_MAX_LENGTH))).toBeNull()
  })

  it('has no link when there is no resistance reason, and rows need a reason', () => {
    expect(weightedTradeLink({ baseType: 'x', removalCost: {} }, {}, map, 'Standard')).toBeNull()
    expect(improvable({ reasons: [] })).toBe(false)
    expect(improvable({ reasons: ['x'] })).toBe(true)
  })
})

describe('gear slot grid order (B1-8)', () => {
  it('puts ranked items first in rank order, then the rest, skipping inactive and unknown slots', async () => {
    const { gridOrder } = await import('../src/components/character/GearSlotGrid')
    const items = [1, 4, 7, 3, 8, 9, 2, 11, 5, 15, 99].map((slotId) => ({ slotId, active: slotId !== 15 }))
    const rows = [{ slotId: 4 }, { slotId: 9 }, { slotId: 7 }]
    expect(gridOrder(items, rows).map((i) => i.slotId)).toEqual([4, 9, 7, 1, 3, 8, 2, 11, 5])
  })
})
