/**
 * Integration test of the poe.ninja-shaped payload reading (PB-5: replaces the captured-character test).
 *
 * The main build (the owner's PoB code) is the realistic character; the poe.ninja-only parts a code cannot supply
 * (per-skill damage blocks, weapon-set selections, breakdown sources) are stated inline below, with the numbers
 * the captured Athrynas payload carried. If one of these breaks, either the analyser regressed or the wire shape
 * moved: both are worth a loud failure.
 */

import { describe, expect, it } from 'vitest'

import { analyzeCharacter, unwrapCharModel } from '../src/analyze.js'
import { analyzeDefense } from '../src/defense/index.js'
import { analyzeDps } from '../src/dps/index.js'
import { indexBreakdowns, computeTotal, statSources } from '../src/model/breakdowns.js'
import { normalizePassives, inactiveSetNodes } from '../src/model/passives.js'
import { activeWeaponSet, normalizeItems } from '../src/model/slots.js'
import { decodePobExport, readPlayerStats } from '../src/pob/export.js'
import type { CharModel } from '../src/model/types.js'
import { addBreakdownMod, mainPayload, mainWithBreakdowns } from './helpers/main-build.js'

/** A poe.ninja per-skill damage block; `damageTypes` is physical, lightning, cold, fire, chaos in percent. */
const block = (name: string | undefined, over: Record<string, unknown> = {}) => ({
  dps: [{ ...(name ? { name } : {}), dps: 0, dotDps: 0, damageTypes: [0, 0, 0, 0, 0], dotDamageTypes: [0, 0, 0, 0, 0], rate: 1, rateKind: 0, critChance: 5, critMultiplier: 2.48, hitChance: 100, ...over }],
  allGems: [],
})
const skills = [
  block('Ice Shot', { dps: 109859, dotDps: 298, damageTypes: [4, 8, 84, 4, 0], rate: 2.322, projectiles: 2 }),
  block('Bow Shot', { dps: 80548, rate: 2.4 }),
  block('Tornado Shot', { dps: 48351, rate: 2 }),
  block('Snipe', { dps: 33370, rate: 1.2, hitRate: 0.7714 }),
  block('Herald of Ice', { dps: 0, dotDps: 1200, dotDamageTypes: [0, 0, 100, 0, 0] }),
  // Mirage Archer / Freezing Mark and the like carry a dps block with no name.
  block(undefined, { dps: 5000 }),
]

// The main build with those skills, the 0.5 defence block, three passive selections and poe.ninja's own counts.
const payload = mainWithBreakdowns()
const base = payload.charModel as CharModel & Record<string, unknown>
base.skills = skills as never
base.useSecondWeaponSet = false
base.passiveSelection = Array.from({ length: 103 }, (_, i) => 1000 + i)
base.passiveSelectionSet1 = Array.from({ length: 16 }, (_, i) => 2000 + i)
base.passiveSelectionSet2 = Array.from({ length: 16 }, (_, i) => 3000 + i)
base.passiveCounts = { passives: 109, anoints: 0, ascendancy: 8, bonusPassives: 0 }
const raw = payload as unknown
const model = unwrapCharModel(raw)

describe('identity', () => {
  it('reads the character sheet from the code, and leaves what a code lacks absent', () => {
    const m = unwrapCharModel(mainPayload())
    expect(m.level).toBe(90)
    expect(m.class).toBe('Martial Artist')
    expect(m.league).toBeUndefined()
    expect(m.name).toBeUndefined()
  })
})

