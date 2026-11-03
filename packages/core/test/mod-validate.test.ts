import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ModTiers, type ModTierData } from '../src/gear/tiers.js'
import { BaseCatalog, type BaseData } from '../src/gear/bases.js'
import { MAX_AFFIXES_PER_KIND, availableMods, inspectBase, validateItemMods } from '../src/gear/validate.js'

const here = dirname(fileURLToPath(import.meta.url))
const dataDir = join(here, '..', '..', 'data', 'generated')
const tiers = new ModTiers(JSON.parse(readFileSync(join(dataDir, 'mod-tiers.json'), 'utf8')) as ModTierData)
const catalog = new BaseCatalog(JSON.parse(readFileSync(join(dataDir, 'bases.json'), 'utf8')) as BaseData)

describe('availableMods', () => {
  it('lists prefix and suffix groups that can roll on a ring, capped by item level', () => {
    const r = availableMods(tiers, 'Golden Hoop', 20)!
    expect(r.itemClass).toBe('Ring')
    const life = r.prefixes.find((a) => a.group === 'IncreasedLife')!
    expect(life.kind).toBe('prefix')
    expect(life.tiers.every((t) => t.ilvl <= 20)).toBe(true)
    expect(life.best.id).toBe('IncreasedLife3')
    expect(life.ladderSize).toBeGreaterThan(life.tiers.length)
    expect(r.suffixes.some((a) => a.group === 'ColdResistance')).toBe(true)
    // Ring cannot roll armour.
    expect(r.prefixes.some((a) => a.best.id.startsWith('IncreasedPhysicalDamageReductionRating'))).toBe(false)
  })
  it('a bow does not get resistances', () => {
    const r = availableMods(tiers, 'Militant Bow', 82)!
    expect(r.suffixes.some((a) => a.group === 'ColdResistance')).toBe(false)
  })
  it('returns null for an unknown base', () => {
    expect(availableMods(tiers, 'Nope Hoop', 80)).toBeNull()
  })
})

describe('validateItemMods', () => {
  it('passes a legal ring', () => {
    const r = validateItemMods(tiers, { base: 'Golden Hoop', itemLevel: 82, modIds: ['IncreasedLife3', 'ColdResist4', 'FireResist8'] })
    expect(r).toMatchObject({ valid: true, baseKnown: true, itemClass: 'Ring', issues: [], unknown: [] })
    expect(r.prefixes).toEqual(['IncreasedLife3'])
    expect(r.suffixes).toEqual(['ColdResist4', 'FireResist8'])
  })
  it('flags duplicate groups, item level, affix counts and off-base mods', () => {
    const r = validateItemMods(tiers, {
      base: 'Golden Hoop',
      itemLevel: 30,
      modIds: [
        'IncreasedLife1',
        'IncreasedLife3',
        'IncreasedMana1',
        'AddedFireDamage1',
        'ColdResist1',
        'FireResist1',
        'FireResist8',
        'IncreasedPhysicalDamageReductionRating1',
        'UniqueNearbyAlliesAddedChaosDamage1',
      ],
    })
    expect(r.valid).toBe(false)
    const kinds = r.issues.map((i) => i.kind)
    expect(kinds).toContain('duplicate-group')
    expect(kinds).toContain('ilvl-too-low')
    expect(kinds).toContain('too-many-prefixes')
    expect(kinds).toContain('not-on-base')
    expect(r.issues.find((i) => i.kind === 'ilvl-too-low')!.modIds).toEqual(['FireResist8'])
    expect(r.unknown).toEqual(['UniqueNearbyAlliesAddedChaosDamage1'])
    expect(r.prefixes.length).toBeGreaterThan(MAX_AFFIXES_PER_KIND)
  })
  it('flags too many suffixes', () => {
    const r = validateItemMods(tiers, { base: 'Golden Hoop', modIds: ['ColdResist1', 'FireResist1', 'LightningResist1', 'ChaosResist1'] })
    expect(r.issues.map((i) => i.kind)).toEqual(['too-many-suffixes'])
  })
  it('skips the base and item-level checks when they are unknown', () => {
    const r = validateItemMods(tiers, { base: 'Nope Hoop', modIds: ['IncreasedPhysicalDamageReductionRating1', 'FireResist8'] })
    expect(r).toMatchObject({ baseKnown: false, itemClass: null, valid: true, issues: [] })
  })
})

describe('inspectBase', () => {
  it('finds a base case-insensitively with its tier data', () => {
    const r = inspectBase(catalog, 'golden hoop', tiers)
    expect(r.found).toMatchObject({ name: 'Golden Hoop', itemClass: 'Ring' })
    expect(r.found!.tags).toContain('ring')
    expect(r.found!.base.type).toBe('Ring')
  })
  it('works without tier data', () => {
    expect(inspectBase(catalog, 'Golden Hoop').found).toMatchObject({ itemClass: null, tags: null })
  })
  it('suggests names on a miss', () => {
    const r = inspectBase(catalog, 'Goldn Hoop')
    expect(r.found).toBeNull()
    expect(r.suggestions).toContain('Golden Hoop')
  })
})
