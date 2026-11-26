/**
 * The character outline: one decoded object behind every tab, sorted into the sections of poe.ninja's old
 * character page (the V1 plan (deleted; `git show 2e9c146:docs/plans/simple-code-analysis.md`), "Section map").
 *
 * Every field is a value with its provenance, or `{ value: null, provenance: 'missing', reason }`. Nothing is
 * undefined, blank or silently zero: a figure the code does not carry says so.
 */

export type OutlineProvenance = 'pob-export' | 'derived' | 'estimate' | 'nominal'

export type OutlineValue<T> =
  | { value: T; provenance: OutlineProvenance }
  | { value: null; provenance: 'missing'; reason: string }

/** A labelled field. `key` is stable (tests and `data-outline-field` use it); `unit` is shown after the value. */
export type OutlineField<T = number | string> = OutlineValue<T> & {
  key: string
  label: string
  unit?: string
  /** The PlayerStat the value was read from, so a reader (and a test) can check it against the code. */
  stat?: string
}

/** Which box the code was pasted into. */
export type OutlineBox = 'ninja' | 'pob'

/** poe.ninja's config baseline, the code's own config, or no config assumed. A poe.ninja code is always `ninja`. */
export type OutlineConfigMode = 'ninja' | 'own' | 'none'

export interface OutlineIdentity {
  name: OutlineField<string>
  className: OutlineField<string>
  ascendancy: OutlineField<string>
  level: OutlineField<number>
  account: OutlineField<string>
  league: OutlineField<string>
  lastFetched: OutlineField<string>
}

export interface OutlineItemLine {
  /** Where the line sits on the item. */
  source: 'implicit' | 'explicit' | 'rune' | 'enchant' | 'crafted' | 'fractured' | 'desecrated'
  text: OutlineField<string>
  /** The `(min-max)` the roll sits in, with where in it (0..1). Missing for a fixed line. */
  range: OutlineField<{ min: number; max: number; roll: number }>
  /** 1 is best. Missing until mod tier data is supplied, or when the line is not in the ladder data. */
  tier: OutlineField<number>
}

export interface OutlineItem {
  slot: string
  /** 1 or 2 for a weapon slot, null for every other slot. */
  weaponSet: 1 | 2 | null
  name: OutlineField<string>
  base: OutlineField<string>
  rarity: OutlineField<string>
  itemLevel: OutlineField<number>
  corrupted: boolean
  lines: OutlineItemLine[]
}

export interface OutlineGem {
  name: string
  level: OutlineField<number>
  quality: OutlineField<number>
  support: boolean
}

export interface OutlineSkillGroup {
  index: number
  label: string
  main: boolean
  gems: OutlineGem[]
  dps: OutlineField<number>
}

export interface OutlineConfig {
  mode: OutlineConfigMode
  /** One sentence for the reader: which config the numbers were calculated with. */
  statement: string
  /** Settings, in plain words, each read from the code or PoB's default. Empty under `none`. */
  settings: OutlineField<string>[]
  questRewards: OutlineField<string>[]
}

export interface CharacterOutline {
  box: OutlineBox
  configMode: OutlineConfigMode
  identity: OutlineIdentity
  /** Stats → Character. */
  character: OutlineField[]
  /** Stats → Defensive. */
  defensive: OutlineField[]
  /** Stats → Recovery. */
  recovery: OutlineField[]
  mainSkill: {
    name: OutlineField<string>
    stats: OutlineField[]
    /** Per damage type share of the average hit: the mini-calc's job (Batch 3). */
    damageMix: OutlineField<string>
  }
  /** Every skill group, with its DPS where PoB computed it. */
  skills: OutlineSkillGroup[]
  equipment: OutlineItem[]
  /** Flasks and charms: listed, not analysed. */
  utility: OutlineItem[]
  tree: {
    points: OutlineField[]
    keystones: OutlineField<string>[]
    ascendancyNodes: OutlineField<string>[]
  }
  config: OutlineConfig
  /** Every field above that is missing, with its reason. */
  missing: { key: string; label: string; reason: string }[]
}
