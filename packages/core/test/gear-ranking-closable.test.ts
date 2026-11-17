/**
 * HG1-10: with the affix data, items are ranked first by the resistance
 * shortfall a replacement could close. Yykiuy is short of resistance; the
 * weapon can't roll any, so it no longer heads the list.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { analyzeCharacter } from '../src/analyze.js'
import { analyzeItem } from '../src/gear/analyze.js'
import { rankReplacements } from '../src/gear/priority.js'
import { ModTiers, type ModTierData } from '../src/gear/tiers.js'
import { resistanceShortfalls } from '../src/defense/index.js'

const read = (p: string) => JSON.parse(readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8')) as unknown
const tiers = new ModTiers(read('../../data/generated/mod-tiers.json') as ModTierData)
const a = await analyzeCharacter(read('./fixtures/yykiuy-v80.json'))
const analysed = a.items.filter((i) => i.active).map((i) => analyzeItem(i, tiers, a.defense))

describe('rank by closable shortfall', () => {
  const { ranked } = rankReplacements(analysed, a.defense, a.attribution, tiers)

  it('has a shortfall to close', () => {
    expect(resistanceShortfalls(a.defense).length).toBeGreaterThan(0)
  })

  it('puts an item that can close it first, and the weapon after every such item', () => {
    const total = (r: (typeof ranked)[number]) => Object.values(r.closes).reduce((n, v) => n + v, 0)
    expect(total(ranked[0]!)).toBeGreaterThan(0)
    const totals = ranked.map(total)
    expect(totals).toEqual([...totals].sort((x, y) => y - x))
    const weapon = ranked.find((r) => r.slotLabel === 'Main Hand')!
    expect(total(weapon)).toBe(0)
  })

  it('never claims more than the shortfall', () => {
    const gaps = Object.fromEntries(resistanceShortfalls(a.defense).map((r) => [r.type, r.underCap]))
    for (const r of ranked) for (const [t, v] of Object.entries(r.closes)) expect(v).toBeLessThanOrEqual(gaps[t]!)
  })

  it('leaves the order alone without the affix data', () => {
    const plain = rankReplacements(analysed, a.defense, a.attribution).ranked
    expect(plain.every((r) => Object.keys(r.closes).length === 0)).toBe(true)
  })
})
