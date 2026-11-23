/**
 * PB-5: a code's item text is matched to mod ids only where the text proves one (`gear/text-mods.ts`),
 * and the analysis lists whatever stays text. Inline affix data keeps every number exact.
 */

import { describe, expect, it } from 'vitest'
import { analyzeCharacter } from '../src/analyze.js'
import { analyzeItem } from '../src/gear/analyze.js'
import { ModTiers, type ModTierData } from '../src/gear/tiers.js'
import { matchModLine, resolveItemMods } from '../src/gear/text-mods.js'
import { normalizeItems } from '../src/model/slots.js'
import type { CharModel, NinjaItem } from '../src/model/types.js'
import { pobCodeGaps } from '../src/pob/analyze.js'

const LIFE = 'base_maximum_life'
const FIRE = 'base_fire_damage_resistance_%'
const COLD = 'base_cold_damage_resistance_%'
const helm: [string, number][] = [['helmet', 1], ['gloves', 1]]
const affix = (g: string, t: 'p' | 's', lvl: number, stat: string, min: number, max: number, text: string, spawn = helm) => ({
  g,
  t,
  lvl,
  name: g,
  stats: [[stat, min, max]] as [string, number, number][],
  text,
  spawn,
})

const tiers = new ModTiers({
  version: 1,
  generatedFrom: ['inline test data'],
  note: '',
  baseTags: { 'Test Helm': ['helmet'], 'Test Shield': ['shield'], 'Test Gloves': ['gloves'] },
  baseClass: { 'Test Helm': 'Helmets', 'Test Shield': 'Shields', 'Test Gloves': 'Gloves' },
  mods: {
    Life1: affix('Life', 'p', 1, LIFE, 40, 49, '+(40-49) to maximum Life'),
    Life2: affix('Life', 'p', 50, LIFE, 50, 59, '+(50-59) to maximum Life'),
    Fire1: affix('FireRes', 's', 1, FIRE, 26, 30, '+(26-30)% to Fire Resistance'),
    Cold1: affix('ColdRes', 's', 1, COLD, 20, 30, '+(20-30)% to Cold Resistance'),
    Cold2: affix('ColdRes', 's', 40, COLD, 28, 35, '+(28-35)% to Cold Resistance'),
    DupP: affix('DupP', 'p', 1, 'dup_stat', 5, 9, '+(5-9) Duplicated'),
    DupS: affix('DupS', 's', 1, 'dup_stat', 5, 9, '+(5-9) Duplicated'),
    // A hybrid prints its second stat as its own line: "+(40-49) to maximum Life" is also this mod's line 2.
    HybridLife: {
      g: 'HybridLife',
      t: 'p' as const,
      lvl: 1,
      name: 'Hybrid',
      stats: [['hybrid_stat', 10, 20], [LIFE, 40, 49]] as [string, number, number][],
      text: '(10-20)% increased Hybrid',
      spawn: [['gloves', 1]] as [string, number][],
    },
    // Stats stored in other units than the text shows (permyriad, negated "reduced").
    Leech1: affix('Leech', 'p', 1, 'leech_permyriad', 500, 1000, '(5-10)% Leeched'),
    Slow1: affix('Slow', 's', 1, 'slow_+%', -20, -10, '(10-20)% reduced Slow'),
    ShieldOnly: affix('Block', 'p', 1, 'block', 5, 9, '+(5-9)% to Block', [['shield', 1]]),
  },
  displayOnly: {
    ImpSpirit: { t: 'o', name: null, text: '+(10-20) to Spirit', stats: [['spirit', 10, 20]] },
    UniqFire: { t: 'o', name: null, text: '+(26-30)% to Fire Resistance', stats: [[FIRE, 26, 30]] },
  },
} satisfies ModTierData)

const rare = { rarity: 'Rare', baseTags: ['helmet'] }

