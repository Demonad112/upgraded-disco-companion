/**
 * Replacement planning across every equipped slot and option, on the real captured character.
 * Invariants only (capacity, item-level cap, resistance bookkeeping); the exact numbers for the helmet live in replace.test.ts.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { analyzeCharacter } from '../src/analyze.js'
import { normalizeItems } from '../src/model/slots.js'
import { ModTiers, type ModTierData } from '../src/gear/tiers.js'
import { analyzeItem } from '../src/gear/analyze.js'
import { planReplacement } from '../src/gear/replace.js'

const here = dirname(fileURLToPath(import.meta.url))
const dataDir = join(here, '..', '..', 'data', 'generated')
const payload = JSON.parse(readFileSync(join(here, 'fixtures', 'athrynas-v43.json'), 'utf8'))
const model = payload.charModel ?? payload
const tiers = new ModTiers(JSON.parse(readFileSync(join(dataDir, 'mod-tiers.json'), 'utf8')) as ModTierData)
const analysis = await analyzeCharacter(payload)
const items = normalizeItems(model).filter((i) => i.active)
const analysed = items.map((i) => analyzeItem(i, tiers, analysis.defense))

type Extra = { omitResistances?: string[]; maxIlvl?: number }
const run = (target: (typeof analysed)[number], extra: Extra = {}, over: Partial<Parameters<typeof planReplacement>[0]> = {}) =>
  planReplacement({
    target,
    items: analysed,
    rawItems: items,
    defense: analysis.defense,
    attribution: analysis.attribution,
    tiers,
    ...extra,
    ...over,
  })

const options: Extra[] = [
  {},
  { omitResistances: ['fire'] },
  { omitResistances: ['fire', 'cold', 'lightning', 'chaos'] },
  { maxIlvl: 40 },
  { maxIlvl: 1 },
]

describe('planReplacement across every slot and option', () => {
  for (const target of analysed) {
    it(`${target.slotLabel}: plans within capacity and the item level cap`, () => {
      for (const extra of options) {
        const p = run(target, extra)
        const cap = target.rarity === 'Magic' ? 1 : 3
        expect(p.spec.filter((l) => l.kind === 'prefix').length).toBeLessThanOrEqual(cap)
        expect(p.spec.filter((l) => l.kind === 'suffix').length).toBeLessThanOrEqual(cap)
        if (extra.maxIlvl !== undefined) for (const l of p.spec) expect(l.ilvl).toBeLessThanOrEqual(extra.maxIlvl)
        for (const type of extra.omitResistances ?? []) {
          expect(p.spec.some((l) => l.why === 'needed-resistance' && l.statId.includes(type))).toBe(false)
        }
        for (const r of p.resistances) {
          expect(r.coveredBySpec).toBeLessThanOrEqual(r.deficitIfRemoved)
          expect(r.remaining).toBeGreaterThanOrEqual(0)
        }
        for (const f of p.followUps) expect(f.closes).toBeGreaterThan(0)
        for (const u of p.uncovered) expect(u.points).toBeGreaterThan(0)
      }
    })
  }
})

describe('planReplacement edge cases', () => {
  const helmet = () => analysed.find((i) => i.slotLabel === 'Helmet')!

  it('says the base is unknown and suggests no lines', () => {
    const p = run({ ...helmet(), baseType: 'Not A Real Base' })
    expect(p.notes.some((n) => n.includes("isn't in the base data"))).toBe(true)
    expect(p.spec).toEqual([])
  })

  it('warns that a unique loses its effect', () => {
    const p = run({ ...helmet(), rarity: 'Unique' })
    expect(p.notes.some((n) => n.includes('is unique'))).toBe(true)
  })

  it('records omitted resistances as dropped lines with the reason', () => {
    const p = run(helmet(), { omitResistances: ['fire', 'cold', 'lightning'] })
    expect(p.notes.some((n) => n.includes('as asked'))).toBe(true)
  })

  it('never crafts into or upgrades corrupted or inactive items', () => {
    const corrupted = analysed.map((i) => ({ ...i, corrupted: true }))
    const p = run(helmet(), { omitResistances: ['fire', 'cold', 'lightning'] }, { items: corrupted })
    expect(p.followUps).toEqual([])
    expect(p.uncovered.length).toBeGreaterThan(0)
  })

  it('reports uncovered points when no other item has room', () => {
    const full = analysed.map((i) => ({ ...i, affixCounts: { prefix: 3, suffix: 3 }, mods: i.mods.map((m) => ({ ...m, upgrades: [] })) }))
    const p = run(helmet(), { omitResistances: ['fire', 'cold', 'lightning'] }, { items: full })
    expect(p.followUps).toEqual([])
    expect(p.uncovered.map((u) => u.type).sort()).toEqual(['cold', 'fire', 'lightning'])
  })

  it('skips craft targets whose base is not in the data', () => {
    const raw = items.map((i) => ({ ...i, baseType: 'Not A Real Base' }))
    const p = run(helmet(), { omitResistances: ['fire', 'cold', 'lightning'] }, { rawItems: raw })
    expect(p.followUps.filter((f) => f.action === 'craft-open-suffix')).toEqual([])
  })
})
