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
 *   - `skills`: every enabled `<Skill>` group of the active skill set with all its gems (`allGems`, supports
 *     flagged, CP-2), tagged with its group number; the main group leads and carries the damage PoB computed for it, and a
 *     `<FullDPSSkill>` row's figure goes on the group whose active gem it names;
 *   - the tree spec split as PoB loads it: `passiveSelection` is the main tree (`nodes` minus the
 *     `<WeaponSet1/2>` lists), `passiveSelectionSet1/2` the weapon-set trees, `useSecondWeaponSet`
 *     says which is live; `passiveTreeName` from `treeVersion`;
 *   - `pathOfBuildingExport`: the code itself, so its saved config and skill groups are read. The
 *     caller passes `source: 'pob-export'` so the analysis does not reconcile a code against itself.
 *
 *   - `items`, `flasks`, `jewels` from the active item set (`pob/items.ts`): item text, never mod ids
 *     (those are resolved against the affix data in `gear/text-mods.ts`).
 *
 * Left absent: name, account and league (a code has none) and `breakdowns`: a code does not carry
 * poe.ninja's per-stat attribution. `analyzeCharacter` reads it from the code's own lines when it has the
 * tree data (`pob/code-breakdowns.ts`, CP-1).
 */

import { RES_CAP_DEFAULT } from '../defense/constants.js'
import type { CharModel, DamageType, NinjaDefensiveStats, NinjaGem, NinjaItemData, NinjaSkill, NinjaSkillDps } from '../model/types.js'
import { readPlayerStats, readPobSnapshotFromCode } from './export.js'
import { snapshotItems } from './items.js'
import { isActiveGem, readPobMainSkill } from './main-skill.js'
import { activeSkillSet, activeSpec, splitTree, type PobGem, type PobSnapshot } from './snapshot.js'

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

/** One gem as poe.ninja's `allGems` entry: supports flagged, levels and quality only on active gems (as poe.ninja). */
function gemOf(gem: PobGem): NinjaGem {
  const support = !isActiveGem(gem)
  const itemData = { name: gem.nameSpec, support } as NinjaItemData
  const out: NinjaGem & { level?: number; quality?: number } = { name: gem.nameSpec, itemData }
  if (!support && gem.level !== null) out.level = gem.level
  if (!support && gem.quality !== null) out.quality = gem.quality
  return out
}

/**
 * Every enabled `<Skill>` group of the active skill set as a skill with its gems (CP-2), in PoB's order, each
 * tagged with its 1-based `group`. `first` names the active gem to list first in that group (PoB's selected main
 * active skill), so the setup and its damage entry name the same gem.
 */
function groupSkills(snap: PobSnapshot, mainGroup: number | null, first: string | null): NinjaSkill[] {
  const out: NinjaSkill[] = []
  activeSkillSet(snap)?.groups.forEach((g, i) => {
    if (!g.enabled) return
    let gems = g.gems.filter((x) => x.enabled && x.nameSpec)
    if (!gems.length) return
    if (i + 1 === mainGroup && first) {
      const at = gems.findIndex((x) => isActiveGem(x) && x.nameSpec === first)
      if (at > 0) gems = [gems[at]!, ...gems.slice(0, at), ...gems.slice(at + 1)]
    }
    out.push({ group: i + 1, allGems: gems.map(gemOf) })
  })
  return out
}

/** The selected active gem of a group: the first non-support gem in `allGems`. */
function activeName(skill: NinjaSkill): string | null {
  return skill.allGems?.find((g) => (g.itemData as { support?: boolean } | undefined)?.support !== true)?.name ?? null
}

/** The main skill's damage entry PoB computed; null when the code names no skill or no figure. */
function mainDpsFromPob(snap: PobSnapshot, stats: Record<string, number>): { group: number; entry: NinjaSkillDps } | null {
  const main = readPobMainSkill(snap)
  const hit = num(stats, 'TotalDPS')
  const dot = num(stats, 'TotalDotDPS')
  if (!main || (hit === undefined && dot === undefined)) return null
  const entry: NinjaSkillDps = { name: main.name, dps: hit ?? 0, dotDps: dot ?? 0 }
  const rate = num(stats, 'Speed')
  const critChance = num(stats, 'CritChance')
  const critMultiplier = num(stats, 'CritMultiplier')
  if (rate !== undefined) entry.rate = rate
  if (critChance !== undefined) entry.critChance = critChance
  if (critMultiplier !== undefined) entry.critMultiplier = critMultiplier
  const combined = num(stats, 'CombinedDPS')
  if (combined !== undefined) entry.combinedDps = combined
  return { group: main.group, entry }
}

