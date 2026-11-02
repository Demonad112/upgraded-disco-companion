/** Farm Planner types (FP1). Pure data shapes; no React. Every number comes from `data/farm/tablets-0.5.5.json`. */

export type Confidence = 'confirmed' | 'single' | 'unverified'
export type Side = 'prefix' | 'suffix'
export type Combine = 'add' | 'multiply' | 'flag'
export type MapContext = 'standard' | 'overlap' | 'city'
export type Layer = 'es' | 'armour' | 'evasion' | 'mana' | 'recovery'
export type RiskKey = 'safe' | 'balanced' | 'greedy'

export interface FarmSource { id: string; title: string; url: string; date: string }
export interface Tier { tier: number; min: number; max: number; ilvl: number }

export interface FarmStat {
  id: string
  name: string
  unit: string
  combine: Combine
  reward: boolean
  danger: boolean
  /** Tablet-effect scalars apply to this stat's tablet values. */
  scalesWithEffect: boolean
  note?: string
}

export interface DangerRating { generic: number; es: number; armour: number; evasion: number; mana: number; recovery: number }

interface ModBase {
  id: string
  text: string
  affix: Side
  tabletTypes: string[]
  stat: string
  modGroup: string
  tiers: Tier[]
  spawnWeight: number | null
  sources: string[]
  confidence: Confidence
}
export type TabletMod = ModBase
export interface WaystoneMod extends ModBase { danger: DangerRating }

export interface TabletType { id: string; name: string; mechanic: string | null; sources: string[] }

export interface EffectModifier {
  id: string
  text: string
  /** tablet_mods, tablet_mods_per_tablet or waystone_mods_per_tablet. */
  applies: 'tablet_mods' | 'tablet_mods_per_tablet' | 'waystone_mods_per_tablet'
  value: number
  source: string
  requires: 'city' | null
  sources: string[]
}

export interface FarmRules {
  maxTabletsPerMap: number
  maxTabletsPerCityMap: number
  maxTabletsPerTower: number
  defaultTabletUses: number
  rarity: {
    magic: { prefix: number; suffix: number }
    rare: { prefix: number; suffix: number; totalBase: number; totalWithKeystones: number }
  }
  waystoneMaxMods: number
  waystoneMaxModsCorrupted: number
  waystoneMagicMaxMods: number
  waystoneSides: { normal: { prefix: number; suffix: number }; corrupted: { prefix: number; suffix: number } }
  waystoneAreaLevelOffset: number
  waystoneMaxNaturalTier: number
  waystoneMaxTier: number
  mechanicStacking: { type: string; count: number; effect: string; sources: string[] }[]
  notes: { text: string; sources: string[]; confidence: Confidence }[]
}

export interface WeightEntry { value: number; why: string; sources: string[]; confidence: Confidence }
export interface Preset { name: string; weights: Record<string, WeightEntry> }
export interface FarmFixture {
  /** Preset the fact-check scored the fixture under. */
  preset: string
  name: string
  loadout: Loadout
  expectedTotals: Record<string, number>
  expectedErrors: number
  why: string
}

export interface FarmData {
  patch: string
  generatedAt: string
  league: string
  sources: FarmSource[]
  rules: FarmRules
  stats: FarmStat[]
  tabletTypes: TabletType[]
  tabletMods: TabletMod[]
  waystoneMods: WaystoneMod[]
  effectModifiers: EffectModifier[]
  weights: {
    presets: Record<string, Preset>
    strategyPreset: Record<string, string>
    danger: {
      per_stat: Record<string, DangerRating & { sources: string[]; confidence: Confidence; why: string }>
      build_multipliers: Record<Layer, number>
      layerDetect: { relativeToLargest: number; why: string; sources: string[]; confidence: Confidence }
    }
    risk: Record<RiskKey, number>
  }
  fixtures: FarmFixture[]
  quickPicks: QuickPicksData
}

/** Quick picks (QP1): five curated farms with a ready loadout. Curated, not ranked by Net; `basis` says so. */
export interface QuickPick {
  id: string
  name: string
  /** One plain-language line for the tile. */
  line: string
  /** The farming strategy it belongs to (investment and danger level come from there). */
  strategyId: string
  preset: string
  basis: 'estimate'
  why: string
  recommended: Loadout
}
export interface QuickPicksData {
  patchNote: string
  excluded: { farm: string; why: string }[]
  /** `appliesTo`: "waystone" or a tablet type id. */
  disagreements: { id: string; appliesTo: string; text: string }[]
  /** Short chip text per mod id; `{v}` is the roll or the range. */
  labels: Record<string, string>
  picks: QuickPick[]
}

export interface ModPick { modId: string; tier: number; value: number }
export interface Tablet { type: string; rarity: 'magic' | 'rare'; prefixes: ModPick[]; suffixes: ModPick[] }
export interface WaystoneBuild { tier: number; rarity: 'magic' | 'rare'; corrupted: boolean; prefixes: ModPick[]; suffixes: ModPick[] }
export interface LoadoutOptions { mapContext: MapContext; keystones: boolean; effects: string[] }
export interface Loadout { strategyId: string; tablets: Tablet[]; waystone: WaystoneBuild; options: LoadoutOptions }

export interface StatTotal { total: number; sources: { from: string; value: number }[] }
export type Totals = Record<string, StatTotal>
export interface Score { reward: number; danger: number; net: number }
