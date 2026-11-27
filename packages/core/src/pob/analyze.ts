/**
 * What a Path of Building code cannot answer, and whether pasted text is a code at all.
 *
 * A code carries Path of Building's own computed `<PlayerStat>` values (read as `pob-export` by `to-model.ts` and
 * `analyze.ts`). `pobCodeGaps` names what it does not carry, rather than substituting a guess, so the analysis of a
 * converted code (`Analysis.sourceGaps`) can say so.
 */

import { pobSiteLink } from './export.js'
import { RES_CAP_DEFAULT } from '../defense/constants.js'

/** What a Path of Building code cannot tell you, stated rather than filled in. */
export interface PobGap {
  what: string
  why: string
}

const RESIST_STATS = {
  fire: 'FireResist',
  cold: 'ColdResist',
  lightning: 'LightningResist',
  chaos: 'ChaosResist',
} as const

/**
 * Resistance cap.
 *
 * PoB reports the resistance value but not the cap alongside it, and the
 * over-cap stats it does emit (`FireResistOverCap`) are relative to the same 75.
 * 75 is the game default; a build that has raised its maximum resistances will
 * be understated here, which is why `gaps` says so.
 */
const DEFAULT_RESIST_CAP = RES_CAP_DEFAULT

function num(stats: Record<string, number>, key: string): number | null {
  const value = stats[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/**
 * What a Path of Building code cannot answer, stated rather than filled in. Shared by the reduced
 * PoB view and by the full analysis of a converted code (`Analysis.sourceGaps`), so both say the same.
 */
export interface GearReadState {
  /** Equipment items read from the code. */
  items: number
  /** PoB slots with an item but no poe.ninja slot id. */
  unmapped: readonly string[]
  /** Explicit-type lines no mod id could be proven for. */
  textOnly: number
}

/** The gear gap for what was read: null when everything was, else what is left out and why. */
function gearGap(gear: GearReadState | undefined): PobGap | null {
  const what = 'Gear findings and trade searches'
  if (!gear) return { what, why: 'This view does not read the items in a code.' }
  if (gear.items === 0) return { what, why: 'The code has no items in its active item set, so no gear finding or trade search is built.' }
  const parts: string[] = []
  if (gear.unmapped.length) parts.push(`${gear.unmapped.join(', ')} has no slot on poe.ninja, so it is not read`)
  if (gear.textOnly) {
    parts.push(
      `${gear.textOnly} mod line${gear.textOnly === 1 ? '' : 's'} could not be matched to exactly one mod, so ${gear.textOnly === 1 ? 'it has' : 'they have'} no tier`,
    )
  }
  return parts.length ? { what, why: `${parts.join('; ')}.` } : null
}

/**
 * The stat-attribution gap. Without breakdowns read from the code (no tree data): the whole gap. With them
 * (`pob/code-breakdowns.ts`): only the stats whose lines do not reproduce PoB's total, or nothing when all do.
 */
function attributionGap(unreproduced: readonly string[] | undefined): PobGap | null {
  if (!unreproduced) {
    return {
      what: 'Stat attribution — which item or passive grants each point',
      why:
        'That needs poe.ninja’s per-stat breakdowns, which a code does not carry. ' +
        'Gear tiers and resistance rebalancing depend on it.',
    }
  }
  if (!unreproduced.length) return null
  const names =
    unreproduced.length === 1 ? unreproduced[0]! : `${unreproduced.slice(0, -1).join(', ')} and ${unreproduced[unreproduced.length - 1]!}`
  return {
    what: `Stat attribution for ${names}`,
    why: `The code’s item, passive, quest and base lines don’t add up to Path of Building’s total for ${unreproduced.length === 1 ? 'it' : 'these'}, so no item is credited with a share. The other stats are attributed.`,
  }
}

/**
 * `unreproduced`: the labels of the stats a code's breakdown does not reproduce, when the breakdown was read
 * (`pob/code-breakdowns.ts`); omitted when it was not.
 */
/** Where the damage of skills other than the main one came from, for the per-skill damage gap. */
export interface SkillDamageState {
  /** PoB's engine loaded the build and calculated every skill group (`pob/engine.ts`). */
  engine?: boolean
  /** `<FullDPSSkill>` rows the code carries. */
  fullDpsRows?: number
}

/** Null when PoB's engine calculated every group; else what the code alone carries. */
function skillDamageGap(damage: SkillDamageState | undefined): PobGap | null {
  if (damage?.engine) return null
  const rows = damage?.fullDpsRows ?? 0
  return {
    what: 'Per-skill damage',
    why: rows
      ? `A code carries the damage of the skill it had selected and of the ${rows} skill${rows === 1 ? '' : 's'} ticked for Full DPS, not of every skill.`
      : 'A code carries the damage of the skill it had selected, not of every skill.',
  }
}

export function pobCodeGaps(stats: Record<string, number>, gear?: GearReadState, unreproduced?: readonly string[], damage?: SkillDamageState): PobGap[] {
  const gaps: PobGap[] = []
  const skillGap = skillDamageGap(damage)
  if (skillGap) gaps.push(skillGap)
  const attribution = attributionGap(unreproduced)
  if (attribution) gaps.push(attribution)
  const gearGapRow = gearGap(gear)
  if (gearGapRow) gaps.splice(skillGap ? 1 : 0, 0, gearGapRow)
  if (num(stats, 'Ward') === null) {
    gaps.push({
      what: 'Ward',
      why: 'Not among the exported PlayerStat values, so it is reported as absent rather than as zero.',
    })
  }
  if (num(stats, 'BlockChance') === null && num(stats, 'EffectiveBlockChance') === null) {
    gaps.push({ what: 'Block chance', why: 'Not among the exported PlayerStat values.' })
  }
  const resists = Object.values(RESIST_STATS).filter((key) => num(stats, key) !== null)
  if (resists.length && resists.every((key) => num(stats, `${key}OverCap`) === null)) {
    gaps.push({
      what: 'Raised maximum resistances',
      why: `No over-cap stats were exported, so caps are assumed to be the game default of ${DEFAULT_RESIST_CAP}%. A build that raises its maximums will look closer to its cap than it is.`,
    })
  }
  return gaps
}

/** True when a pasted string looks like a Path of Building code rather than JSON. */
export function looksLikePobCode(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed || trimmed.startsWith('{') || trimmed.startsWith('[') || pobSiteLink(trimmed)) return false
  // base64url and long enough to be a real build. Line breaks inside and `?` at the ends are allowed: PoB2's
  // import trims and drops them, and a code copied out of a chat or forum post often carries them. Spaces are
  // not: text with spaces is prose, not a wrapped code.
  const compact = trimmed.replace(/^\?+|\?+$/g, '').replace(/[\r\n\t]+/g, '')
  return compact.length > 100 && /^[A-Za-z0-9_-]+={0,2}$/.test(compact)
}
