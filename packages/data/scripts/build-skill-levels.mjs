/**
 * Per-level data of PoB2's attack skills, for the damage mini-calc (Batch 3).
 *
 * Output: generated/skill-levels.json
 *
 *   actives{}  skill name -> { castTime, flags (baseFlags), constants ([stat, value]), levels: [[baseMultiplier,
 *              attackSpeedMultiplier], ...] indexed by gem level - 1 }
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
}

const out = {
  source: { repo: 'PathOfBuilding-PoE2', commit: pobCommit, license: 'MIT (Path of Building Community)', generatedAt: pobCommitDate },
  actives,
}
writeFileSync(join(outDir, 'skill-levels.json'), JSON.stringify(out))
writeDataVersion(outDir)
console.log(`skill-levels.json: ${Object.keys(actives).length} attack skills`)
