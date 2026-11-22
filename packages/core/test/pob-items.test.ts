/**
 * PB-5: items from a Path of Building code (NP1-6b, items half).
 *
 * A code's `<Item>` bodies are PoB's item text, not poe.ninja's structured items. These tests hold the
 * parser to the project rules: only the active item set and the live weapon set count, mods come from the
 * item text and its ranges, and whatever the text does not give (an unknown slot, an unresolved range, a
 * mod the affix data cannot place) is left missing, never guessed.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { analyzeCharacter } from '../src/analyze.js'
import { parsePobItemText, resolveRange, snapshotItems } from '../src/pob/items.js'
import { activeItemSet, readPobSnapshot } from '../src/pob/snapshot.js'
import { snapshotToCharModel } from '../src/pob/to-model.js'
import { normalizeItems } from '../src/model/slots.js'
import type { CharModel } from '../src/model/types.js'

const code = readFileSync(fileURLToPath(new URL('./pob2/forbidden-rites/main.code.txt', import.meta.url)), 'utf8').trim()
const { readPobSnapshotFromCode } = await import('../src/pob/export.js')
const mainSnap = await readPobSnapshotFromCode(code)

function doc(items: string, sets: string, tree = '', extra = ''): string {
  return `<PathOfBuilding2><Build level="80" className="Monk"/><Tree activeSpec="1"><Spec title="s" classId="1" nodes="10,20">${tree}</Spec></Tree>
<Items activeItemSet="2" ${extra}>${items}${sets}</Items></PathOfBuilding2>`
}

describe('resolveRange', () => {
  it('resolves (a-b) at a fraction of the range, to whole numbers when both ends are whole and to the end decimals otherwise', () => {
    expect(resolveRange('+(10-20) to maximum Life', 0.5)).toBe('+15 to maximum Life')
    expect(resolveRange('Adds (1-3) to (5-9) Fire damage', 1)).toBe('Adds 3 to 9 Fire damage')
    expect(resolveRange('(-35--15)% reduced Requirements', 0)).toBe('-35% reduced Requirements')
  })
  it('keeps decimals when an end has them', () => {
    expect(resolveRange('(0.5-1.5) Charges per Second', 0.25)).toBe('0.8 Charges per Second')
  })
})

describe('parsePobItemText', () => {
  it('reads a rare: names, ilvl, requirement, sockets, runes, implicit/explicit split, corruption', () => {
    const item = parsePobItemText(
      [
        'Rarity: RARE',
        'Hypnotic Keep',
        'Runeforged Brigand Mask',
        'Evasion: 341',
        'Unique ID: abc',
        'Item Level: 80',
        'Quality: 20',
        'Sockets: S S',
        'Rune: Greater Iron Rune',
        'Rune: Greater Desert Rune',
        'LevelReq: 65',
        'Implicits: 2',
        '{enchant}{rune}18% increased Armour, Evasion and Energy Shield',
        '{enchant}{rune}+18% to Fire Resistance',
        '+123 to maximum Life',
        '{crafted}+5 to Spirit',
        '{fractured}30% increased Critical Hit Chance',
        '{desecrated}+38% to Lightning Resistance',
        'Corrupted',
      ].join('\n'),
      [],
    )!
    expect(item.name).toBe('Hypnotic Keep')
    expect(item.typeLine).toBe('Runeforged Brigand Mask')
    expect(item.ilvl).toBe(80)
    expect(item.frameType).toBe(2)
    expect(item.rarity).toBe('Rare')
    expect(item.corrupted).toBe(true)
    expect(item.runeMods).toEqual(['18% increased Armour, Evasion and Energy Shield', '+18% to Fire Resistance'])
    expect(item.enchantMods).toEqual([])
    expect(item.explicitMods).toEqual(['+123 to maximum Life'])
    expect(item.craftedMods).toEqual(['+5 to Spirit'])
    expect(item.fracturedMods).toEqual(['30% increased Critical Hit Chance'])
    expect(item.desecratedMods).toEqual(['+38% to Lightning Resistance'])
    expect(item.sockets).toHaveLength(2)
    expect(item.socketedItems?.map((s) => s.typeLine)).toEqual(['Greater Iron Rune', 'Greater Desert Rune'])
    expect(item.requirements).toEqual([{ name: 'Level', values: [['65', 0]] }])
  })

  it('a magic or normal item has one name line, which is its type line; no ilvl is invented', () => {
    const item = parsePobItemText('Rarity: MAGIC\nConcentrated Ultimate Mana Flask of the Sylvan\nImplicits: 0\n66% increased Amount Recovered', [])!
    expect(item.name).toBe('Concentrated Ultimate Mana Flask of the Sylvan')
    expect(item.typeLine).toBe('Concentrated Ultimate Mana Flask of the Sylvan')
    expect(item.ilvl).toBeUndefined()
    expect(item.explicitMods).toEqual(['66% increased Amount Recovered'])
  })

  it('resolves an inline {range:} and a legacy <ModRange>, and leaves a range-less (a-b) line as written', () => {
    const text = [
      'Rarity: RARE',
      'A',
      'Sapphire Ring',
      'Implicits: 0',
      '{range:0.5}+(10-20) to maximum Life',
      '+(1-3) to Strength',
      '+(4-6) to Dexterity',
    ].join('\n')
    // Lines that carry a (a-b) token are numbered in order for <ModRange id>: 1 is the first, 2 the second, ...
    const item = parsePobItemText(text, [{ id: 2, range: 1 }])!
    expect(item.explicitMods).toEqual(['+15 to maximum Life', '+3 to Strength', '+(4-6) to Dexterity'])
    expect(item.unresolvedRanges).toEqual(['+(4-6) to Dexterity'])
  })

  it('keeps only the selected variant of a unique, and drops disabled lines', () => {
    const text = [
      'Rarity: UNIQUE',
      'U',
      'Amulet',
      'Selected Variant: 2',
      'Implicits: 0',
      '{variant:1}+10 to Strength',
      '{variant:2,3}+20 to Dexterity',
      '{disabled}+30 to Intelligence',
    ].join('\n')
    expect(parsePobItemText(text, [])!.explicitMods).toEqual(['+20 to Dexterity'])
  })

  it('reads a granted skill off the line, not as a mod', () => {
    const text = 'Rarity: UNIQUE\nWind\nWar Spear\nImplicits: 2\n31% increased Projectile Speed with this Weapon\nGrants Skill: Level 20 Spear Throw\n+1 to X'
    const item = parsePobItemText(text, [])!
    expect(item.grantedSkills).toEqual([{ name: 'Spear Throw' }])
    expect(item.implicitMods).toEqual(['31% increased Projectile Speed with this Weapon'])
  })

  it('returns null for text with no rarity line', () => {
    expect(parsePobItemText('', [])).toBeNull()
    expect(parsePobItemText('just words', [])).toBeNull()
  })
})

describe('snapshotItems: the main build', () => {
  const { items, flasks, jewels, unmapped } = snapshotItems(mainSnap)
  const bySlot = Object.fromEntries(items.map((i) => [i.itemSlot, i.itemData]))

  it('maps PoB slots onto poe.ninja slot ids, weapon sets included', () => {
    expect(items.map((i) => i.itemSlot).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 7, 8, 9, 11, 15])
    expect(bySlot[1]!.name).toBe('Hypnotic Keep')
    expect(bySlot[7]!.typeLine).toBe('Skullcrusher Quarterstaff')
    expect(bySlot[15]!.name).toBe("Daevata's Wind")
    expect(bySlot[11]!.name).toBe('Mageblood')
  })

  it('flasks and charms that are not switched on are not read; an empty slot adds nothing', () => {
    // The 0.23.1 export carries 2 flasks and 3 charms, none with active="true".
    expect(flasks).toEqual([])
    expect(unmapped).toEqual([])
    expect(Array.isArray(jewels)).toBe(true)
  })

  it('a switched-on flask or charm goes to `flasks`', () => {
    const set = activeItemSet(mainSnap)!
    const on = structuredClone(mainSnap)
    for (const slot of activeItemSet(on)!.slots) if (/^(Flask|Charm) \d+$/.test(slot.name)) slot.active = true
    expect(set.slots.some((s) => s.active)).toBe(false)
    const names = snapshotItems(on).flasks.map((f) => f.itemData.name ?? f.itemData.typeLine)
    expect(names).toHaveLength(5)
    expect(names).toContain("Arakaali's Gift")
    expect(names).toContain('Concentrated Ultimate Mana Flask of the Sylvan')
  })

  it('splits implicit, rune and explicit lines by the Implicits count', () => {
    expect(bySlot[1]!.runeMods).toHaveLength(4)
    expect(bySlot[1]!.explicitMods).toContain('+123 to maximum Life')
    expect(bySlot[1]!.corrupted).toBe(true)
    expect(bySlot[4]!.enchantMods).toEqual(['Allocates Overwhelming Strike'])
    expect(bySlot[4]!.implicitMods).toEqual(['+1 Prefix Modifier allowed', '-1 Suffix Modifier allowed'])
    expect(bySlot[15]!.grantedSkills).toEqual([{ name: 'Spear Throw' }])
  })

  it('snapshotToCharModel carries them, and the idle weapon set is inactive, not counted', () => {
    const model = snapshotToCharModel(mainSnap, code)
    expect(model.items).toHaveLength(10)
    const equipped = normalizeItems(model)
    expect(equipped.find((e) => e.slotId === 15)!.active).toBe(false)
    expect(equipped.find((e) => e.slotId === 7)!.active).toBe(true)
  })
})

describe('snapshotItems: sets and slots', () => {
  const item = (id: number, name: string, base: string) =>
    `<Item id="${id}">Rarity: RARE\n${name}\n${base}\nItem Level: 70\nImplicits: 0\n+10 to Strength</Item>`
  const sets = (second = 'true') =>
    `<ItemSet id="1" title="old" useSecondWeaponSet="false"><Slot name="Helmet" itemId="1"/></ItemSet>` +
    `<ItemSet id="2" title="live" useSecondWeaponSet="${second}"><Slot name="Helmet" itemId="2"/><Slot name="Ring 3" itemId="3"/>` +
    `<Slot name="Weapon 1" itemId="4"/><Slot name="Weapon 1 Swap" itemId="5"/><Slot name="Boots" itemId="0"/><Slot name="Gloves" itemId="99"/></ItemSet>`
  const snap = readPobSnapshot(
    doc(item(1, 'Old Helm', 'Iron Hat') + item(2, 'Live Helm', 'Iron Hat') + item(3, 'Third Ring', 'Sapphire Ring') + item(4, 'Set One', 'Quarterstaff') + item(5, 'Set Two', 'Spear'), sets(), '', 'useSecondWeaponSet="true"'),
  )

  it('reads the active item set only; another set never counts', () => {
    const { items } = snapshotItems(snap)
    const names = items.map((i) => i.itemData.name)
    expect(names).toContain('Live Helm')
    expect(names).not.toContain('Old Helm')
  })

  it('names a slot it cannot place instead of guessing an id, and skips empty and dangling slots', () => {
    const { items, unmapped } = snapshotItems(snap)
    expect(unmapped).toEqual(['Ring 3'])
    expect(items.map((i) => i.itemData.name)).not.toContain('Third Ring')
    expect(items).toHaveLength(3)
  })

  it('keeps both weapon sets with their own slot ids, and the model says which is live', () => {
    const model = snapshotToCharModel(snap)
    expect(model.useSecondWeaponSet).toBe(true)
    const eq = normalizeItems(model)
    expect(eq.find((e) => e.slotId === 7)).toMatchObject({ name: 'Set One', active: false })
    expect(eq.find((e) => e.slotId === 15)).toMatchObject({ name: 'Set Two', active: true })
  })

  it('reads jewels from the active spec sockets, only where the socket node is allocated', () => {
    const j = (id: number, name: string) => `<Item id="${id}">Rarity: RARE\n${name}\nEmerald\nItem Level: 60\nImplicits: 0\n+1 to Dexterity</Item>`
    const s = readPobSnapshot(
      doc(j(7, 'Allocated Gem') + j(8, 'Idle Gem'), `<ItemSet id="2" title="x"/>`, `<Sockets><Socket nodeId="10" itemId="7"/><Socket nodeId="999" itemId="8"/><Socket nodeId="20" itemId="0"/></Sockets>`),
    )
    expect(snapshotItems(s).jewels.map((x) => x.itemData.name)).toEqual(['Allocated Gem'])
  })

  it('an item id missing from <Items> reads as nothing, not a crash', () => {
    const s = readPobSnapshot(doc('', `<ItemSet id="2"><Slot name="Helmet" itemId="5"/></ItemSet>`))
    expect(snapshotItems(s).items).toEqual([])
  })
})

describe('analysis from a code', () => {
  it('a code with items reaches the gear analysis: items listed, each slot analysed', async () => {
    const model: CharModel = snapshotToCharModel(mainSnap, code)
    const analysis = await analyzeCharacter(model, { source: 'pob-export' })
    expect(analysis.items).toHaveLength(10)
    expect(analysis.items.find((i) => i.slotId === 7)!.name).toBe('Skull Song')
  })
})
