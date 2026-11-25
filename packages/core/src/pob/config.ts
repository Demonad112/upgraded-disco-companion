/**
 * The configuration a Path of Building export was saved with.
 *
 * PoB stores its Configuration tab as `<Input>` elements under `<Calcs>`. Those
 * inputs are part of what produced the `<PlayerStat>` values everything else
 * reads, so they are the difference between "this build does 110k DPS" and
 * "this build does 110k DPS against a non-boss enemy that is chilled, ignited
 * and bleeding, while you are moving, have crit recently and have been hit
 * recently, with every buff and charge assumed active".
 *
 * The predecessor asserted these figures came from "PoB's default config (no
 * custom boss/buff settings applied)". On the reference character that was
 * wrong twice over: 20 inputs were set, six of them damage-relevant
 * conditionals, buff mode was EFFECTIVE, and no boss setting existed at all —
 * so the number was both inflated by conditionals and not a boss number, while
 * the assessment used it to judge pinnacle-boss viability.
 *
 * Read through `PobSnapshot` (`snapshot.ts`), which runs identically in Node and the browser.
 */

import { snapshotOf, type PobSource } from './export.js'
import { activeConfigSet } from './snapshot.js'

/**
 * Inputs that raise damage by assuming something is true about the enemy or the
 * player at the moment of the hit. Label is how PoB presents it.
 */
const CONDITIONAL_LABELS: Readonly<Record<string, string>> = Object.freeze({
  conditionEnemyChilled: 'enemy is chilled',
  conditionEnemyFrozen: 'enemy is frozen',
  conditionEnemyShocked: 'enemy is shocked',
  conditionEnemyIgnited: 'enemy is ignited',
  conditionEnemyBleeding: 'enemy is bleeding',
  conditionEnemyPoisoned: 'enemy is poisoned',
  conditionEnemyMaimed: 'enemy is maimed',
  conditionEnemyBlinded: 'enemy is blinded',
  conditionEnemyCursed: 'enemy is cursed',
  conditionEnemyIntimidated: 'enemy is intimidated',
  conditionEnemyCoveredInAsh: 'enemy is covered in ash',
  conditionEnemyRareOrUnique: 'enemy is rare or unique',
  conditionEnemyDazed: 'enemy is dazed',
  conditionEnemyElectrocuted: 'enemy is electrocuted',
  conditionEnemyPinned: 'enemy is pinned',
  conditionEnemyImmobilised: 'enemy is immobilised',
  conditionEnemyColdExposure: 'enemy has cold exposure',
  conditionEnemyFireExposure: 'enemy has fire exposure',
  conditionEnemyLightningExposure: 'enemy has lightning exposure',
  conditionCritRecently: 'you have crit recently',
  conditionKilledRecently: 'you have killed recently',
  conditionMoving: 'you are moving',
  conditionStationary: 'you are stationary',
  conditionBeenHitRecently: 'you have been hit recently',
  conditionLeeching: 'you are leeching',
  conditionOnConsecratedGround: 'you are on consecrated ground',
  conditionFullLife: 'you are on full life',
  conditionLowLife: 'you are on low life',
  conditionUsingFlask: 'a flask is active',
  conditionCritInPast8Sec: 'you have crit in the past 8 seconds',
  conditionNonCritRecently: 'you have dealt a non-crit recently',
  conditionKilledShockedLast3Seconds: 'you killed a shocked enemy in the last 3 seconds',
  conditionChilledEnemyRecently: 'you have chilled an enemy recently',
  conditionShockedEnemyRecently: 'you have shocked an enemy recently',
  conditionFrozenEnemyRecently: 'you have frozen an enemy recently',
  conditionHaveEnergyShield: 'you always have energy shield',
})

/** Multiplier inputs as PoB's Configuration tab names them; others fall back to `humaniseCondition`. */
const MULTIPLIER_LABELS: Readonly<Record<string, string>> = Object.freeze({
  multiplierRage: 'Rage',
  multiplierCombo: 'Combo',
  multiplierNearbyEnemies: 'Nearby enemies',
  multiplierNearbyRareOrUniqueEnemies: 'Nearby rare or unique enemies',
})
export const multiplierLabel = (id: string): string => MULTIPLIER_LABELS[id] ?? humaniseCondition(id)

