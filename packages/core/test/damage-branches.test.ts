/**
 * The damage review across many skills, splits and caps. The real character is Ice Shot; here the primary skill is
 * swapped for other Path of Building active skills so every skill-type branch of the gear and open-slot readers runs.
 * Invariants only; the Ice Shot specifics live in damage-review.test.ts.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { analyzeCharacter } from '../src/analyze.js'
import { normalizeItems } from '../src/model/slots.js'
import { ModTiers, type ModTierData } from '../src/gear/tiers.js'
import { analyzeItem } from '../src/gear/analyze.js'
import { SupportCatalog, type PobSkillData } from '../src/gems/catalog.js'
import { parseAllSetups } from '../src/gems/index.js'
import { highestSocketedTier, reviewDamage } from '../src/recommend/damage.js'

const here = dirname(fileURLToPath(import.meta.url))
const dataDir = join(here, '..', '..', 'data', 'generated')
const payload = JSON.parse(readFileSync(join(here, 'fixtures', 'athrynas-v43.json'), 'utf8'))
const model = payload.charModel ?? payload
const tiers = new ModTiers(JSON.parse(readFileSync(join(dataDir, 'mod-tiers.json'), 'utf8')) as ModTierData)
const skillData = JSON.parse(readFileSync(join(dataDir, 'pob-skills.json'), 'utf8')) as PobSkillData
const catalog = new SupportCatalog(skillData)
const analysis = await analyzeCharacter(payload)
const items = normalizeItems(model).filter((i) => i.active)
const analysed = items.map((i) => analyzeItem(i, tiers, analysis.defense))
const setups = parseAllSetups(model.skills)
const base = { dps: analysis.dps, setups, items: analysed, rawItems: items, tiers, catalog }
const primary = analysis.dps.primary!

const withSkill = (over: Partial<typeof primary>) => ({
  ...base,
  dps: { ...analysis.dps, primary: { ...primary, ...over }, skills: [{ ...primary, ...over }] },
})

// One active skill per distinct type signature, so each type combination is exercised once.
const bySignature = new Map<string, string>()
for (const [name, types] of Object.entries(skillData.actives)) {
  const key = [...types].sort().join('|')
  if (!bySignature.has(key)) bySignature.set(key, name)
}
const sampleSkills = [...bySignature.values()].slice(0, 40)

const splits = [
  [{ type: 'fire', percent: 100 }],
  [{ type: 'lightning', percent: 60 }, { type: 'cold', percent: 40 }],
  [{ type: 'chaos', percent: 100 }],
  [{ type: 'physical', percent: 70 }, { type: 'fire', percent: 30 }],
  [],
] as never[]

describe('reviewDamage across skills, splits and caps', () => {
  it('has skills to sample', () => {
    expect(sampleSkills.length).toBeGreaterThan(5)
  })

  it('stays well-formed for every sampled skill and split', () => {
    for (const [i, name] of sampleSkills.entries()) {
      const split = splits[i % splits.length]!
      for (const cap of [undefined, 1, 3]) {
        const r = reviewDamage({
          ...withSkill({ name, damageSplit: split, gems: [] }),
          ...(cap !== undefined ? { maxSupportTier: cap } : {}),
        })
        expect(r).not.toBeNull()
        expect(r!.skill).toBe(name)
        expect(r!.skillTypes).not.toBeNull()
        if (cap !== undefined) for (const c of r!.strongestCompatible) expect(c.tier).toBeLessThanOrEqual(cap)
        for (const g of r!.gear) expect(g.why.length).toBeGreaterThan(0)
        for (const o of r!.openSlots) expect(o.options.length).toBeGreaterThan(0)
      }
    }
  })

  it('says so when Path of Building has no skill by that name, and still reviews gear', () => {
    const r = reviewDamage(withSkill({ name: 'Not A Real Skill' }))!
    expect(r.skillTypes).toBeNull()
    expect(r.notes.some((n) => n.includes('has no active skill named'))).toBe(true)
    expect(r.gemSwaps).toEqual([])
  })

  it('finds a skill by name, case-insensitively, and returns null for an unknown name', () => {
    expect(reviewDamage({ ...base, skillName: primary.name.toUpperCase() })?.skill).toBe(primary.name)
    expect(reviewDamage({ ...base, skillName: 'nope' })).toBeNull()
  })

  it('falls back to the first skill with damage when there is no primary', () => {
    const r = reviewDamage({ ...base, dps: { ...analysis.dps, primary: null, skills: [primary] } })
    expect(r?.skill).toBe(primary.name)
    expect(reviewDamage({ ...base, dps: { ...analysis.dps, primary: null, skills: [] } })).toBeNull()
  })

  it('reviews the skill\'s own gems when no setup matches it', () => {
    const r = reviewDamage({ ...base, setups: [] })!
    expect(r.supports.length).toBe(primary.gems.length)
  })

  it('flags a damage-over-time skill', () => {
    const r = reviewDamage(withSkill({ isDotOnly: true, dotDps: primary.dps + 1 }))!
    expect(r.notes.some((n) => n.includes('over time'))).toBe(true)
  })

  it('ignores corrupted and inactive items for gear and open slots', () => {
    const dead = analysed.map((i) => ({ ...i, corrupted: true }))
    const r = reviewDamage({ ...base, items: dead })!
    expect(r.gear).toEqual([])
    expect(r.openSlots).toEqual([])
  })
})

describe('highestSocketedTier', () => {
  it('is null when nothing socketed is known to Path of Building', () => {
    expect(highestSocketedTier([], catalog)).toBeNull()
    const unknown = [{ supports: [{ name: 'Not A Gem' }] }] as never
    expect(highestSocketedTier(unknown, catalog)).toBeNull()
  })
})