describe('DPS — Tier 1, read not recomputed', () => {
  const dps = analyzeDps(model)

  it('reads poe.ninja’s computed per-skill DPS verbatim', () => {
    const byName = new Map(dps.skills.map((s) => [s.name, s]))
    expect(byName.get('Ice Shot')?.dps).toBe(109859)
    expect(byName.get('Bow Shot')?.dps).toBe(80548)
    expect(byName.get('Tornado Shot')?.dps).toBe(48351)
    expect(byName.get('Snipe')?.dps).toBe(33370)
  })

  it('ranks Ice Shot as the primary skill', () => {
    expect(dps.primary?.name).toBe('Ice Shot')
    expect(dps.primary?.provenance).toBe('ninja')
  })

  it('keeps hitRate for charge-up skills and null elsewhere', () => {
    const snipe = dps.skills.find((s) => s.name === 'Snipe')!
    expect(snipe.hitRate).toBeCloseTo(0.7714, 3)
    // Effective rate must apply hitRate, not ignore it.
    expect(snipe.effectiveRate).toBeCloseTo(snipe.rate! * snipe.hitRate!, 5)

    const iceShot = dps.skills.find((s) => s.name === 'Ice Shot')!
    // Absent means "not applicable", NOT 1.
    expect(iceShot.hitRate).toBeNull()
    expect(iceShot.effectiveRate).toBe(iceShot.rate)
  })

  it('classifies heralds as damage-over-time only', () => {
    const herald = dps.skills.find((s) => s.name === 'Herald of Ice')!
    expect(herald.dps).toBe(0)
    expect(herald.dotDps).toBeGreaterThan(0)
    expect(herald.isDotOnly).toBe(true)
    expect(dps.supportSkills.map((s) => s.name)).toContain('Herald of Ice')
    expect(dps.hitSkills.map((s) => s.name)).not.toContain('Herald of Ice')
  })

  it('skips nameless meta-gem containers rather than inventing labels', () => {
    // Mirage Archer / Freezing Mark / Ice-Tipped Arrows / Mirage Deadeye carry
    // a dps block with no name. They must not appear as castable skills.
    expect(dps.skills.every((s) => s.name.length > 0)).toBe(true)
    expect(dps.skills.map((s) => s.name)).not.toContain('')
  })

  it('reads the cold-dominant damage split', () => {
    const iceShot = dps.skills.find((s) => s.name === 'Ice Shot')!
    expect(iceShot.dominantType).toBe('cold')
    expect(iceShot.damageSplit.find((d) => d.type === 'cold')?.percent).toBe(84)
    expect(iceShot.critChance).toBe(5)
    expect(iceShot.critMultiplier).toBe(2.48)
    expect(iceShot.projectiles).toBe(2)
  })
})

describe('defence — led by the number that kills you', () => {
  const d = analyzeDefense(model)

  it('leads with lowestMaximumHitTaken, not EHP', () => {
    expect(d.lowestMaximumHit).toBe(3808)
    expect(d.lowestMaximumHitType).toBe('chaos')
  })

  it('quantifies how much EHP overstates survivability', () => {
    expect(d.effectiveHealthPool).toBe(13569)
    // 13569 / 3808 ~= 3.56
    expect(d.ehpOverstatementRatio).toBeCloseTo(3.56, 1)
  })

  it('reads every per-type max hit', () => {
    const byType = new Map(d.maxHits.map((m) => [m.type, m.value]))
    expect(byType.get('chaos')).toBe(3808)
    expect(byType.get('physical')).toBe(4264)
    expect(byType.get('cold')).toBe(14107)
    expect(byType.get('fire')).toBe(14611)
    expect(byType.get('lightning')).toBe(14611)
    // Sorted thinnest-first so the one-shot vector is always maxHits[0].
    expect(d.maxHits[0]!.type).toBe('chaos')
    expect(d.maxHits[0]!.isLowest).toBe(true)
  })

  it('models 0.5 mechanics V1 had no concept of', () => {
    expect(d.ward).toBe(706)
    expect(d.deflectionRating).toBe(2790)
    expect(d.deflectChance).toBe(21)
    expect(d.deflectEffect).toBe(40)
  })

  it('flags the sub-cap resistance and the overcapped one', () => {
    const byType = new Map(d.resistances.map((r) => [r.type, r]))
    expect(byType.get('cold')).toMatchObject({ value: 74, underCap: 1, capped: false })
    expect(byType.get('fire')).toMatchObject({ value: 75, overCap: 24, capped: true })
    expect(byType.get('lightning')).toMatchObject({ value: 75, overCap: 8 })
    expect(byType.get('chaos')).toMatchObject({ value: 18, underCap: 57 })
  })

  it('reads armour as near-worthless mitigation', () => {
    expect(d.armour).toBe(207)
    expect(d.physicalDamageReduction).toBe(2)
  })

  it('computes the chaos pool at half energy shield', () => {
    // Chaos removes 2x ES, so ES is worth half a point of pool.
    expect(d.chaosRawPool).toBe(1448 + 1937 / 2)
  })
})

