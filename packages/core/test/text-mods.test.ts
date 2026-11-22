/**
 * PB-5: matching a code's item text to mod ids (`gear/text-mods.ts`), the analysis that carries them
 * (`withResolvedMods` via `analyzeCharacter`), the `textOnlyMods` findings (`gear/analyze.ts`), the
 * conditional gear gap (`pobCodeGaps`), and a cross-check of a parsed code's items against poe.ninja's.
 *
 * Rules held here: text proves an id or the line stays text; nothing is guessed from a tier overlap, a base
 * the data does not know, or a rarity mismatch.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { analyzeCharacter } from '../src/analyze.js'
import { analyzeItem } from '../src/gear/analyze.js'
import { matchModLine, resolveItemMods } from '../src/gear/text-mods.js'
import { ModTiers, type ModTierData } from '../src/gear/tiers.js'
import { pobCodeGaps } from '../src/pob/analyze.js'
import { snapshotItems } from '../src/pob/items.js'
import { pobToCharModel } from '../src/pob/to-model.js'
import { readPobSnapshotFromCode } from '../src/pob/export.js'
import { normalizeItems } from '../src/model/slots.js'
import type { CharModel, NinjaItem } from '../src/model/types.js'
import { mainPayload } from './helpers/main-build.js'

const here = dirname(fileURLToPath(import.meta.url))

// A tiny affix table: a ring can roll cold resistance in two tiers that overlap at 21–30, life in one tier;
// a quarterstaff cannot roll resistance. Display-only: one implicit, one unique line.
const data: ModTierData = {
  version: 1,
  generatedFrom: [],
  note: '',
  baseTags: { 'Sapphire Ring': ['ring', 'default'], 'Skullcrusher Quarterstaff': ['staff', 'default'] },
  baseClass: { 'Sapphire Ring': 'Ring', 'Skullcrusher Quarterstaff': 'Quarterstaff' },
  mods: {
    Life1: { g: 'Life', t: 'p', lvl: 1, name: 'Healthy', stats: [['base_life', 10, 20]], text: '+(10-20) to maximum Life', spawn: [['default', 1]] },
    Cold1: { g: 'ColdResist', t: 's', lvl: 1, name: 'of the Cub', stats: [['cold_res', 6, 30]], text: '+(6-30)% to Cold Resistance', spawn: [['ring', 1], ['default', 0]] },
    Cold2: { g: 'ColdResist', t: 's', lvl: 40, name: 'of the Wolf', stats: [['cold_res', 21, 40]], text: '+(21-40)% to Cold Resistance', spawn: [['ring', 1], ['default', 0]] },
    FireA: { g: 'FireResist', t: 's', lvl: 1, name: 'of the Fox', stats: [['fire_res', 6, 10]], text: '+(6-10)% to Fire Resistance', spawn: [['ring', 1], ['default', 0]] },
    Hybrid1: {
      g: 'Hybrid', t: 'p', lvl: 1, name: 'Stalwart', stats: [['base_life', 5, 9], ['es', 3, 5]],
      text: '+(5-9) to maximum Life\n+(3-5) to maximum Energy Shield', spawn: [['default', 1]],
    },
  },
  displayOnly: {
    Imp1: { t: 'o', name: null, text: '+(1-2) to Level of all Skills', stats: [['skill_lvl', 1, 2]] },
    Uniq1: { t: 'o', name: null, text: '+(20-30) to Strength', stats: [['str', 20, 30]] },
  },
}
const tiers = new ModTiers(data)
const ring = { rarity: 'Rare', baseTags: tiers.tagsForBase('Sapphire Ring') }
const staff = { rarity: 'Rare', baseTags: tiers.tagsForBase('Skullcrusher Quarterstaff') }

describe('matchModLine', () => {
  it('a rare ring line within one tier resolves to its id and rolled stat', () => {
    expect(matchModLine('+15 to maximum Life', 'explicit', ring, tiers)).toEqual({ id: 'Life1', stats: { base_life: 15 } })
    expect(matchModLine('+8% to Fire Resistance', 'explicit', ring, tiers)).toEqual({ id: 'FireA', stats: { fire_res: 8 } })
  })

  it('a roll outside every range, or with the wrong number of values, is unresolved', () => {
    expect(matchModLine('+21 to maximum Life', 'explicit', ring, tiers)).toBeNull()
    expect(matchModLine('+15 to +20 to maximum Life', 'explicit', ring, tiers)).toBeNull()
  })

  it('a roll that fits two tiers of one group is a guess, so it stays text', () => {
    expect(matchModLine('+25% to Cold Resistance', 'explicit', ring, tiers)).toBeNull()
    // Outside the overlap it is proven.
    expect(matchModLine('+10% to Cold Resistance', 'explicit', ring, tiers)).toMatchObject({ id: 'Cold1' })
    expect(matchModLine('+35% to Cold Resistance', 'explicit', ring, tiers)).toMatchObject({ id: 'Cold2' })
  })

  it('an affix that cannot spawn on the base, or a base the data does not know, is unresolved', () => {
    expect(matchModLine('+10% to Cold Resistance', 'explicit', staff, tiers)).toBeNull()
    expect(matchModLine('+10% to Cold Resistance', 'explicit', { rarity: 'Rare', baseTags: null }, tiers)).toBeNull()
  })

  it('a unique line matches display data only, a rare line never matches a display mod', () => {
    const unique = { rarity: 'Unique', baseTags: tiers.tagsForBase('Sapphire Ring') }
    expect(matchModLine('+25 to Strength', 'explicit', unique, tiers)).toMatchObject({ id: 'Uniq1' })
    expect(matchModLine('+25 to Strength', 'explicit', ring, tiers)).toBeNull()
    // A unique's craftable-looking line is not given a craftable tier.
    expect(matchModLine('+15 to maximum Life', 'explicit', unique, tiers)).toBeNull()
  })

  it('an implicit matches display data on any rarity, even on an unknown base', () => {
    expect(matchModLine('+1 to Level of all Skills', 'implicit', { rarity: 'Rare', baseTags: null }, tiers)).toMatchObject({ id: 'Imp1' })
  })

  it('strips [Tag|Display] markup before matching', () => {
    expect(matchModLine('+15 to [Life|maximum Life]', 'explicit', ring, tiers)).toMatchObject({ id: 'Life1' })
  })

  it('a line with no range-free numbers and no match is null, not an error', () => {
    expect(matchModLine('Cannot be Frozen', 'explicit', ring, tiers)).toBeNull()
    expect(matchModLine('', 'explicit', ring, tiers)).toBeNull()
  })

  it('a hybrid mod line 1 is not resolved: its text spans two lines', () => {
    // 7 fits the hybrid's first range, but a single line is never proven to be a two-line mod.
    expect(matchModLine('+7 to maximum Life', 'explicit', ring, tiers)).toBeNull()
  })
})

function item(slot: number, data: NinjaItem['itemData']): NinjaItem {
  return { itemSlot: slot, itemData: data }
}

describe('resolveItemMods', () => {
  const input = item(4, {
    name: 'Doom Loop',
    typeLine: 'Sapphire Ring',
    rarity: 'Rare',
    implicitMods: ['+1 to Level of all Skills', 'unknown implicit'],
    explicitMods: ['+15 to maximum Life', '+25% to Cold Resistance', 'Cannot be Frozen'],
  })
  const [out] = resolveItemMods([input], tiers)

  it('attaches ids in poe.ninja shape, keyed by line kind', () => {
    expect(out!.itemData.mods).toEqual({
      implicit: [{ id: 'Imp1', stats: { skill_lvl: 1 } }],
      explicit: [{ id: 'Life1', stats: { base_life: 15 } }],
    })
  })

  it('lists unresolved explicit lines as text only, but not an unresolved implicit', () => {
    expect(out!.itemData.textOnlyMods).toEqual(['+25% to Cold Resistance', 'Cannot be Frozen'])
  })

  it('does not mutate its input, and keeps the item when nothing matches', () => {
    expect(input.itemData.mods).toBeUndefined()
    expect(input.itemData.textOnlyMods).toBeUndefined()
    const [bare] = resolveItemMods([item(1, { typeLine: 'Nowhere Base', rarity: 'Rare', explicitMods: ['+15 to maximum Life'] })], tiers)
    expect(bare!.itemData.mods).toBeUndefined()
    expect(bare!.itemData.textOnlyMods).toEqual(['+15 to maximum Life'])
  })

  it('treats a missing rarity as Normal, so an affix line is not proven by a display mod', () => {
    const [normal] = resolveItemMods([item(4, { typeLine: 'Sapphire Ring', explicitMods: ['+25 to Strength'] })], tiers)
    expect(normal!.itemData.textOnlyMods).toEqual(['+25 to Strength'])
  })
})

describe('withResolvedMods (through analyzeCharacter)', () => {
  const model: CharModel = {
    name: 'T', level: 80, class: 'Monk',
    items: [item(4, { name: 'Doom Loop', typeLine: 'Sapphire Ring', rarity: 'Rare', explicitMods: ['+15 to maximum Life', '+25% to Cold Resistance'] })],
    jewels: [item(12, { name: 'Gem', typeLine: 'Sapphire Ring', rarity: 'Rare', explicitMods: ['+15 to maximum Life'] })],
  } as unknown as CharModel

  const mods = (a: Awaited<ReturnType<typeof analyzeCharacter>>, key: 'items' | 'jewels') =>
    ((a.model[key] as NinjaItem[])[0]!.itemData.mods as Record<string, { id: string }[]> | undefined)

  it('resolves items and jewels of a code when the affix data is given', async () => {
    const a = await analyzeCharacter(model, { source: 'pob-export', tiers })
    expect(mods(a, 'items')!.explicit!.map((m) => m.id)).toEqual(['Life1'])
    expect(mods(a, 'jewels')!.explicit!.map((m) => m.id)).toEqual(['Life1'])
    expect(a.sourceGaps.find((g) => g.what === 'Gear findings and trade searches')!.why).toContain('1 mod line could not')
  })

  it('leaves them as text without the affix data, and never for a poe.ninja source', async () => {
    expect(mods(await analyzeCharacter(model, { source: 'pob-export' }), 'items')).toBeUndefined()
    expect(mods(await analyzeCharacter(model, { tiers }), 'items')).toBeUndefined()
  })
})

describe('textOnlyMods in gear/analyze', () => {
  const [resolved] = resolveItemMods(
    [item(4, { name: 'Doom Loop', typeLine: 'Sapphire Ring', rarity: 'Rare', explicitMods: ['+15 to maximum Life', '+25% to Cold Resistance'] })],
    tiers,
  )
  const [equipped] = normalizeItems({ items: [resolved!] } as unknown as CharModel)
  const analysis = analyzeItem(equipped!, tiers)

  it('each text-only line is an explicit mod with no id, tier or upgrade, and says why', () => {
    const text = analysis.mods.find((m) => m.text === '+25% to Cold Resistance')!
    expect(text).toMatchObject({ id: null, source: 'explicit', tier: null, tiers: null, upgrades: [], waste: null })
    expect(text.unresolved).toMatch(/text only/)
  })

  it('a resolved line next to it keeps its id', () => {
    expect(analysis.mods.find((m) => m.id === 'Life1')).toMatchObject({ source: 'explicit', kind: 'prefix' })
  })
})

describe('gear gap (pobCodeGaps)', () => {
  const gap = (gear?: Parameters<typeof pobCodeGaps>[1]) => pobCodeGaps({}, gear).find((g) => g.what === 'Gear findings and trade searches')

  it('no gear info (the reduced PoB-only view) says it does not read items', () => {
    expect(gap()!.why).toBe('This view does not read the items in a code.')
  })

  it('no items in the active set says so', () => {
    expect(gap({ items: 0, unmapped: [], textOnly: 0 })!.why).toMatch(/no items in its active item set/)
  })

  it('everything read and resolved removes the gap', () => {
    expect(gap({ items: 10, unmapped: [], textOnly: 0 })).toBeUndefined()
  })

  it('an unmapped slot is named, a text-only line is counted with singular and plural grammar', () => {
    expect(gap({ items: 9, unmapped: ['Ring 3'], textOnly: 0 })!.why).toBe('Ring 3 has no slot on poe.ninja, so it is not read.')
    expect(gap({ items: 9, unmapped: [], textOnly: 1 })!.why).toBe('1 mod line could not be matched to exactly one mod, so it has no tier.')
    expect(gap({ items: 9, unmapped: ['Ring 3', 'Arm 1'], textOnly: 3 })!.why).toBe(
      'Ring 3, Arm 1 has no slot on poe.ninja, so it is not read; 3 mod lines could not be matched to exactly one mod, so they have no tier.',
    )
  })
})

describe('cross-check: athrynas-v43 code items against its poe.ninja items', () => {
  const payload = mainPayload()
  const ninja: CharModel = payload.charModel ?? payload
  const code: string = ninja.pathOfBuildingExport ?? payload.pathOfBuildingExport
  const norm = (s: string): string => s.replace(/\[(?:[^\]|]+\|)?([^\]]+)\]/g, '$1').replace(/\s+/g, ' ').trim()
  const lines = (d: NinjaItem['itemData']): string[] =>
    [d.implicitMods, d.runeMods, d.explicitMods, d.craftedMods, d.desecratedMods, d.fracturedMods].flatMap((l) => (l ?? []).map(norm))

  it('every slot the code fills matches poe.ninja by name and base, and most lines agree', async () => {
    const snap = await readPobSnapshotFromCode(code)
    const fromCode = snapshotItems(snap).items
    const bySlot = new Map((ninja.items ?? []).map((i) => [i.itemSlot, i.itemData]))
    expect(fromCode.length).toBeGreaterThan(5)
    let same = 0
    let total = 0
    for (const c of fromCode) {
      const n = bySlot.get(c.itemSlot)
      expect(n, `slot ${c.itemSlot} exists on poe.ninja`).toBeDefined()
      expect(norm(c.itemData.name ?? '')).toBe(norm(n!.name ?? ''))
      expect(norm(c.itemData.typeLine ?? '')).toBe(norm(n!.typeLine ?? ''))
      const theirs = new Set(lines(n!))
      for (const l of lines(c.itemData)) {
        total++
        if (theirs.has(l)) same++
      }
    }
    // PoB rounds a range to the nearest whole number; a line can differ by a point, so require most, not all.
    expect(same / total).toBeGreaterThan(0.8)
  })

  it('the converted model carries the same slots', async () => {
    const model = await pobToCharModel(code)
    expect(new Set((model.items ?? []).map((i) => i.itemSlot))).toEqual(
      new Set(snapshotItems(await readPobSnapshotFromCode(code)).items.map((i) => i.itemSlot)),
    )
  })
})
