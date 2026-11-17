/**
 * A two-item character (helmet and ring) on inline affix data, for
 * replacement-plan tests that need exact, small numbers.
 */

import { analyzeDefense } from '../../src/defense/index.js'
import { analyzeItem } from '../../src/gear/analyze.js'
import { planReplacement, type ReplacementPlan } from '../../src/gear/replace.js'
import { ModTiers, type ModTierData } from '../../src/gear/tiers.js'
import type { AttributionReport } from '../../src/model/attribution.js'
import { normalizeItems } from '../../src/model/slots.js'
import type { CharModel } from '../../src/model/types.js'

export const FIRE = 'base_fire_damage_resistance_%'
export const COLD = 'base_cold_damage_resistance_%'
export const CHAOS = 'base_chaos_damage_resistance_%'
export const ALL = 'base_resist_all_elements_%'
export const DEX = 'additional_dexterity'
export const STR = 'additional_strength'

const gear: [string, number][] = [
  ['helmet', 1],
  ['ring', 1],
]
const suffix = (g: string, lvl: number, name: string, stat: string, min: number, max: number) => ({
  g,
  t: 's' as const,
  lvl,
  name,
  stats: [[stat, min, max]] as [string, number, number][],
  text: `${name} (${min}-${max})`,
  spawn: gear,
})

const tiers = new ModTiers({
  version: 1,
  generatedFrom: ['inline test data'],
  note: '',
  baseTags: { 'Test Helm': ['helmet'], 'Test Ring': ['ring'] },
  baseClass: { 'Test Helm': 'Helmets', 'Test Ring': 'Ring' },
  mods: {
    FireRes1: suffix('FireResistance', 1, 'of Fire', FIRE, 26, 30),
    ColdRes1: suffix('ColdResistance', 1, 'of Cold', COLD, 26, 30),
    ChaosRes1: suffix('ChaosResistance', 1, 'of Chaos', CHAOS, 25, 30),
    AllRes1: suffix('AllResistances', 50, 'of the Span', ALL, 10, 12),
    AllRes2: suffix('AllResistances', 1, 'of the Arc', ALL, 5, 7),
    Dex1: suffix('Dexterity', 1, 'of Dexterity', DEX, 5, 10),
    Str1: suffix('Strength', 1, 'of Strength', STR, 5, 10),
  },
} satisfies ModTierData)

const item = (itemSlot: number, name: string, base: string, explicit: { id: string; stats: Record<string, number> }[]) => ({
  itemSlot,
  itemData: { name, typeLine: base, baseType: base, ilvl: 80, frameType: 2, mods: { explicit } },
})

const capped = (type: string) => ({ [`${type}Resistance`]: 75, [`${type}ResistanceMax`]: 75, [`${type}ResistanceOverCap`]: 0 })
const defensiveStats = { ...capped('fire'), ...capped('cold'), ...capped('lightning'), ...capped('chaos') }

/** The helmet holds 30 points of each named resistance: without it the total is 45. */
const attributionFor = (held: string[]): AttributionReport =>
  ({
    stats: ['fire', 'cold', 'lightning', 'chaos'].map((t) => ({ stat: `${t}Resistance`, trustworthy: true })),
    items: [
      {
        slotId: 1,
        slotLabel: 'Helmet',
        itemName: 'Helm',
        baseType: 'Test Helm',
        active: true,
        contributions: held.map((t) => ({ stat: `${t}Resistance`, withoutUncapped: 45 })),
      },
    ],
    excluded: [],
    unmatchedSources: [],
  }) as unknown as AttributionReport

/**
 * Plan a replacement for the helmet. `held` names the resistances it holds up
 * (30 points each); they are left off the replacement so follow-ups must cover them.
 */
export function plan(helmetMods: { id: string; stats: Record<string, number> }[], ringMods: { id: string; stats: Record<string, number> }[], held: string[]): ReplacementPlan {
  const model = {
    defensiveStats,
    items: [item(1, 'Helm', 'Test Helm', helmetMods), item(8, 'Band', 'Test Ring', ringMods)],
  } as unknown as CharModel
  const rawItems = normalizeItems(model)
  const defense = analyzeDefense(model)
  const items = rawItems.map((i) => analyzeItem(i, tiers, defense))
  return planReplacement({
    target: items.find((i) => i.slotId === 1)!,
    items,
    rawItems,
    defense,
    attribution: attributionFor(held),
    tiers,
    omitResistances: held,
  })
}