describe('weapon sets — alternates, never summed', () => {
  it('resolves the active set from useSecondWeaponSet', () => {
    expect(model.useSecondWeaponSet).toBe(false)
    expect(activeWeaponSet(model)).toBe(1)
  })

  it('keeps the three passive selections separate', () => {
    const p = normalizePassives(model)
    expect(p.mainSelectionLength).toBe(103)
    expect(p.set1).toHaveLength(16)
    expect(p.set2).toHaveLength(16)
    // V1 summed these to 135 and called it one tree.
    expect(p.live.length).toBe(103 + 16)
    expect(p.live.length).not.toBe(135)
  })

  it('reports poe.ninja’s own count separately from the selection length', () => {
    const p = normalizePassives(model)
    // These are DIFFERENT numbers and must never be conflated.
    expect(p.counts.passives).toBe(109)
    expect(p.mainSelectionLength).toBe(103)
    expect(p.counts.anoints).toBe(0)
    expect(p.counts.ascendancy).toBe(8)
  })

  it('identifies the idle weapon-set nodes', () => {
    const p = normalizePassives(model)
    expect(inactiveSetNodes(p)).toHaveLength(16)
  })

  it('marks swap-set items inactive', () => {
    const items = normalizeItems(model)
    const mainHand = items.find((i) => i.slotId === 7)!
    expect(mainHand.active).toBe(true)
    expect(mainHand.name).toBe('Skull Song')
    expect(mainHand.baseType).toBe('Skullcrusher Quarterstaff')
    expect(mainHand.itemLevel).toBe(80)

    const swapWeapon = items.find((i) => i.slotId === 15)!
    expect(swapWeapon.active).toBe(false)
    expect(swapWeapon.itemLevel).toBe(69)
    // The main build has no off-hand, so there is no slot 16 to mark (the capture's was inactive).
    expect(items.find((i) => i.slotId === 16)).toBeUndefined()
  })

  it('reads item fields from itemData, not the wrapper', () => {
    const items = normalizeItems(model)
    expect(items).toHaveLength(10)
    // All 10 must resolve a real name — reading the wrapper yields undefined.
    expect(items.every((i) => i.name.length > 0)).toBe(true)
    expect(items.every((i) => i.itemLevel !== null)).toBe(true)
    // The helmet is corrupted; the rest are not.
    expect(items.filter((i) => i.corrupted).map((i) => i.slotId)).toEqual([1])
  })
})

