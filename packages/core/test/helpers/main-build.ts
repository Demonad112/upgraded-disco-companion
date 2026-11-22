/**
 * The owner's main build (Forbidden Rites, PoB 0.23.1) as a character payload: the code in
 * `pob2/forbidden-rites/main.code.txt`, read through `pobToCharModel`, its items matched to mod ids with the
 * affix data. This is the one realistic character the core tests share (PB-5 replaced the poe.ninja captures).
 * It has no poe.ninja breakdowns: those paths are tested on small inline models instead.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolveItemMods } from '../../src/gear/text-mods.js'
import { ModTiers, type ModTierData } from '../../src/gear/tiers.js'
import type { CharModel, NinjaItem } from '../../src/model/types.js'
import { pobToCharModel } from '../../src/pob/to-model.js'

const here = (p: string): string => fileURLToPath(new URL(p, import.meta.url))

export const mainCode = readFileSync(here('../pob2/forbidden-rites/main.code.txt'), 'utf8').trim()
export const mainTiers = new ModTiers(
  JSON.parse(readFileSync(here('../../../data/generated/mod-tiers.json'), 'utf8')) as ModTierData,
)

const base = await pobToCharModel(mainCode)
const resolved: CharModel = {
  ...base,
  items: resolveItemMods(base.items ?? [], mainTiers),
  jewels: resolveItemMods((base.jewels as NinjaItem[] | undefined) ?? [], mainTiers),
}

/** A fresh `{ type, charModel }` envelope each call, so a test may mutate it. */
export function mainPayload(): { type: string; charModel: CharModel } {
  return { type: 'character', charModel: structuredClone(resolved) }
}

/**
 * An explicit defence block for tests of the defence and score logic that tell a scenario: cold one point
 * short of the cap, chaos at 18%, chaos the lowest max hit, fire 24 over. It is a stated input, not a capture
 * (it is the block the poe.ninja fixture Athrynas v43 carried before PB-5).
 */
export const referenceDefence = {
  life: 1448, energyShield: 1937, ward: 706, mana: 793, spirit: 159, movementSpeed: 144, lifeRegen: 0,
  evasionRating: 6490, evadeChance: 41, evadeChanceMax: 95, enemyAccuracy: 2114, baseEvadeChance: 0, armour: 207,
  damageReductions: {
    physical: { value: 2, max: 90, effectiveAppliedArmour: 207, base: 0, takenDamage: 924 },
    fire: null, cold: null, lightning: null, chaos: null,
  },
  deflectChance: 21, deflectChanceMax: 95, deflectionRating: 2790, deflectEffect: 40,
  strength: 47, dexterity: 240, intelligence: 109, enduranceCharges: 3, frenzyCharges: 3, powerCharges: 3,
  effectiveHealthPool: 13569,
  physicalMaximumHitTaken: 4264, fireMaximumHitTaken: 14611, coldMaximumHitTaken: 14107,
  lightningMaximumHitTaken: 14611, chaosMaximumHitTaken: 3808,
  fireResistance: 75, fireResistanceOverCap: 24, fireResistanceMax: 75,
  coldResistance: 74, coldResistanceOverCap: 0, coldResistanceMax: 75,
  lightningResistance: 75, lightningResistanceOverCap: 8, lightningResistanceMax: 75,
  chaosResistance: 18, chaosResistanceOverCap: 0, chaosResistanceMax: 75,
  blockChance: 0, itemRarity: 63,
  physicalTakenAs: { physical: 95, lightning: 1.6666666, fire: 1.6666666, cold: 1.6666666, chaos: 0 },
  lowestMaximumHitTaken: 3808,
}

/** The reference scenario's main-skill DPS, placed in known ladder bands by the score tests. */
export const REFERENCE_DPS = 109_859

/** The main build with its defence block replaced by `referenceDefence` and its main skill's DPS by `REFERENCE_DPS`. */
export function mainWithReferenceDefence(): { type: string; charModel: CharModel } {
  const p = mainPayload()
  const skills = structuredClone(p.charModel.skills) as { dps?: { dps?: number }[] }[]
  const first = skills.find((s) => s.dps?.[0])
  if (first?.dps?.[0]) first.dps[0].dps = REFERENCE_DPS
  p.charModel = { ...p.charModel, defensiveStats: structuredClone(referenceDefence), skills } as CharModel
  return p
}

const FLAT: [number, string, RegExp][] = [
  [0, 'life', /^\+(\d+) to maximum Life$/],
  [1, 'mana', /^\+(\d+) to maximum Mana$/],
  [2, 'energyShield', /^\+(\d+) to maximum Energy Shield$/],
  [6, 'strength', /^\+(\d+) to Strength$/],
  [7, 'dexterity', /^\+(\d+) to Dexterity$/],
  [8, 'intelligence', /^\+(\d+) to Intelligence$/],
  [14, 'fireResistance', /^\+(\d+)% to Fire Resistance$/],
  [15, 'coldResistance', /^\+(\d+)% to Cold Resistance$/],
  [16, 'lightningResistance', /^\+(\d+)% to Lightning Resistance$/],
  [17, 'chaosResistance', /^\+(\d+)% to Chaos Resistance$/],
]

const strip = (s: string): string => s.replace(/\[(?:[^\]|]+\|)?([^\]]+)\]/g, '$1').replace(/\s+/g, ' ').trim()

/**
 * The reference scenario plus poe.ninja-shaped `breakdowns` built from the items' own text: every flat
 * life, mana, energy shield, attribute and resistance line becomes an item source, and a quest source holds
 * the rest, so each stat's parts add up to the sheet value the way poe.ninja's do. Stated input for the
 * attribution, replacement and holding-up tests; nothing here is read from poe.ninja.
 */
export function mainWithBreakdowns(): { type: string; charModel: CharModel } {
  const p = mainWithReferenceDefence()
  const m = p.charModel as CharModel & { defensiveStats: Record<string, number> }
  const sources: Array<[number] | [number, string]> = [[0], [7, 'Act 1: Clearfell']]
  const stats: Record<string, { base: number; inc: number; more: number; total: number; basePercent: boolean; mods: [number, number, number][] }> = {}
  const items = (m.items ?? []) as NinjaItem[]
  for (const [id, key, re] of FLAT) {
    const mods: [number, number, number][] = []
    let sum = 0
    for (const it of items) {
      const d = it.itemData
      let v = 0
      for (const l of [...(d.implicitMods ?? []), ...(d.runeMods ?? []), ...(d.explicitMods ?? [])]) {
        const hit = re.exec(strip(l))
        if (hit) v += Number(hit[1])
      }
      if (!v) continue
      sources.push([2, `${d.name}, ${d.typeLine ?? d.baseType}`])
      mods.push([0, v, sources.length - 1])
      sum += v
    }
    const total = m.defensiveStats[key] ?? 0
    const isRes = id >= 14
    const base = isRes ? total + (m.defensiveStats[`${key}OverCap`] ?? 0) : total
    if (base - sum !== 0) mods.unshift([0, base - sum, 1])
    stats[String(id)] = { base, inc: 0, more: 1, total, basePercent: isRes, mods }
  }
  m.breakdowns = { sources, stats }
  return p
}