/** Inputs that mean "this is being calculated against a boss". */
const BOSS_KEYS = ['enemyIsBoss', 'conditionEnemyBoss', 'enemyIsBossType', 'bossSkillEffect'] as const

/**
 * PoB2's "Is the enemy a Boss?" (`enemyIsBoss`, ConfigOptions.lua `defaultIndex = 3`): a code that saves no value
 * was calculated against a Guardian/Pinnacle boss. PoB writes only inputs that differ from their default, so the
 * absence of the input is itself the boss setting (the owner's PoB2 0.23.1 screenshot of the ninja-default code).
 */
export const POB_DEFAULT_BOSS: PobBoss = 'Pinnacle'
export type PobBoss = 'None' | 'Boss' | 'Pinnacle' | 'Uber'
const BOSS_LABELS: Readonly<Record<PobBoss, string>> = Object.freeze({
  None: 'not a boss',
  Boss: 'standard boss',
  Pinnacle: 'Guardian/Pinnacle boss',
  Uber: 'Uber Pinnacle boss',
})
export const bossLabel = (b: PobBoss): string => BOSS_LABELS[b]

/** Values PoB writes for "this setting is off". */
const OFF_VALUES = new Set(['false', 'NONE', 'None', ''])

export type BuffMode = 'unbuffed' | 'combat' | 'effective'

export interface PobMultiplier {
  name: string
  value: number
}

export interface PobConfig {
  /** How many `<Input>` elements the export carried. 0 means none were saved. */
  inputCount: number
  /** True when any boss setting is on, PoB's own default included. */
  versusBoss: boolean
  /** Which input said so, so the claim is traceable (`enemyIsBoss` also when it is PoB's default). Null when none did. */
  bossSetting: string | null
  /** PoB's `enemyIsBoss` value: the saved one, or PoB's default (`Pinnacle`) when the code saved none. */
  boss: PobBoss
  /** False when `boss` is PoB's default rather than a saved input. */
  bossSaved: boolean
  /**
   * PoB's buff mode. EFFECTIVE assumes every buff and charge is up, which is
   * the most optimistic of the three. Null when the export did not say.
   */
  buffMode: BuffMode | null
  /** Damage-relevant conditionals that are switched on, in prose. */
  conditionals: string[]
  /**
   * Conditionals that are on but whose meaning this codebase does not carry a
   * label for. Named rather than dropped — an unrecognised conditional still
   * inflates the number, and hiding it would understate the caveat.
   */
  unlabelledConditionals: string[]
  /** Enemy-count and similar multipliers with a non-zero value. */
  multipliers: PobMultiplier[]
}

const NO_STRINGS = Object.freeze([] as string[]) as string[]
const NO_MULTIPLIERS = Object.freeze([] as PobMultiplier[]) as PobMultiplier[]

/** The empty result, for an export with no `<Calcs>` section at all. */
export const NO_POB_CONFIG: Readonly<PobConfig> = Object.freeze({
  inputCount: 0,
  versusBoss: true,
  bossSetting: 'enemyIsBoss',
  boss: POB_DEFAULT_BOSS,
  bossSaved: false,
  buffMode: null,
  conditionals: NO_STRINGS,
  unlabelledConditionals: NO_STRINGS,
  multipliers: NO_MULTIPLIERS,
})

/**
 * The inputs PoB calculated with, as a name -> value map: the Calcs tab's own inputs (`misc_buffMode`)
 * and the active config set's. Values are PoB's, as text (`"true"`, `"4"`, `"EFFECTIVE"`).
 *
 * Read through `PobSnapshot`, so attribute values may hold newlines and angle brackets (PoB writes stat
 * text into `string=` values). Only the active config set counts: an inactive set did not produce the
 * exported stats.
 */
export function readPobInputs(source: PobSource): Map<string, string> {
  const snap = snapshotOf(source)
  const out = new Map<string, string>()
  for (const [name, value] of Object.entries(snap.calcs.inputs)) out.set(name, String(value))
  for (const [name, value] of Object.entries(activeConfigSet(snap)?.inputs ?? {})) out.set(name, String(value))
  return out
}

