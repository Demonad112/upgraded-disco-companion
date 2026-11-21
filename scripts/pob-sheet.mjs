/**
 * Print what the site's analysis reads from a Path of Building code, as a comparison sheet to check
 * against real Path of Building 2 (docs/plans/pob-character-analysis.md).
 *
 * Usage:
 *   npm run build -w @poe2/core
 *   node scripts/pob-sheet.mjs <file-with-code> [--json]
 *   pbpaste | node scripts/pob-sheet.mjs - [--json]
 *
 * The sheet uses the same field names as the PoB2 MCP prompt in the plan, so the two outputs line up
 * row by row. Nothing here is computed beyond what `analyzeCharacter` already returns.
 */

import { readFileSync } from 'node:fs'
import { analyzeCharacter, describePobConfig, isBossDps, ModTiers, PassiveTree, pobToCharModel, readDataVersion } from '../packages/core/dist/index.js'

const args = process.argv.slice(2)
const json = args.includes('--json')
const file = args.find((a) => a !== '--json')
if (!file) {
  console.error('Usage: node scripts/pob-sheet.mjs <file-with-code | -> [--json]')
  process.exit(2)
}
const code = readFileSync(file === '-' ? 0 : file, 'utf8').trim()

const gen = (name) => JSON.parse(readFileSync(new URL(`../packages/data/generated/${name}`, import.meta.url), 'utf8'))
const tree = new PassiveTree(gen('passive-tree.json'))
const tiers = new ModTiers(gen('mod-tiers.json'))
const dataVersion = readDataVersion(gen('version.json'))

const a = await analyzeCharacter(await pobToCharModel(code), { tree, tiers, dataVersion, source: 'pob-export' })
const d = a.defense
const p = a.dps.primary

const sheet = {
  stamp: a.stamp,
  character: { level: a.identity.level, class: a.identity.className },
  defence: {
    Life: d.life,
    EnergyShield: d.energyShield,
    Mana: a.model.defensiveStats?.mana ?? null,
    Spirit: a.model.defensiveStats?.spirit ?? null,
    Armour: a.model.defensiveStats?.armour ?? null,
    Evasion: a.model.defensiveStats?.evasionRating ?? null,
    EvadeChance: a.model.defensiveStats?.evadeChance ?? null,
    BlockChance: a.model.defensiveStats?.blockChance ?? null,
    TotalEHP: d.effectiveHealthPool,
    maxHits: Object.fromEntries(d.maxHits.map((h) => [h.type, h.value])),
    lowestMaximumHit: `${d.lowestMaximumHit ?? 'missing'} (${d.lowestMaximumHitType ?? '?'})`,
    ehpOverstatementRatio: d.ehpOverstatementRatio,
    resistances: Object.fromEntries(d.resistances.map((r) => [r.type, { value: r.value, max: r.max, overCap: r.overCap }])),
  },
  offence: p
    ? { mainSkill: p.name, TotalDPS: p.dps, TotalDotDPS: p.dotDps, Speed: p.rate, CritChance: p.critChance, CritMultiplier: p.critMultiplier }
    : { mainSkill: null, unresolved: a.dps.unresolved },
  config: { inputs: a.pobConfig?.inputCount ?? 0, bossDps: isBossDps(a.pobConfig), reads: describePobConfig(a.pobConfig) },
  skillGroups: (a.pobSkillGroups ?? []).map((g) => `${g.enabled ? '+' : '-'} ${g.label || g.skills.join(', ') || '?'}${g.weaponSet ? ` (set ${g.weaponSet})` : ''}`),
  passives: {
    selected: a.passives.mainSelectionLength,
    treeCheck: `${a.treeCheck.status}${a.treeCheck.missing.length ? ` (${a.treeCheck.missing.length} unknown nodes)` : ''}`,
    keystonesApplied: a.keystones.applied,
    keystonesUnverified: a.keystones.unverified.map((k) => `${k.keystone}: ${k.reason}`),
  },
  ailments: a.ailments.map((s) => `${s.ailment}: ${s.status}`),
  assessment: {
    tier: a.assessment.tier,
    tierRange: a.assessment.tierRange,
    score: a.assessment.score,
    offenceUnscoredReason: a.assessment.offenceUnscoredReason,
    weaknesses: a.assessment.weaknesses.map((w) => `${w.severity}: ${w.text}`),
  },
  recommendations: a.recommendations.recommendations.slice(0, 10).map((r) => `[${r.category}] ${r.action}`),
  items: a.items.length,
  gearFit: a.gearFit ? a.gearFit.items?.length ?? 'present' : null,
  sourceGaps: a.sourceGaps.map((g) => g.what),
  warnings: a.warnings,
}

if (json) {
  console.log(JSON.stringify(sheet, null, 2))
} else {
  for (const [section, value] of Object.entries(sheet)) {
    console.log(`\n## ${section}`)
    if (Array.isArray(value)) for (const v of value) console.log(`- ${v}`)
    else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) console.log(`${k}: ${typeof v === 'object' && v !== null ? JSON.stringify(v) : v}`)
    else console.log(value)
  }
}