describe('breakdowns — per-stat, per-source attribution', () => {
  // Breakdowns built from the items' text (helper), plus what a code cannot supply: two quest increases to armour,
  // a passive and a colour-coded source on energy shield, and two stat ids nothing maps.
  const bd = mainWithBreakdowns()
  addBreakdownMod(bd, 4, { typeId: 7, label: 'Interlude 2: Qimah' }, 'increased', 30)
  addBreakdownMod(bd, 4, { typeId: 7, label: 'Act 1: Ogham Manor' }, 'increased', 15)
  addBreakdownMod(bd, 2, { typeId: 1, label: '62984' }, 'flat', 8)
  addBreakdownMod(bd, 2, { typeId: 5, label: 'Many Sources:^x88FFFF32% Quiver Bonus Effect' }, 'flat', 5)
  const stats = (bd.charModel as unknown as { breakdowns: { stats: Record<string, unknown> } }).breakdowns.stats
  for (const id of ['22', '23']) stats[id] = { base: 0, inc: 0, more: 1, total: 0, basePercent: true, mods: [] }
  const idx = indexBreakdowns(unwrapCharModel(bd))

  it('indexes every stat and source it is given', () => {
    // 12 sheet stats, 4 maximum resistances and ward from the helper, plus the 2 unmapped ids.
    expect(idx.all).toHaveLength(19)
    expect(idx.sources.length).toBeGreaterThan(10)
  })

  it('maps stat ids to names and surfaces the unmapped ones honestly', () => {
    expect(idx.byKey.get('life')?.total).toBe(1448)
    expect(idx.byKey.get('armour')?.total).toBe(207)
    expect(idx.byKey.get('energyShield')?.total).toBe(1937)
    expect(idx.byKey.get('ward')?.total).toBe(706)
    // Unmapped ids read as placeholders, never as a guessed stat name.
    expect(idx.unmappedIds).toEqual([22, 23])
    expect(idx.byKey.get('stat_22')?.confidence).toBeNull()
  })

  it('reproduces poe.ninja’s totals from its own parts', () => {
    // total = base * (1 + inc/100) * more
    const life = idx.byKey.get('life')!
    expect(computeTotal(life.base, life.inc, life.more)).toBe(1448)
    const es = idx.byKey.get('energyShield')!
    expect(computeTotal(es.base, es.inc, es.more)).toBe(1937)
  })

  it('attributes armour to the exact items and quests that grant it', () => {
    const sources = statSources(idx, 'armour')
    const flat = sources.filter((s) => s.modKind === 'flat' && s.source.kind === 'item')
    expect(flat).toHaveLength(1)
    expect(flat[0]!.value).toBe(30)
    expect(flat[0]!.source.itemName).toBe('Morbid Mantle')
    expect(flat[0]!.source.itemBaseType).toBe("Runeforged Falconer's Jacket")

    const increased = sources.filter((s) => s.modKind === 'increased')
    expect(increased.map((s) => s.value).sort((a, b) => b - a)).toEqual([30, 15])
    expect(increased.every((s) => s.source.kind === 'quest')).toBe(true)
  })

  it('resolves passive sources to node ids and strips colour codes', () => {
    const es = statSources(idx, 'energyShield')
    const passive = es.find((s) => s.source.kind === 'passive')!
    expect(passive.source.nodeId).toBe(62984)

    // "Many Sources:^x88FFFF32% Quiver Bonus Effect" must lose the colour code.
    expect(es.some((s) => s.source.label === 'Many Sources:32% Quiver Bonus Effect')).toBe(true)
    expect(idx.sources.every((s) => !s.label.includes('^x'))).toBe(true)
  })
})

describe('Path of Building export — the independent second opinion', () => {
  it('decodes the code and cross-validates the DPS the analysis reads', async () => {
    const main = unwrapCharModel(mainPayload())
    const xml = await decodePobExport(main.pathOfBuildingExport!)
    expect(xml).toContain('<PathOfBuilding2')

    const stats = readPlayerStats(xml)
    // PoB computed this; the analysis reads the same number from the code's own stats.
    expect(stats.TotalDPS).toBeCloseTo(125658.18, 1)
    expect(Math.round(stats.TotalDPS!)).toBe(Math.round(analyzeDps(main).primary!.dps))
  })
})

describe('full analysis', () => {
  it('produces a coherent report with cross-validation attached', async () => {
    const a = await analyzeCharacter(mainPayload())
    expect(a.identity).toMatchObject({ level: 90, className: 'Martial Artist' })
    expect(a.pobStats).not.toBeNull()
    expect(a.reconciliation).not.toBeNull()
    expect(a.warnings).toEqual([])
  })

  it('agrees with PoB on every stat it can check, for a build read from its own code', async () => {
    const a = await analyzeCharacter(mainPayload())
    const major = a.reconciliation!.checks.filter((c) => c.severity === 'major')
    expect(major, `unexpected drift: ${JSON.stringify(major, null, 2)}`).toEqual([])
  })
})
