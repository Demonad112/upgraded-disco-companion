/**
 * A Path of Building code as a character model, so it runs through `analyzeCharacter` (NP1-6).
 *
 * Since 2026-11-18 poe.ninja's character model sits behind a Cloudflare challenge (NP1-1), so a pasted
 * code is the main way in. Rather than a second analyser for codes, this fills the parts of a
 * `CharModel` a code genuinely carries and leaves everything else absent. Every `CharModel` field is
 * optional and the analysis already reports an absent input as missing, so one analysis serves both
 * sources and they can only disagree where their inputs do.
 *
 * Filled, all read from the code and never derived:
 *   - `level`, `class` (the ascendancy, as poe.ninja names it; the base class when there is none);
 *   - `defensiveStats` from PoB's `<PlayerStat>` table;
 *   - one skill: the main skill PoB had selected, with the damage PoB computed for it;
 *   - `passiveSelection` from the tree spec, so the tree check and keystones run;
 *   - `pathOfBuildingExport`: the code itself, so its saved config and skill groups are read. The
 *     caller passes `source: 'pob-export'` so the analysis does not reconcile a code against itself.
 *
 * Left absent: name, account and league (a code has none), `items` (not read from a code yet, NP1-6b)
 * and `breakdowns` (poe.ninja's per-stat attribution, which a code does not carry).
 */

import { RES_CAP_DEFAULT } from '../defense/constants.js'
import type { CharModel, DamageType, NinjaDefensiveStats, NinjaSkill } from '../model/types.js'
import { importPobExport } from './export.js'
import { readPobMainSkill } from './main-skill.js'

function num(stats: Record<string, number>, key: string): number | undefined {
  const value = stats[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/** PoB PlayerStat → poe.ninja `defensiveStats` field, for stats that mean the same thing in both. */
const DIRECT: ReadonlyArray<readonly [keyof NinjaDefensiveStats, string]> = [
  ['life', 'Life'],
  ['energyShield', 'EnergyShield'],
  ['ward', 'Ward'],
  ['mana', 'Mana'],
  ['spirit', 'Spirit'],
  ['armour', 'Armour'],
  ['evasionRating', 'Evasion'],
  ['evadeChance', 'EvadeChance'],
  ['blockChance', 'BlockChance'],
  ['effectiveHealthPool', 'TotalEHP'],
]

const MAX_HITS: ReadonlyArray<readonly [DamageType, string]> = [
  ['physical', 'PhysicalMaximumHitTaken'],
  ['fire', 'FireMaximumHitTaken'],
  ['cold', 'ColdMaximumHitTaken'],
  ['lightning', 'LightningMaximumHitTaken'],
  ['chaos', 'ChaosMaximumHitTaken'],
]

const RESISTS = [
  ['fire', 'FireResist'],
  ['cold', 'ColdResist'],
  ['lightning', 'LightningResist'],
  ['chaos', 'ChaosResist'],
] as const

/**
 * The resistance cap, only where the code pins it.
 *
 * PoB reports the applied (capped) value and, separately, how far the total runs over the cap.
 *   - A `…Max` stat, when a code carries one, is the cap.
 *   - Any over-cap amount means the value IS the cap, exactly.
 *   - Otherwise a value at or under the game default is read against that default, which the
 *     source gaps name ("Raised maximum resistances"); this is the same assumption PoB's own
 *     over-cap figure is relative to.
 *   - A value above the default with nothing to pin the cap leaves it missing, not guessed.
 */
function resistanceMax(stats: Record<string, number>, key: string, value: number): number | undefined {
  const stated = num(stats, `${key}Max`)
  if (stated !== undefined) return stated
  const over = num(stats, `${key}OverCap`)
  if (over !== undefined && over > 0) return value
  return value <= RES_CAP_DEFAULT ? RES_CAP_DEFAULT : undefined
}

export function defensiveStatsFromPob(stats: Record<string, number>): NinjaDefensiveStats {
  const out: Record<string, number> = {}
  for (const [field, key] of DIRECT) {
    const value = num(stats, key)
    if (value !== undefined) out[field] = value
  }
  for (const [type, key] of MAX_HITS) {
    const value = num(stats, key)
    if (value !== undefined) out[`${type}MaximumHitTaken`] = value
  }
  for (const [type, key] of RESISTS) {
    const value = num(stats, key)
    if (value === undefined) continue
    out[`${type}Resistance`] = value
    const max = resistanceMax(stats, key, value)
    if (max !== undefined) out[`${type}ResistanceMax`] = max
    const over = num(stats, `${key}OverCap`)
    if (over !== undefined) out[`${type}ResistanceOverCap`] = Math.max(0, over)
  }
  return out as NinjaDefensiveStats
}

/** The main skill with the damage PoB computed for it; none when the code names no skill or no figure. */
function mainSkillFromPob(xml: string, stats: Record<string, number>): NinjaSkill[] {
  const main = readPobMainSkill(xml)
  const hit = num(stats, 'TotalDPS')
  const dot = num(stats, 'TotalDotDPS')
  if (!main || (hit === undefined && dot === undefined)) return []
  const entry: Record<string, number | string> = { name: main.name, dps: hit ?? 0, dotDps: dot ?? 0 }
  const rate = num(stats, 'Speed')
  const critChance = num(stats, 'CritChance')
  const critMultiplier = num(stats, 'CritMultiplier')
  if (rate !== undefined) entry.rate = rate
  if (critChance !== undefined) entry.critChance = critChance
  if (critMultiplier !== undefined) entry.critMultiplier = critMultiplier
  return [{ dps: [entry], allGems: [{ name: main.name }] } as NinjaSkill]
}

/** Decode a Path of Building code into the parts of a character model it carries. Throws only if it will not decode. */
export async function pobToCharModel(code: string): Promise<CharModel> {
  const build = await importPobExport(code)
  const stats = build.playerStats
  const model: CharModel = {
    defensiveStats: defensiveStatsFromPob(stats),
    skills: mainSkillFromPob(build.xml, stats),
    passiveSelection: build.treeNodeIds ?? [],
    pathOfBuildingExport: code.trim(),
  }
  if (typeof build.level === 'number') model.level = build.level
  // PoB writes ascendClassName="None" before an ascendancy is chosen.
  const ascendancy = build.ascendClassName && build.ascendClassName !== 'None' ? build.ascendClassName : null
  const className = ascendancy ?? build.className
  if (className) model.class = className
  return model
}