/**
 * Read the config an export was saved with.
 *
 * Best-effort: an export with no `<Input>` elements yields a config reporting
 * zero inputs, which reads as "no configuration was saved" rather than as
 * "default" — the two are not the same claim.
 */
export function readPobConfig(source: PobSource): PobConfig {
  const inputs = readPobInputs(source)

  const conditionals: string[] = []
  const unlabelled: string[] = []
  const multipliers: PobMultiplier[] = []

  for (const [name, value] of inputs) {
    if (name.startsWith('condition') && value === 'true') {
      const label = CONDITIONAL_LABELS[name]
      if (label) conditionals.push(label)
      else unlabelled.push(name)
      continue
    }
    if (name.startsWith('multiplier')) {
      const n = Number(value)
      if (Number.isFinite(n) && n !== 0) multipliers.push({ name, value: n })
    }
  }

  const savedBoss = inputs.get('enemyIsBoss')
  const boss: PobBoss =
    savedBoss === 'None' || savedBoss === 'Boss' || savedBoss === 'Pinnacle' || savedBoss === 'Uber' ? savedBoss : POB_DEFAULT_BOSS
  const bossSetting =
    boss !== 'None'
      ? 'enemyIsBoss'
      : (BOSS_KEYS.find((k) => {
          const v = inputs.get(k)
          return k !== 'enemyIsBoss' && v !== undefined && !OFF_VALUES.has(v)
        }) ?? null)

  const raw = inputs.get('misc_buffMode')
  const buffMode: BuffMode | null =
    raw === 'EFFECTIVE' ? 'effective' : raw === 'COMBAT' ? 'combat' : raw === 'UNBUFFED' ? 'unbuffed' : null

  return {
    inputCount: inputs.size,
    versusBoss: bossSetting !== null,
    bossSetting,
    boss,
    bossSaved: savedBoss !== undefined,
    buffMode,
    conditionals: conditionals.sort(),
    unlabelledConditionals: unlabelled.sort(),
    multipliers: multipliers.sort((a, b) => a.name.localeCompare(b.name)),
  }
}

/**
 * A readable name for a conditional with no label (B1-7): `conditionEnemyFooBar` -> "enemy: foo bar",
 * `conditionFooBar` -> "foo bar". Still named, never dropped; the raw id stays in `unlabelledConditionals`.
 */
export function humaniseCondition(id: string): string {
  const words = id
    .replace(/^condition/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .trim()
  if (!words) return id
  return words.startsWith('enemy ') ? `enemy: ${words.slice(6)}` : words
}

/**
 * One sentence describing what a DPS figure from this export actually
 * represents, for use anywhere such a number is shown or judged.
 */
export function describePobConfig(config: PobConfig | null | undefined): string {
  if (!config || config.inputCount === 0) {
    return 'This export saved no Path of Building configuration, so the damage figures use PoB’s defaults.'
  }

  const parts: string[] = [
    config.versusBoss
      ? `calculated against a boss (${bossLabel(config.boss === 'None' ? POB_DEFAULT_BOSS : config.boss)})`
      : 'calculated against a normal enemy, not a boss',
  ]

  if (config.buffMode === 'effective') parts.push('with all buffs and charges assumed active')
  else if (config.buffMode === 'unbuffed') parts.push('with buffs excluded')

  const conditionCount = config.conditionals.length + config.unlabelledConditionals.length
  if (conditionCount > 0) {
    const named = [...config.conditionals, ...config.unlabelledConditionals.map(humaniseCondition)].join(', ')
    const plural = conditionCount === 1 ? 'condition holds' : 'conditions hold'
    parts.push(`assuming ${conditionCount} ${plural} (${named})`)
  }

  return `These figures were ${parts.join(', ')}.`
}

/**
 * Whether a DPS figure from this export can honestly be read as a boss number.
 *
 * Separated from the prose because it drives a decision, not a display: the
 * build assessment must not grade single-target damage as pinnacle-ready off a
 * number PoB computed against a white mob.
 */
export function isBossDps(config: PobConfig | null | undefined): boolean {
  return config?.versusBoss === true
}