describe('matchModLine', () => {
  it('matches a rolled line to its mod and returns the rolled stat', () => {
    expect(matchModLine('+45 to maximum Life', 'explicit', rare, tiers)).toEqual({ id: 'Life1', stats: { [LIFE]: 45 } })
    expect(matchModLine('+55 to maximum Life', 'explicit', rare, tiers)?.id).toBe('Life2')
  })
  it('ignores [Tag|text] markup', () => {
    expect(matchModLine('+27% to [Resistances|Fire Resistance]', 'explicit', rare, tiers)?.id).toBe('Fire1')
  })
  it('rejects a roll outside the mod range, and a different line count', () => {
    expect(matchModLine('+39 to maximum Life', 'explicit', rare, tiers)).toBeNull()
    expect(matchModLine('+60 to maximum Life', 'explicit', rare, tiers)).toBeNull()
  })
  it('does not give an id when two tiers of one group both contain the roll', () => {
    expect(matchModLine('+29% to Cold Resistance', 'explicit', rare, tiers)).toBeNull()
    expect(matchModLine('+22% to Cold Resistance', 'explicit', rare, tiers)?.id).toBe('Cold1')
    expect(matchModLine('+33% to Cold Resistance', 'explicit', rare, tiers)?.id).toBe('Cold2')
  })
  it('does not give an id when a prefix and a suffix share the text', () => {
    expect(matchModLine('+7 Duplicated', 'explicit', rare, tiers)).toBeNull()
  })
  it('needs the affix to be able to spawn on the base, and an unknown base resolves no affix', () => {
    expect(matchModLine('+7% to Block', 'explicit', rare, tiers)).toBeNull()
    expect(matchModLine('+45 to maximum Life', 'explicit', { rarity: 'Rare', baseTags: null }, tiers)).toBeNull()
  })
  it('matches an implicit against display mods only, and a unique line is never given a craftable tier', () => {
    expect(matchModLine('+15 to Spirit', 'implicit', rare, tiers)?.id).toBe('ImpSpirit')
    expect(matchModLine('+15 to Spirit', 'explicit', rare, tiers)).toBeNull()
    expect(matchModLine('+27% to Fire Resistance', 'explicit', { rarity: 'Unique', baseTags: ['helmet'] }, tiers)?.id).toBe('UniqFire')
    expect(matchModLine('+45 to maximum Life', 'explicit', { rarity: 'Unique', baseTags: ['helmet'] }, tiers)).toBeNull()
  })
})

const item = (itemSlot: number, rarity: string, base: string, explicitMods: string[], implicitMods: string[] = []): NinjaItem => ({
  itemSlot,
  itemData: { name: 'Thing', typeLine: base, baseType: base, rarity, ilvl: 80, frameType: rarity === 'Unique' ? 3 : 2, explicitMods, implicitMods },
})

describe('rolled stats are in the stat own units', () => {
  it('scales a displayed number to the stat range (permyriad), and keeps the sign of a reduced stat', () => {
    expect(matchModLine('8.4% Leeched', 'explicit', rare, tiers)).toEqual({ id: 'Leech1', stats: { leech_permyriad: 840 } })
    expect(matchModLine('15% reduced Slow', 'explicit', rare, tiers)).toEqual({ id: 'Slow1', stats: { 'slow_+%': -15 } })
  })
})

describe('hybrid second lines', () => {
  const gloves = { rarity: 'Rare', baseTags: ['gloves'] }
  it('is not given the plain mod when a hybrid that can spawn here could print the same line', () => {
    expect(matchModLine('+45 to maximum Life', 'explicit', gloves, tiers)).toBeNull()
    expect(matchModLine('+45 to maximum Life', 'explicit', rare, tiers)?.id).toBe('Life1')
  })
  it('is still given the plain mod when the roll lies outside the hybrid line range', () => {
    expect(matchModLine('+55 to maximum Life', 'explicit', gloves, tiers)?.id).toBe('Life2')
  })
  it('the hybrid first line resolves as before', () => {
    expect(matchModLine('15% increased Hybrid', 'explicit', gloves, tiers)?.id).toBe('HybridLife')
  })
})

