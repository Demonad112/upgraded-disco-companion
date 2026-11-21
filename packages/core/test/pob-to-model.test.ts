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

const payload = JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/athrynas-v43.json', import.meta.url)), 'utf8'))
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
    expect(converted.level).toBe(86)
    expect(converted.class).toBe('Deadeye')
    expect(converted.name).toBeUndefined()
    expect(converted.account).toBeUndefined()
    expect(converted.league).toBeUndefined()
    expect(converted.items).toBeUndefined()
    expect(converted.breakdowns).toBeUndefined()
  })

  it('keeps the code, so its config, main skill and skill groups are read', () => {
    expect(converted.pathOfBuildingExport).toBe(code)
  })

  it('carries the allocated tree', () => {
    const nodes = converted.passiveSelection as number[]
    expect(nodes.length).toBe(136)
    expect(nodes).toContain(50459)
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
    expect(fromCode.defense.lowestMaximumHit).toBe(3808)
    expect(fromCode.defense.lowestMaximumHitType).toBe('chaos')
    expect(fromCode.defense.life).toBe(ninja.defense.life)
    expect(fromCode.defense.energyShield).toBe(ninja.defense.energyShield)
    expect(fromCode.defense.armour).toBe(ninja.defense.armour)
    expect(fromCode.defense.evasion).toBe(ninja.defense.evasion)
    expect(Math.round(fromCode.defense.effectiveHealthPool!)).toBe(ninja.defense.effectiveHealthPool)
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
    expect(Math.round(fromCode.dps.primary!.dps)).toBe(ninja.dps.primary!.dps)
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
    // A code's tree spec lists the main tree and both weapon sets' nodes in one list: poe.ninja's three arrays,
    // plus the class start node (50459, Ranger), which PoB lists and poe.ninja leaves out.
    const all = [...ninja.passives.main, ...ninja.passives.set1, ...ninja.passives.set2, 50459].sort()
    expect([...fromCode.passives.main].sort()).toEqual(all)
    expect(fromCode.sourceGaps.map((g) => g.what)).toContain('Weapon-set passives')
  })

  it('trusts a keystone from a code only when the stats confirm it, since the weapon sets are not split', () => {
    // Nothing is applied on the tree's word alone: every applied keystone is one the sheet corroborates.
    expect(fromCode.keystones.fromTree).toEqual([])
    for (const k of fromCode.keystones.applied) expect(ninja.keystones.applied).toContain(k)
  })

  it('grades a range without a ladder sample, never a guessed letter', () => {
    expect(fromCode.assessment.score).toBeNull()
    expect(fromCode.assessment.tierRange).not.toBeNull()
    expect(fromCode.assessment.tierRange).toEqual(ninja.assessment.tierRange)
  })

  it('has no gear or attribution to show, and says so in its gaps', () => {
    expect(fromCode.items).toEqual([])
    const gaps = fromCode.sourceGaps.map((g) => g.what.toLowerCase()).join(' | ')
    expect(gaps).toContain('gear')
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
