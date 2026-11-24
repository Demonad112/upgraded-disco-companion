/**
 * CP-1: a pasted poe.ninja code gives the per-stat breakdowns the old poe.ninja URL gave, read from the code's own
 * item, passive, quest and base lines and checked against Path of Building's totals in the code.
 *
 * The code (`main-ninja.code.txt`) is untrusted data: decoded and read, never executed.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { analyzeCharacter, type Analysis } from '../../src/analyze.js'
import { verifyTotal } from '../../src/model/breakdowns.js'
import { codeBreakdowns, CODE_BREAKDOWN_STATS, type CodeBreakdownStat } from '../../src/pob/code-breakdowns.js'
import { readPobSnapshotFromCode } from '../../src/pob/export.js'
import { pobToCharModel } from '../../src/pob/to-model.js'
import { PassiveTree, type PassiveTreeData } from '../../src/tree/index.js'

const read = (p: string) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8')
const code = read('./main-ninja.code.txt').trim()
const treeData = JSON.parse(read('../../../data/generated/passive-tree.json')) as PassiveTreeData
const tree = new PassiveTree(treeData)

/** PoB's PlayerStats in the code, for the covered stats. */
const POB: Record<CodeBreakdownStat, number> = {
  life: 1494,
  energyShield: 2827,
  mana: 790,
  spirit: 147,
  armour: 75,
  evasionRating: 7407,
  fireResistance: 75,
  coldResistance: 80,
  lightningResistance: 76,
  chaosResistance: 53,
}

/** Stats whose read lines reproduce PoB's total exactly. */
const VERIFIED: CodeBreakdownStat[] = ['life', 'energyShield', 'mana', 'spirit', 'armour', 'evasionRating']

/**
 * Stats that do not reproduce, and why. All four resistances: Mageblood's "Legacy of …" lines grant resistances
 * that depend on the flasks and charms it copies, and are not stat lines the code states. The read lines fall
 * short of PoB's uncapped totals by 45 points (75 + 12 / 80 + 59 / 76 + 54 / 53), Cold by 105.
 */
const NOT_REPRODUCING: Partial<Record<CodeBreakdownStat, { read: number; pob: number }>> = {
  fireResistance: { read: 42, pob: 87 },
  coldResistance: { read: 34, pob: 139 },
  lightningResistance: { read: 85, pob: 130 },
  chaosResistance: { read: 8, pob: 53 },
}

let cached: Analysis | null = null
async function analysis(): Promise<Analysis> {
  cached ??= await analyzeCharacter(await pobToCharModel(code), { source: 'pob-export', tree })
  return cached
}

