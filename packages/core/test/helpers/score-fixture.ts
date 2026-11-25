/**
 * A small, hand-written affix table and item builder for the gear score, stat swap and charm tests
 * (Batch 2). Every mod and range here is stated in the test, not read from the game data, so a test
 * reads as its own scenario.
 */

import { analyzeItem, type ItemAnalysis } from '../../src/gear/analyze.js'
import { ModTiers, type ModTierData, type ModTierRaw } from '../../src/gear/tiers.js'
import type { EquippedItem } from '../../src/model/slots.js'
import type { ResistanceState } from '../../src/defense/index.js'

const ring = (g: string, t: 'p' | 's', lvl: number, name: string, stats: [string, number, number][], text: string): ModTierRaw => ({
  g, t, lvl, name, stats, text, spawn: [['ring', 1], ['default', 0]],
})

export const fixtureTiers = new ModTiers({
  version: 1,
  generatedFrom: ['test'],
  note: 'test',
  baseTags: { 'Test Ring': ['ring', 'default'] },
  baseClass: { 'Test Ring': 'Ring' },
  mods: {
    Life1: ring('IncreasedLife', 'p', 80, 'Vigorous', [['base_maximum_life', 90, 100]], '+(90-100) to maximum Life'),
    Life2: ring('IncreasedLife', 'p', 40, 'Healthy', [['base_maximum_life', 40, 50]], '+(40-50) to maximum Life'),
    Es1: ring('EnergyShield', 'p', 75, 'Shimmering', [['base_maximum_energy_shield', 40, 50]], '+(40-50) to maximum Energy Shield'),
    Armour1: ring('Armour', 'p', 70, 'Plated', [['base_physical_damage_reduction_rating', 100, 120]], '+(100-120) to Armour'),
    Phys1: ring('PhysicalDamage', 'p', 75, 'Gleaming', [
      ['attack_minimum_added_physical_damage', 8, 10],
      ['attack_maximum_added_physical_damage', 14, 16],
    ], 'Adds (8-10) to (14-16) Physical Damage to Attacks'),
    Cold1: ring('ColdResistance', 's', 80, 'of the Tundra', [['base_cold_damage_resistance_%', 41, 45]], '+(41-45)% to Cold Resistance'),
    Fire1: ring('FireResistance', 's', 80, 'of the Furnace', [['base_fire_damage_resistance_%', 41, 45]], '+(41-45)% to Fire Resistance'),
    Chaos1: ring('ChaosResistance', 's', 80, 'of Order', [['base_chaos_damage_resistance_%', 23, 27]], '+(23-27)% to Chaos Resistance'),
    Chaos2: ring('ChaosResistance', 's', 30, 'of Ingestion', [['base_chaos_damage_resistance_%', 10, 13]], '+(10-13)% to Chaos Resistance'),
    Cast1: ring('CastSpeed', 's', 70, 'of Talent', [['base_cast_speed_+%', 13, 16]], '(13-16)% increased Cast Speed'),
    Atk1: ring('AttackSpeed', 's', 70, 'of Skill', [['attack_speed_+%', 7, 8]], '(7-8)% increased Attack Speed'),
    Dex1: ring('Dexterity', 's', 80, 'of the Lynx', [['additional_dexterity', 28, 33]], '+(28-33) to Dexterity'),
    EvaMove1: ring('EvasionWhileMoving', 's', 60, 'of the Wind', [['evasion_rating_+%_while_moving', 20, 25]], '(20-25)% increased Evasion Rating while moving'),
    Stun1: ring('StunThreshold', 's', 60, 'of Steadiness', [['stun_threshold_+', 100, 120]], '+(100-120) to Stun Threshold'),
  },
} satisfies ModTierData)

export interface FixtureLine {
  id: string
  stats: Record<string, number>
  source?: 'explicit' | 'crafted' | 'desecrated'
}

/** One analysed ring. `rarity` decides the affix budget (Rare 3/3, Magic 1/1, Unique none). */
export function ringItem(slotId: number, label: string, lines: FixtureLine[], opts: { rarity?: string; itemLevel?: number; corrupted?: boolean; name?: string } = {}): ItemAnalysis {
  const mods: Record<string, { id: string; stats: Record<string, number> }[]> = {}
  for (const l of lines) (mods[l.source ?? 'explicit'] ??= []).push({ id: l.id, stats: l.stats })
  const item: EquippedItem = {
    slotId,
    slotLabel: label,
    active: true,
    name: opts.name ?? `${label} ring`,
    baseType: 'Test Ring',
    itemLevel: opts.itemLevel ?? 82,
    rarity: opts.rarity ?? 'Rare',
    corrupted: opts.corrupted ?? false,
    mods: [],
    raw: { itemData: { mods } } as unknown as EquippedItem['raw'],
  }
  return analyzeItem(item, fixtureTiers)
}

/**
 * A resistance block. `value` is the capped figure the sheet shows (default: the cap) and `over` the points
 * above the cap, as PoB reports `<Type>ResistOverCap`. Under cap follows from value and max.
 */
export function resistances(r: Partial<Record<ResistanceState['type'], { value?: number; max?: number; over?: number }>>): ResistanceState[] {
  return (['fire', 'cold', 'lightning', 'chaos'] as const).map((type) => {
    const max = r[type]?.max ?? 75
    const value = r[type]?.value ?? max
    return { type, value, max, overCap: r[type]?.over ?? 0, underCap: Math.max(0, max - value), capped: value >= max }
  })
}
