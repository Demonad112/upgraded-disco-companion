/**
 * Extract support-gem effects and active-skill types from Path of Building 2.
 *
 * Output: generated/pob-skills.json
 *
 *   supports[]  name, gem family, required/excluded skill-type expressions,
 *               and every constant "+%_final" effect with the PoB modifier it
 *               maps to (name, MORE/INC, flags, and whether it's conditional)
 *   actives{}   active skill name -> its skill types
 *
 * ## Why PoB, and why only this much
 *
 * poe.ninja tells us which supports a skill has, and gems/index.ts already
 * checks two legality rules from the payload. What it can't say is which OTHER
 * supports would work on a skill, or what each one is worth. PoB's skill data
 * answers both from the game files: `requireSkillTypes` is the compatibility
 * rule PoB itself evaluates (calcLib.canGrantedEffectSupportActiveSkill), and
 * `constantStats` holds each support's own fixed values.
 *
 * Only constant values are extracted. Effects that scale with gem level, or
 * whose stat has no local `statMap` entry, are left out rather than guessed —
 * the consumer reports those supports as "not quantified".
 *
 * ## How it reads PoB
 *
 * Not by parsing Lua text. tools/pob2/export/skills.lua loads PoB headless and
 * dumps its own loaded skill and gem tables (`data.skills`, `data.gems`); the
 * flag and skill-type bitfields arrive already decoded to PoB's names. The
 * revision is the one in vendor/pob2/PIN.json (no POB2_DIR).
 *
 * Usage: npm run build:pob-skills -w @poe2/data
 */

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pobCommit, pobCommitDate, pobExport } from './lib/pob.mjs'
import { writeDataVersion } from './lib/version.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'generated')

/**
 * One mod of a support's own statMap, in the artifact's shape. A mod is conditional when it carries a tag table
 * (a Condition, Multiplier, ...) or a computed value: it then applies only some of the time.
 */
function tagOf(t) {
  return {
    type: t.type,
    ...(typeof t.var === 'string' ? { var: t.var } : {}),
    ...(t.neg === true ? { neg: true } : {}),
    ...(typeof t.threshold === 'number' ? { threshold: t.threshold } : {}),
    ...(Array.isArray(t.ramp) ? { ramp: t.ramp } : {}),
  }
}

function toMod(m) {
  return {
    name: m.name,
    type: m.type,
    flags: m.flags,
    keywords: m.keywords,
    // Any tag means the effect only applies some of the time.
    conditions: m.tags.filter((t) => typeof t.var === 'string').map((t) => t.var),
    conditional: m.tags.length > 0 || m.valueIsTable === true,
    // The gates themselves, for a calc that can evaluate them: a Condition (negated when `neg`), a
    // MultiplierThreshold (`threshold` of `var`) or a DistanceRamp (`ramp` of [distance, factor]).
    ...(m.tags.length ? { tags: m.tags.map(tagOf) } : {}),
  }
}

function toSupport(s) {
  const effects = []
  // Constant stats with no local statMap entry: PoB maps them globally, and
  // most are plain "increased" modifiers (e.g. attack_speed_+%). Kept raw so
  // the consumer can describe them without pretending to value them.
  const unmapped = []
  for (const [stat, value] of s.constantStats) {
    // `skill("x", v)` entries set skill data rather than a modifier; they are not damage or speed effects.
    const mods = (s.statMap[stat] ?? []).filter((m) => m.name !== 'SkillData').map(toMod)
    if (!mods.length) unmapped.push({ stat, value })
    else effects.push({ stat, value, mods })
  }
  return {
    id: s.id,
    name: s.name,
    description: s.description ?? null,
    family: s.family,
    require: s.requireSkillTypes,
    exclude: s.excludeSkillTypes,
    lineage: s.isLineage,
    effects,
    unmapped,
    flags: s.stats,
    tier: s.tier,
  }
}

const exported = pobExport('skills')
const supports = exported.supports.map(toSupport)
const actives = exported.actives

supports.sort((a, b) => a.name.localeCompare(b.name))
const out = {
  source: {
    repo: 'PathOfBuilding-PoE2',
    commit: pobCommit,
    license: 'MIT (Path of Building Community)',
    generatedAt: pobCommitDate,
  },
  supports,
  actives,
}
writeFileSync(join(outDir, 'pob-skills.json'), JSON.stringify(out))
writeDataVersion(outDir)
const quantified = supports.filter((s) => s.effects.length).length
console.log(
  `pob-skills.json: ${supports.length} supports (${quantified} with constant effects), ${Object.keys(actives).length} actives`,
)