/** PoB's `<FullDPSSkill>` label: `"2x Name"` when the count is not 1. */
export function parseFullDpsLabel(stat: string): { name: string; count: number } {
  const m = /^(\d+(?:\.\d+)?)x (.+)$/.exec(stat.trim())
  return m ? { name: m[2]!.trim(), count: Number(m[1]) } : { name: stat.trim(), count: 1 }
}

/**
 * Every `<FullDPSSkill>` row's figure (`value` is dps × count, PoB's Full DPS contribution), placed on the group
 * whose active gem it names, or as its own skill when no group does. The main skill keeps its own entry, with its
 * hit/DoT split, so a row naming it is not repeated. A row without a number is skipped: no figure is invented.
 */
function addFullDps(snap: PobSnapshot, skills: NinjaSkill[], mainName: string | null): void {
  for (const row of snap.fullDpsSkills) {
    if (row.value === null || !Number.isFinite(row.value)) continue
    const { name } = parseFullDpsLabel(row.stat)
    if (!name || name === mainName) continue
    const entry: NinjaSkillDps = { name, dps: row.value, dotDps: 0 }
    const host = skills.find((s) => !s.dps && activeName(s) === name)
    if (host) host.dps = [entry]
    else skills.push({ dps: [entry], allGems: [{ name }] })
  }
}

/** PoB's `treeVersion` (`0_5`) in poe.ninja's `passiveTreeName` form (`PassiveTree-0.5`). */
export function passiveTreeNameOf(treeVersion: string | null | undefined): string | null {
  return treeVersion && /^\d+(?:_\d+)*$/.test(treeVersion) ? `PassiveTree-${treeVersion.replace(/_/g, '.')}` : null
}

/**
 * A read snapshot as a character model (the temporary `CharModel` adapter; B6 moves the analysis onto
 * `PobSnapshot`). `code` is attached as `pathOfBuildingExport` when given.
 */
export function snapshotToCharModel(snap: PobSnapshot, code?: string): CharModel {
  const stats = readPlayerStats(snap)
  const main = mainDpsFromPob(snap, stats)
  const mainName = typeof main?.entry.name === 'string' ? main.entry.name : null
  const skills = groupSkills(snap, main?.group ?? null, mainName)
  if (main) {
    // The main skill leads, as on poe.ninja; the rest keep PoB's order and their `group`.
    const at = skills.findIndex((s) => s.group === main.group)
    const host = at >= 0 ? skills.splice(at, 1)[0]! : { allGems: [{ name: mainName ?? '' }] }
    host.dps = [main.entry]
    skills.unshift(host)
  }
  addFullDps(snap, skills, mainName)
  const spec = activeSpec(snap)
  const tree = splitTree(snap, spec)
  const model: CharModel = {
    defensiveStats: defensiveStatsFromPob(stats),
    skills,
    // PoB lists weapon-set nodes in `nodes` too; the main tree is what stays allocated on either set.
    passiveSelection: tree.main,
  }
  if (tree.weaponSet1.length) model.passiveSelectionSet1 = tree.weaponSet1
  if (tree.weaponSet2.length) model.passiveSelectionSet2 = tree.weaponSet2
  if (snap.items.useSecondWeaponSet !== null) model.useSecondWeaponSet = snap.items.useSecondWeaponSet
  const gear = snapshotItems(snap)
  if (gear.items.length) model.items = gear.items
  if (gear.flasks.length) model.flasks = gear.flasks
  if (gear.jewels.length) model.jewels = gear.jewels
  const treeName = passiveTreeNameOf(spec?.treeVersion)
  if (treeName) model.passiveTreeName = treeName
  if (code !== undefined) model.pathOfBuildingExport = code.trim()
  if (typeof snap.build.level === 'number') model.level = snap.build.level
  // PoB writes ascendClassName="None" before an ascendancy is chosen.
  const ascendancy = snap.build.ascendClassName && snap.build.ascendClassName !== 'None' ? snap.build.ascendClassName : null
  const className = ascendancy ?? snap.build.className
  if (className) model.class = className
  return model
}

/** Decode a Path of Building code into the parts of a character model it carries. Throws only if it will not decode. */
export async function pobToCharModel(code: string): Promise<CharModel> {
  return snapshotToCharModel(await readPobSnapshotFromCode(code), code)
}