describe('resolveItemMods', () => {
  const input = [item(1, 'Rare', 'Test Helm', ['+45 to maximum Life', '+29% to Cold Resistance', 'Unmatched line'], ['+15 to Spirit', 'Odd implicit'])]
  const out = resolveItemMods(input, tiers)[0]!.itemData

  it('attaches ids by bucket and lists unresolved explicit-type lines as text-only', () => {
    expect(out.mods?.explicit).toEqual([{ id: 'Life1', stats: { [LIFE]: 45 } }])
    expect(out.mods?.implicit?.map((m) => m.id)).toEqual(['ImpSpirit'])
    expect(out.textOnlyMods).toEqual(['+29% to Cold Resistance', 'Unmatched line'])
  })
  it('does not list an unresolved implicit as text-only (it is already shown as text)', () => {
    expect(out.textOnlyMods).not.toContain('Odd implicit')
  })
  it('does not mutate its input and leaves an item with nothing to resolve as it was', () => {
    expect(input[0]!.itemData.mods).toBeUndefined()
    const plain = [item(2, 'Normal', 'Test Helm', [])]
    const res = resolveItemMods(plain, tiers)[0]!.itemData
    expect(res.mods).toBeUndefined()
    expect(res.textOnlyMods).toBeUndefined()
  })
})

describe('analysis of a code with resolved mods (withResolvedMods)', () => {
  const model = (items: NinjaItem[], jewels: NinjaItem[] = []): CharModel =>
    ({ name: 'T', class: 'Monk', level: 80, league: 'L', account: '', items, jewels, skills: [], stats: {} }) as unknown as CharModel

  it('resolves ids for a code (pob-export) when affix data is passed, items and jewels alike', async () => {
    const a = await analyzeCharacter(model([item(1, 'Rare', 'Test Helm', ['+45 to maximum Life'])]), { source: 'pob-export', tiers })
    const mods = a.items[0]!.mods
    expect(mods.find((m) => m.id === 'Life1')?.tier).not.toBeNull()
  })
  it('does not rewrite a poe.ninja character, and does nothing without affix data', async () => {
    const m = model([item(1, 'Rare', 'Test Helm', ['+45 to maximum Life'])])
    const ninja = await analyzeCharacter(m, { tiers })
    expect(ninja.items[0]!.mods.find((x) => x.id === 'Life1')).toBeUndefined()
    const noTiers = await analyzeCharacter(m, { source: 'pob-export' })
    expect(noTiers.items[0]!.mods.find((x) => x.id === 'Life1')).toBeUndefined()
  })
})

describe('textOnlyMods in the item analysis', () => {
  const [equipped] = normalizeItems({ items: [item(1, 'Rare', 'Test Helm', [], [])].map((i) => ({ ...i, itemData: { ...i.itemData, textOnlyMods: ['[Tag|Odd] line'] } })) })
  const analysis = analyzeItem(equipped!, tiers)
  const line = analysis.mods.find((m) => m.text === 'Odd line')

  it('shows the line with no id or tier and says why', () => {
    expect(line).toMatchObject({ id: null, source: 'explicit', tier: null, tiers: null })
    expect(line!.unresolved).toMatch(/text only/)
  })
})

describe('pobCodeGaps: the gear gap', () => {
  const gap = (gear?: Parameters<typeof pobCodeGaps>[1]) => pobCodeGaps({}, gear).find((g) => g.what === 'Gear findings and trade searches')

  it('says the view does not read items when no gear info is passed', () => {
    expect(gap()?.why).toMatch(/does not read the items/)
  })
  it('says there are no items when the active set is empty', () => {
    expect(gap({ items: 0, unmapped: [], textOnly: 0 })?.why).toMatch(/no items in its active item set/)
  })
  it('names an unmapped slot', () => {
    expect(gap({ items: 5, unmapped: ['Ring 3'], textOnly: 0 })?.why).toBe('Ring 3 has no slot on poe.ninja, so it is not read.')
  })
  it('counts text-only lines with the right number agreement', () => {
    expect(gap({ items: 5, unmapped: [], textOnly: 1 })?.why).toMatch(/^1 mod line could not .* it has no tier\.$/)
    expect(gap({ items: 5, unmapped: [], textOnly: 3 })?.why).toMatch(/^3 mod lines could not .* they have no tier\.$/)
  })
  it('joins both parts, and adds no gap when everything was read', () => {
    expect(gap({ items: 5, unmapped: ['Ring 3'], textOnly: 2 })?.why).toContain('; 2 mod lines')
    expect(gap({ items: 5, unmapped: [], textOnly: 0 })).toBeUndefined()
  })
})
