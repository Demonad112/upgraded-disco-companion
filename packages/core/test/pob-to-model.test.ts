/**
 * NP1-6: a Path of Building code runs through the same analysis as a poe.ninja model.
 *
 * poe.ninja's character model is behind a Cloudflare challenge since 2026-11-18 (NP1-1), so a pasted
 * code is the main import. These tests hold the converter to the project's two rules: every figure is
 * read from the code (cross-checked here against poe.ninja's numbers for the same character), and
 * whatever a code cannot supply is reported missing, never filled in.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { analyzeCharacter } from '../src/analyze.js'
import { pobToCharModel } from '../src/pob/to-model.js'
import type { CharModel } from '../src/model/types.js'
import { PassiveTree, type PassiveTreeData } from '../src/tree/index.js'
import { mainPayload, mainWithWeaponSets } from './helpers/main-build.js'

// The embedded model is the main build read from its own code, so every cross-check below compares the converter and
// the poe.ninja-shaped path on the same numbers; the absolute figures pin PoB's own output (the oracle).
const payload = mainPayload()
const ninjaModel: CharModel = payload.charModel ?? payload
const code = ninjaModel.pathOfBuildingExport!
const treePath = fileURLToPath(new URL('../../data/generated/passive-tree.json', import.meta.url))
const tree = new PassiveTree(JSON.parse(readFileSync(treePath, 'utf8')) as PassiveTreeData)

const ninja = await analyzeCharacter(payload, { tree })
const converted = await pobToCharModel(code)
const fromCode = await analyzeCharacter(converted, { tree, source: 'pob-export' })

function encode(s: string): string {
  return deflateSync(Buffer.from(s)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

describe('pobToCharModel', () => {
  it('reads identity from the code and leaves what a code lacks absent', () => {
    expect(converted.level).toBe(90)
    expect(converted.class).toBe('Martial Artist')
    expect(converted.name).toBeUndefined()
    expect(converted.account).toBeUndefined()
    expect(converted.league).toBeUndefined()
    expect(converted.items?.length).toBeGreaterThan(0)
    expect(converted.breakdowns).toBeUndefined()
  })

  it('keeps the code, so its config, main skill and skill groups are read', () => {
    expect(converted.pathOfBuildingExport).toBe(code)
  })

  it('splits the tree as PoB loads it: main tree, two weapon-set trees, the live-set flag and tree version (NP1-6b)', async () => {
    // The main code allocates no weapon-set nodes and states no live set: both stay absent, never invented.
    expect(converted.passiveSelection).toHaveLength(123)
    expect(converted.passiveSelectionSet1).toBeUndefined()
    expect(converted.passiveSelectionSet2).toBeUndefined()
    expect(converted.useSecondWeaponSet).toBeUndefined()
    expect(converted.passiveTreeName).toBe(ninjaModel.passiveTreeName)
    // PoB's `nodes` lists every allocated node; <WeaponSet1/2> name the ones that belong to one set only.
    const ws = mainWithWeaponSets(8)
    const split = await pobToCharModel(ws.code)
    expect(split.passiveSelection).toHaveLength(ws.all.length - 16)
    expect(split.passiveSelectionSet1).toEqual(ws.set1)
    expect(split.passiveSelectionSet2).toEqual(ws.set2)
    for (const n of [...ws.set1, ...ws.set2]) expect(split.passiveSelection).not.toContain(n)
    expect(split.useSecondWeaponSet).toBe(false)
  })
})

describe('analysing a converted code', () => {
  it('is labelled as coming from a code', () => {
    expect(fromCode.source).toBe('pob-export')
    expect(ninja.source).toBe('poe.ninja')
    expect(fromCode.dps.provenance).toBe('pob-export')
    for (const s of fromCode.dps.skills) expect(s.provenance).toBe('pob-export')
  })

  it('agrees with poe.ninja on the survivability headline and pools', () => {
    // PoB's own PlayerStats for the main code: physical is the lowest maximum hit.
    expect(fromCode.defense.lowestMaximumHit).toBe(5004)
    expect(fromCode.defense.lowestMaximumHitType).toBe('physical')
    expect(fromCode.defense.life).toBe(ninja.defense.life)
    expect(fromCode.defense.energyShield).toBe(ninja.defense.energyShield)
    expect(fromCode.defense.armour).toBe(ninja.defense.armour)
    expect(fromCode.defense.evasion).toBe(ninja.defense.evasion)
    expect(Math.round(fromCode.defense.effectiveHealthPool!)).toBe(Math.round(ninja.defense.effectiveHealthPool!))
    for (const m of fromCode.defense.maxHits) {
      expect(m.value).toBe(ninja.defense.maxHits.find((n) => n.type === m.type)!.value)
    }
  })

  it('agrees on every resistance value, and on its cap where the code shows it', () => {
    for (const res of fromCode.defense.resistances) {
      const theirs = ninja.defense.resistances.find((r) => r.type === res.type)!
      expect(res.value).toBe(theirs.value)
      if (res.max !== null && theirs.max !== null) expect(res.underCap).toBe(theirs.underCap)
    }
  })

  it('reads the main skill and its damage as PoB computed it', () => {
    expect(fromCode.dps.primary?.name).toBe(ninja.dps.primary?.name)
    expect(Math.round(fromCode.dps.primary!.dps)).toBe(Math.round(ninja.dps.primary!.dps))
    expect(fromCode.dps.primary?.critChance).toBeCloseTo(ninja.dps.primary!.critChance!, 0)
    // Same unit as poe.ninja (a multiplier, 2.48 means 248%), or the crit findings would misfire.
    expect(fromCode.dps.primary?.critMultiplier).toBeCloseTo(ninja.dps.primary!.critMultiplier!, 1)
  })

  it('never reconciles a code against itself', () => {
    expect(fromCode.reconciliation).toBeNull()
    expect(fromCode.warnings.join(' ')).not.toMatch(/disagree/)
  })

  it('still reads the config and skill groups the code was saved with', () => {
    expect(fromCode.pobConfig).not.toBeNull()
    expect(fromCode.pobSkillGroups?.length).toBeGreaterThan(0)
  })

  it('runs the tree check and keystones from the code’s tree, as the poe.ninja path does', () => {
    expect(fromCode.treeCheck.status).toBe(ninja.treeCheck.status)
    expect(fromCode.passives.main).toEqual(ninja.passives.main)
    expect(fromCode.passives.set1).toEqual(ninja.passives.set1)
    expect(fromCode.passives.set2).toEqual(ninja.passives.set2)
    expect(fromCode.passives.activeSet).toBe(ninja.passives.activeSet)
    expect(fromCode.passives.live).toEqual(ninja.passives.live)
    expect(fromCode.sourceGaps.map((g) => g.what)).not.toContain('Weapon-set passives')
  })

  it('trusts keystones from a code by the same rule as poe.ninja, now that the weapon sets are split', () => {
    expect(fromCode.keystones.fromTree).toEqual(ninja.keystones.fromTree)
    expect(fromCode.keystones.applied).toEqual(ninja.keystones.applied)
  })

  it('grades a range without a ladder sample, never a guessed letter', () => {
    expect(fromCode.assessment.score).toBeNull()
    expect(fromCode.assessment.tierRange).not.toBeNull()
    expect(fromCode.assessment.tierRange).toEqual(ninja.assessment.tierRange)
  })

  it('reads the code’s items, and says in its gaps only what it could not read (PB-5)', () => {
    expect(fromCode.items.length).toBeGreaterThan(0)
    const gear = fromCode.sourceGaps.find((g) => g.what.startsWith('Gear findings'))
    if (gear) expect(gear.why).not.toMatch(/not read yet/)
    const gaps = fromCode.sourceGaps.map((g) => g.what.toLowerCase()).join(' | ')
    expect(gaps).toContain('attribution')
    expect(gaps).toContain('per-skill damage')
    for (const g of fromCode.sourceGaps) expect(g.why).not.toMatch(/bridge|load the character from poe\.ninja/i)
    expect(ninja.sourceGaps).toEqual([])
  })

  it('does not blame poe.ninja reindexing for a code’s contradicted keystone', () => {
    expect(fromCode.warnings.join(' ')).not.toMatch(/poe\.ninja may not have reindexed/)
  })
})

describe('a sparse code', () => {
  const sparse = encode(
    '<PathOfBuilding><Build level="40" className="Warrior" mainSocketGroup="1">' +
      '<PlayerStat stat="Life" value="900" /><PlayerStat stat="FireResist" value="40" /></Build>' +
      '<Spec nodes="1,2"/></PathOfBuilding>',
  )

  it('reports absent pools, defences and maximums as missing, not 0', async () => {
    const a = await analyzeCharacter(await pobToCharModel(sparse), { source: 'pob-export' })
    expect(a.defense.life).toBe(900)
    expect(a.defense.energyShield).toBeNull()
    expect(a.defense.armour).toBeNull()
    expect(a.defense.evasion).toBeNull()
    expect(a.defense.lowestMaximumHit).toBeNull()
    expect(a.defense.missing).toEqual(expect.arrayContaining(['energyShield', 'armour', 'evasionRating', 'coldResistance']))
    expect(a.identity.className).toBe('Warrior')
  })

  it('takes the game-default cap for an uncapped resistance and names the assumption', async () => {
    const a = await analyzeCharacter(await pobToCharModel(sparse), { source: 'pob-export' })
    const fire = a.defense.resistances.find((r) => r.type === 'fire')!
    expect(fire.max).toBe(75)
    expect(fire.underCap).toBe(35)
    expect(a.sourceGaps.map((g) => g.what)).toContain('Raised maximum resistances')
  })

  it('has no damage figure, and says the code named none rather than blaming poe.ninja', async () => {
    const a = await analyzeCharacter(await pobToCharModel(sparse), { source: 'pob-export' })
    expect(a.dps.primary).toBeNull()
    expect(a.dps.unresolved).not.toMatch(/poe\.ninja/)
  })

  it('reads a cap from an over-cap resistance exactly: PoB reports the capped value', async () => {
    const raised = encode(
      '<PathOfBuilding><Build level="90" className="Witch" ascendClassName="Infernalist">' +
        '<PlayerStat stat="FireResist" value="78" /><PlayerStat stat="FireResistOverCap" value="12" /></Build></PathOfBuilding>',
    )
    const a = await analyzeCharacter(await pobToCharModel(raised), { source: 'pob-export' })
    const fire = a.defense.resistances.find((r) => r.type === 'fire')!
    expect(fire.max).toBe(78)
    expect(fire.overCap).toBe(12)
    expect(fire.capped).toBe(true)
    expect(a.identity.className).toBe('Infernalist')
  })

  it('leaves the cap missing when the value is above default but nothing pins it', async () => {
    const odd = encode(
      '<PathOfBuilding><Build level="90" className="Witch"><PlayerStat stat="ColdResist" value="77" /></Build></PathOfBuilding>',
    )
    const a = await analyzeCharacter(await pobToCharModel(odd), { source: 'pob-export' })
    const cold = a.defense.resistances.find((r) => r.type === 'cold')!
    expect(cold.value).toBe(77)
    expect(cold.max).toBeNull()
    expect(a.defense.missing).toContain('coldResistanceMax')
  })
})
