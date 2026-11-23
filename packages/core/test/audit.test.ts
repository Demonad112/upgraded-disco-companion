/**
 * Checks over payload the rest of the analysis never read.
 *
 * Every number here was read off the main build before the test was written.
 * Dexterity really is 137 against a requirement of 137; the jewels really are an
 * Emerald and two unique Diamonds; spirit really is 147 with 10 unreserved. A PoB
 * code carries no gem tags, so the gem-quality checks run on hand-built setups
 * (test/helpers/gem-skills.ts) added to the main build.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { importPobExport } from '../src/pob/export.js'
import { ModTiers, type ModTierData } from '../src/gear/tiers.js'
import {
  MAX_GEM_QUALITY,
  SOUL_CORE_LIMITS,
  SOUL_CORE_VALUE_CHANGES,
  TIGHT_ATTRIBUTE_MARGIN,
  auditAttributes,
  auditCharacter,
  auditGemQuality,
  auditSoulCoreChanges,
  auditSoulCoreLimits,
  auditSpirit,
  findEmptySockets,
} from '../src/gear/audit.js'
import { normalizeItems } from '../src/model/slots.js'
import type { CharModel } from '../src/model/types.js'
import { handBuiltSkills } from './helpers/gem-skills.js'
import { mainWithBreakdowns } from './helpers/main-build.js'

const payload = mainWithBreakdowns()
const model: CharModel = payload.charModel ?? payload
model.skills = handBuiltSkills()
const tiers = new ModTiers(
  JSON.parse(
    readFileSync(fileURLToPath(new URL('../../data/generated/mod-tiers.json', import.meta.url)), 'utf8'),
  ) as ModTierData,
)
const pob = await importPobExport(model.pathOfBuildingExport!)
const audit = auditCharacter(model, tiers, pob.playerStats)

describe('jewels', () => {
  it('resolves jewel modifiers, which the item-domain filter used to drop', () => {
    // Jewel affixes are RePoE domain `misc`, not `item`. Filtering to `item`
    // left them unresolvable and the jewels invisible. The rare Emerald's four
    // modifiers resolve to tiers; the two unique Diamonds' lines are text-only.
    expect(audit.jewels).toHaveLength(3)
    expect(audit.jewels.map((j) => j.baseType).sort()).toEqual(['Diamond', 'Diamond', 'Emerald'])
    const emerald = audit.jewels.find((j) => j.baseType === 'Emerald')!
    expect(emerald.mods).toHaveLength(4)
    for (const mod of emerald.mods) expect(mod.tier).not.toBeNull()
    for (const mod of audit.jewels.flatMap((j) => j.mods)) {
      expect(mod.text).not.toBe(mod.id)
    }
  })

  it('tiers a jewel against jewel spawn rules, not gear ones', () => {
    const emerald = audit.jewels.find((j) => j.baseType === 'Emerald')!
    const quarterstaff = emerald.mods.filter((m) => m.id === 'JewelQuarterstaffDamage')
    expect(quarterstaff.length).toBe(1)
    // JewelQuarterstaffDamage spawns on `dexjewel`, which an Emerald carries.
    expect(tiers.canSpawn('JewelQuarterstaffDamage', tiers.tagsForBase('Emerald')!)).toBe(true)
    // …and not on a bow, despite being a weapon-type damage line.
    expect(tiers.canSpawn('JewelQuarterstaffDamage', tiers.tagsForBase('Militant Bow')!)).toBe(false)
  })

  it('never calls a jewel modifier wasted', () => {
    // Overcap waste is a gear-swap concept: it assumes a competing affix slot to
    // trade the modifier for. A jewel has none, so the claim would not hold.
    for (const mod of audit.jewels.flatMap((j) => j.mods)) {
      expect(mod.waste).toBeNull()
    }
  })
})

describe('empty sockets', () => {
  it('reports none when every socket is filled', () => {
    // Every socketed item on this build is filled.
    expect(audit.emptySockets).toEqual([])
  })

  it('counts an empty socket when one exists', () => {
    const items = normalizeItems(model)
    const withHole = items.map((item) =>
      item.slotId === 7
        ? {
            ...item,
            raw: {
              ...item.raw,
              itemData: { ...item.raw.itemData!, sockets: [{}, {}], socketedItems: [{}] },
            },
          }
        : item,
    ) as typeof items

    const found = findEmptySockets(withHole)
    expect(found).toHaveLength(1)
    expect(found[0]).toMatchObject({ slotId: 7, sockets: 2, filled: 1, empty: 1 })
  })
})

describe('gem quality', () => {
  it('flags levelled gems below maximum quality', () => {
    expect(MAX_GEM_QUALITY).toBe(20)
    const names = audit.gemQuality.map((g) => g.gem)
    // Two Ice Shot copies sit at 0% while a third is at 20% (hand-built setups).
    expect(names.filter((n) => n === 'Ice Shot')).toHaveLength(2)
    for (const gem of audit.gemQuality) expect(gem.quality).toBeLessThan(MAX_GEM_QUALITY)
  })

  it('proves the gem can be qualited by pointing at another copy', () => {
    const iceShot = audit.gemQuality.find((g) => g.gem === 'Ice Shot')!
    expect(iceShot.bestElsewhere).toBe(20)
  })

  it('ignores support gems, which report level 0 and quality 0 by convention', () => {
    // Treating those as unqualited would flag every support on every character.
    const supports = ['Rapid Attacks II', 'Deliberation', 'Longshot II', 'Ice Bite II', 'Rapid Casting II']
    for (const name of supports) {
      expect(audit.gemQuality.some((g) => g.gem === name)).toBe(false)
    }
  })

  it('names a triggered setup by its own gem rather than "unknown"', () => {
    // Setups with no dps block — Marks, Mirage Archer — were all rendering as "unknown skill".
    for (const gem of audit.gemQuality) {
      expect(gem.skill).not.toMatch(/unknown/i)
    }
    expect(audit.gemQuality.some((g) => g.skill === 'Mirage Archer')).toBe(true)
  })
})

describe('attribute headroom', () => {
  it('reports how close each attribute is to its requirement', () => {
    const dex = audit.attributes.find((a) => a.attribute === 'dexterity')!
    expect(dex).toMatchObject({ have: 137, required: 137, headroom: 0 })
    // Nothing spare: losing any dexterity source unequips something.
    expect(dex.tight).toBe(true)
    expect(audit.attributes.find((a) => a.attribute === 'intelligence')).toMatchObject({ have: 119, required: 116, headroom: 3, tight: true })
    expect(TIGHT_ATTRIBUTE_MARGIN).toBe(10)
  })

  it('puts the tightest attribute first', () => {
    const headrooms = audit.attributes.map((a) => a.headroom)
    expect([...headrooms].sort((a, b) => a - b)).toEqual(headrooms)
    expect(audit.attributes[0]!.attribute).toBe('dexterity')
  })

  it('does not call excess dexterity waste', () => {
    // 12 points over requirement, but strength grants life and melee damage —
    // calling it waste would be a judgement about build direction.
    const str = audit.attributes.find((a) => a.attribute === 'strength')!
    expect(str.headroom).toBe(12)
    expect(str.tight).toBe(false)
    expect(JSON.stringify(str)).not.toMatch(/waste|excess/i)
  })

  it('returns nothing rather than guessing when the export is absent', () => {
    // poe.ninja reports attributes but not what the gear requires.
    expect(auditAttributes(null)).toEqual([])
  })
})

describe('spirit reservation', () => {
  it('reports reserved and unreserved spirit', () => {
    expect(audit.spirit).toMatchObject({ total: 147, reserved: 137, unreserved: 10 })
    expect(audit.spirit!.unreservedPercent).toBeCloseTo(6.8, 1)
  })

  it('needs the export, and says so rather than reporting zero', () => {
    expect(auditSpirit(null)).toBeNull()
    const withoutPob = auditCharacter(model, tiers, null)
    expect(withoutPob.spirit).toBeNull()
    expect(withoutPob.unavailable.join(' ')).toMatch(/spirit/i)
    expect(withoutPob.unavailable.join(' ')).toMatch(/Path of Building export/)
  })
})

describe('degrading without data', () => {
  it('still checks what it can when the affix data is missing', () => {
    const partial = auditCharacter(model, null, pob.playerStats)
    expect(partial.jewels).toEqual([])
    expect(partial.unavailable.join(' ')).toMatch(/Jewel modifier tiers/)
    // Sockets, gem quality, attributes and spirit need no affix data.
    expect(partial.gemQuality.length).toBeGreaterThan(0)
    expect(partial.attributes.length).toBe(3)
    expect(partial.spirit).not.toBeNull()
  })

  it('reports nothing unavailable when everything is present', () => {
    expect(audit.unavailable).toEqual([])
  })

  it('survives a payload with none of these fields', () => {
    const empty = auditCharacter({ skills: [], items: [] } as unknown as CharModel, tiers, null)
    expect(empty.jewels).toEqual([])
    expect(empty.emptySockets).toEqual([])
    expect(empty.gemQuality).toEqual([])
    expect(empty.spirit).toBeNull()
  })
})

describe('gem quality without a model', () => {
  it('returns an empty list rather than throwing', () => {
    expect(auditGemQuality({} as CharModel)).toEqual([])
  })
})

describe('soul core limits', () => {
  // Synthetic gear: the fixture predates 0.5.5 and socketed only one core.
  const core = (typeLine: string, properties: unknown[] = []) => ({ typeLine, baseType: typeLine, properties })
  const gear = (slotLabel: string, socketedItems: unknown[], active = true) =>
    ({
      slotId: 0,
      slotLabel,
      active,
      name: slotLabel,
      baseType: '',
      itemLevel: null,
      rarity: 'Rare',
      corrupted: false,
      mods: [],
      raw: { itemSlot: 0, itemData: { socketedItems } },
    }) as unknown as Parameters<typeof auditSoulCoreLimits>[0][number]

  it('flags a Limit-1 core socketed twice, citing the 0.5.5 table', () => {
    const report = auditSoulCoreLimits([
      gear('Helmet', [core('Soul Core of Tzamoto')]),
      gear('Boots', [core('Soul Core of Tzamoto')]),
    ])
    expect(report).toEqual([
      {
        name: 'Soul Core of Tzamoto',
        limit: 1,
        limitSource: 'patch-0.5.5',
        socketed: 2,
        excess: 1,
        slotLabels: ['Helmet', 'Boots'],
      },
    ])
  })

  it('reports nothing within the limit, for unlimited cores, or for the inactive weapon set', () => {
    expect(
      auditSoulCoreLimits([
        gear('Helmet', [core('Soul Core of Tzamoto')]),
        gear('Body Armour', [core('Soul Core of Citaqualotl'), core('Soul Core of Citaqualotl')]),
        gear('Weapon 2', [core('Soul Core of Tzamoto')], false),
      ]),
    ).toEqual([])
  })

  it('prefers a limit the payload states over the table', () => {
    const limited = core('Soul Core of Citaqualotl', [{ name: '[Limit]', values: [['1', 0]] }])
    const report = auditSoulCoreLimits([gear('Helmet', [limited]), gear('Gloves', [limited])])
    expect(report).toMatchObject([{ name: 'Soul Core of Citaqualotl', limit: 1, limitSource: 'payload', excess: 1 }])
  })

  it('finds nothing on the real pre-0.5.5 character', () => {
    expect(audit.soulCoreLimits).toEqual([])
  })
})

describe('soul core value changes', () => {
  const gear = (slotLabel: string, names: string[], active = true) =>
    ({
      slotId: 0,
      slotLabel,
      active,
      raw: { itemData: { socketedItems: names.map((n) => ({ typeLine: n, baseType: n })) } },
    }) as unknown as Parameters<typeof auditSoulCoreChanges>[0][number]

  it('lists a socketed core the 0.5.5 notes changed, with old and new values', () => {
    const [r] = auditSoulCoreChanges([gear('Helmet', ['Soul Core of Tzamoto'])])
    expect(r?.name).toBe('Soul Core of Tzamoto')
    expect(r?.changes).toContainEqual({ where: 'Helmet', now: '+2% to Maximum Cold Resistance', before: '+1%' })
  })

  it('ignores unlisted cores and the inactive weapon set', () => {
    expect(auditSoulCoreChanges([gear('Helmet', ['Soul Core of Nobody']), gear('Weapon 2', ['Soul Core of Tzamoto'], false)])).toEqual([])
  })

  it('every limited core also has a recorded value change', () => {
    for (const name of Object.keys(SOUL_CORE_LIMITS)) expect(SOUL_CORE_VALUE_CHANGES[name]).toBeDefined()
  })
})
