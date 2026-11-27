/**
 * Per-level data of PoB2's attack skills, for the damage mini-calc (Batch 3).
 *
 * Output: generated/skill-levels.json
 *
 *   actives{}  skill name -> { castTime, flags (baseFlags), constants ([stat, value]), levels: [[baseMultiplier,
 *              attackSpeedMultiplier], ...] indexed by gem level - 1, buffStats? }
 *   buffStats  { stats, levels: [[value per stat], ...] indexed by gem level - 1 }: a buff's per-level added damage per
 *              stack (Charged Staff: `charged_staff_attack_{minimum,maximum}_added_lightning_damage_per_stack`), which
 *              PoB adds to other attacks. Only flat values (statInterpolation 1) are kept; any other fails the build.
 *
 * Only skills whose first stat set is flagged `attack` are kept: an attack's hit is the weapon's damage times
 * `baseMultiplier`, so the table is all the calc needs. Spells, whose base damage is a per-level table of its own,
 * are left out and the mini-calc reports them as "not estimated". Supports are read from pob-skills.json (their
 * constants carry the values).
 *
 * Read from PoB's loaded data (tools/pob2/export/skill-levels.lua) at the pinned revision (vendor/pob2/PIN.json).
 *
 * Usage: npm run build:skill-levels -w @poe2/data
 */

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pobCommit, pobCommitDate, pobExport } from './lib/pob.mjs'
import { writeDataVersion } from './lib/version.mjs'

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'generated')

const PER_STACK = /_(minimum|maximum)_added_[a-z]+_damage_per_stack$/

/** The stat set's per-stack added-damage stats and their per-level values, or undefined when it has none. */
function buffStatsOf(name, set) {
  const idx = set.stats.flatMap((s, i) => (PER_STACK.test(s) ? [i] : []))
  if (!idx.length) return undefined
  const levels = set.statLevels.map((l) => {
    for (const i of idx) if (l.interpolation[i] !== 1) throw new Error(`${name} level ${l.level}: ${set.stats[i]} is not a flat value`)
    return idx.map((i) => l.values[i])
  })
  return { stats: idx.map((i) => set.stats[i]), levels }
}

const exported = pobExport('skill-levels')
const actives = {}
for (const name of Object.keys(exported.actives).sort()) {
  const a = exported.actives[name]
  const set = a.statSet
  if (!set || !set.baseFlags.includes('attack')) continue
  actives[name] = {
    castTime: a.castTime ?? 1,
    flags: set.baseFlags,
    constants: set.constantStats,
    levels: a.levels.map((l) => [l.baseMultiplier ?? 1, l.attackSpeedMultiplier ?? 0]),
  }
  const buffStats = buffStatsOf(name, set)
  if (buffStats) actives[name].buffStats = buffStats
}

const out = {
  source: { repo: 'PathOfBuilding-PoE2', commit: pobCommit, license: 'MIT (Path of Building Community)', generatedAt: pobCommitDate },
  actives,
}
writeFileSync(join(outDir, 'skill-levels.json'), JSON.stringify(out))
writeDataVersion(outDir)
console.log(`skill-levels.json: ${Object.keys(actives).length} attack skills`)