describe('code breakdowns on main-ninja', () => {
  it('covers every stat, each either verified or listed as not reproducing', () => {
    expect([...VERIFIED, ...Object.keys(NOT_REPRODUCING)].sort()).toEqual([...CODE_BREAKDOWN_STATS].sort())
  })

  it('reproduces PoB’s Life, Energy Shield, Mana, Spirit, Armour and Evasion from the code’s lines', async () => {
    const a = await analysis()
    for (const stat of VERIFIED) {
      const entry = a.breakdowns.byKey.get(stat)
      expect(entry, stat).toBeDefined()
      expect(entry!.total, stat).toBe(POB[stat])
      expect(verifyTotal(entry!), stat).toMatchObject({ agrees: true, expected: POB[stat] })
    }
  })

  it('reads Life the way PoB builds it: level, Strength, the helmet and the default quest', async () => {
    const life = (await analysis()).breakdowns.byKey.get('life')!
    expect(life).toMatchObject({ base: 1423, inc: 5, total: 1494 })
    const parts = life.contributions.map((c) => [c.source.kind, c.source.label, c.modKind, c.value])
    expect(parts).toEqual(
      expect.arrayContaining([
        ['base', '', 'flat', 12 * 90 + 16],
        ['attribute', 'Strength', 'flat', 92 * 2],
        ['item', 'Hypnotic Keep, Runeforged Brigand Mask', 'flat', 123],
        ['quest', 'Act 1: Ogham Manor', 'flat', 20],
        ['quest', 'Interlude 2: Khari Crossing', 'increased', 5],
      ]),
    )
  })

  it('lists each resistance as not reproducing, with the read and PoB figures, and never adjusts it', async () => {
    const snap = await readPobSnapshotFromCode(code)
    const cb = codeBreakdowns(snap, await pobToCharModel(code), tree)!
    for (const [stat, want] of Object.entries(NOT_REPRODUCING)) {
      const check = cb.checks.find((c) => c.stat === stat)!
      expect(check, stat).toMatchObject({ agrees: false, pob: POB[stat as CodeBreakdownStat], uncapped: { read: want.read, pob: want.pob } })
      expect(check.reason, stat).toContain(`${want.pob}% before the cap`)
    }
    for (const stat of VERIFIED) expect(cb.checks.find((c) => c.stat === stat), stat).toMatchObject({ agrees: true, reason: null })
    // The stated total stays PoB's.
    const a = await analysis()
    expect(a.breakdowns.byKey.get('coldResistance')!.total).toBe(80)
  })

  it('names what each item is holding up, and keeps the resistances out', async () => {
    const a = await analysis()
    expect(a.attribution.items.length).toBeGreaterThan(0)
    const body = a.attribution.items.find((i) => i.itemName === 'Morbid Mantle')!
    expect(body.contributions.find((c) => c.stat === 'energyShield')).toMatchObject({ flat: 395 })
    expect(a.attribution.stats.filter((s) => s.trustworthy).map((s) => s.stat).sort()).toEqual(['armour', 'energyShield', 'evasionRating', 'life'])
    expect(a.attribution.excluded.map((e) => e.stat).sort()).toEqual(['chaosResistance', 'coldResistance', 'fireResistance', 'lightningResistance'])
    expect(a.attribution.excluded[0]!.reason).toContain('Path of Building')
  })

  it('names the item sources behind a resistance finding', async () => {
    const a = await analysis()
    const chaos = a.recommendations.recommendations.find((r) => r.id === 'res-chaos-under-cap')!
    expect(chaos).toBeDefined()
    expect(chaos.evidence.filter((e) => e.kind === 'breakdown').map((e) => (e as { source: string }).source)).toContain('Behemoth Band')
  })

  it('cross-validates the code’s totals against its own lines, not against itself', async () => {
    const r = (await analysis()).reconciliation!
    expect(r).not.toBeNull()
    expect(r.checks.every((c) => c.otherSource === 'breakdown-arithmetic')).toBe(true)
    const by = (stat: string) => r.checks.find((c) => c.stat === `breakdown:${stat}`)!
    for (const stat of VERIFIED) expect(by(stat), stat).toMatchObject({ ninja: POB[stat], other: POB[stat], severity: 'match' })
    // A resistance is compared before its cap: PoB 53 + 0 over cap, the lines 8.
    expect(by('chaosResistance')).toMatchObject({ ninja: 53, other: 8, severity: 'major' })
    expect(by('lightningResistance')).toMatchObject({ ninja: 130, other: 85, severity: 'major' })
  })

  it('drops the attribution gap for the stats that verify and names the ones that do not', async () => {
    const gaps = (await analysis()).sourceGaps.map((g) => g.what)
    expect(gaps).not.toContain('Stat attribution — which item or passive grants each point')
    expect(gaps).toContain('Stat attribution for Fire Resistance, Cold Resistance, Lightning Resistance and Chaos Resistance')
  })

  it('claims nothing without the tree data’s character base', async () => {
    const { characterBase: _drop, ...older } = treeData
    const a = await analyzeCharacter(await pobToCharModel(code), { source: 'pob-export', tree: new PassiveTree(older) })
    expect(a.breakdowns.all).toHaveLength(0)
    expect(a.attribution.items).toHaveLength(0)
    expect(a.reconciliation).toBeNull()
    expect(a.sourceGaps.map((g) => g.what)).toContain('Stat attribution — which item or passive grants each point')
  })
})
