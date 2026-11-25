/**
 * CP-1: a pasted poe.ninja code gives the per-stat breakdowns the old poe.ninja URL gave, read from the code's own
 * item, passive, quest and base lines and checked against Path of Building's totals in the code.
 *
 * The code (`ninja-default.code.txt`) is untrusted data: decoded and read, never executed.
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
import { analyzeDps, USE_RATE_LABELS } from '../../src/dps/index.js'
import { analyzeItem } from '../../src/gear/analyze.js'
import { auditGemQuality, findEmptySockets } from '../../src/gear/audit.js'
import { resolveItemMods } from '../../src/gear/text-mods.js'
import { ModTiers, type ModTierData } from '../../src/gear/tiers.js'
import { SupportCatalog, type PobSkillData } from '../../src/gems/catalog.js'
import { parseAllSetups, parseSkillSetup } from '../../src/gems/index.js'
import { normalizeItems } from '../../src/model/slots.js'
import { ModDatabase, type ModData } from '../../src/mods/index.js'
import { decodePobExport } from '../../src/pob/export.js'
import { readPobSnapshot } from '../../src/pob/snapshot.js'
import { snapshotToCharModel } from '../../src/pob/to-model.js'
import { highestSocketedTier, reviewDamage } from '../../src/recommend/damage.js'
import { encodePob } from '../helpers/main-build.js'

const read = (p: string) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8')
const code = read('../reference/ninja-default/code.txt').trim()
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

describe('code breakdowns on ninja-default', () => {
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

// ---------------------------------------------------------------------------
// CP-2: gems from every `<Skill>` group, legal mod ids, empty runes, per-use DPS.
// ---------------------------------------------------------------------------

const dataDir = '../../../data/generated/'
const tiers = new ModTiers(JSON.parse(read(`${dataDir}mod-tiers.json`)) as ModTierData)
const catalog = new SupportCatalog(JSON.parse(read(`${dataDir}pob-skills.json`)) as PobSkillData)
const modDb = new ModDatabase(JSON.parse(read(`${dataDir}mods.json`)) as ModData, JSON.parse(read(`${dataDir}mod-bases.json`)))

describe('CP-2: every skill group’s gems on ninja-default', () => {
  it('reads all 18 groups, the main group (15, Storm Wave) first with PoB’s damage', async () => {
    const model = await pobToCharModel(code)
    expect(model.skills).toHaveLength(18)
    expect(model.skills!.map((s) => s.group).sort((a, b) => a! - b!)).toEqual(Array.from({ length: 18 }, (_, i) => i + 1))
    expect(model.skills![0]).toMatchObject({ group: 15, dps: [{ name: 'Storm Wave' }] })
    expect(model.skills!.filter((s) => s.dps)).toHaveLength(1)
    // 79 gems in the code, all enabled.
    expect(model.skills!.reduce((n, s) => n + (s.allGems?.length ?? 0), 0)).toBe(79)
  })

  it('shows Pinpoint Critical on groups 10, 12 and 15, and nowhere else', async () => {
    const model = await pobToCharModel(code)
    const withPinpoint = model.skills!.filter((s) => parseSkillSetup(s).supports.some((g) => g.name === 'Pinpoint Critical'))
    expect(withPinpoint.map((s) => s.group).sort((a, b) => a! - b!)).toEqual([10, 12, 15])
    expect(withPinpoint.map((s) => parseSkillSetup(s).skill).sort()).toEqual(['Staggering Palm', 'Storm Wave', 'Whirling Assault'])
  })

  it('reviews Storm Wave with its own five supports, and sees every group’s supports', async () => {
    const model = await pobToCharModel(code)
    const setups = parseAllSetups(model.skills)
    expect(setups).toHaveLength(18)
    const review = reviewDamage({ dps: analyzeDps(model), setups, items: [], rawItems: [], tiers: null, catalog })!
    expect(review.skill).toBe('Storm Wave')
    expect(review.supports.map((s) => s.name)).toEqual([
      'Branching Fissures II',
      'Elemental Armament II',
      'Pinpoint Critical',
      'Rapid Attacks II',
      'Deliberation',
    ])
    // The highest socketed tier is read across all 18 groups, not only the main one.
    const storm = highestSocketedTier([setups.find((s) => s.skill === 'Storm Wave')!], catalog)
    expect(highestSocketedTier(setups, catalog)).toBeGreaterThanOrEqual(storm ?? 0)
    expect(setups.flatMap((s) => s.supports).length).toBeGreaterThan(review.supports.length)
  })

  it('audits gem quality across every group: active gems only, supports never', async () => {
    const report = auditGemQuality(await pobToCharModel(code))
    const skills = new Set(report.map((r) => r.gem))
    expect(skills.has('Storm Wave')).toBe(false) // quality 20
    expect(report.length).toBeGreaterThan(0)
    expect(report.every((r) => !r.gem.includes('Pinpoint'))).toBe(true)
  })
})

describe('CP-2 (PB-12): mod ids matched from ninja-default’s item text', () => {
  const resolved = async () => resolveItemMods((await pobToCharModel(code)).items ?? [], tiers)

  it('gives every matched id only where it is legal for the item’s base', async () => {
    let checked = 0
    for (const item of await resolved()) {
      const base = item.itemData.typeLine ?? ''
      const tags = tiers.tagsForBase(base)
      const cls = tiers.classForBase(base)
      for (const [bucket, list] of Object.entries(item.itemData.mods ?? {})) {
        for (const { id } of list as { id: string }[]) {
          checked++
          if (bucket !== 'implicit' && tiers.raw(id)) {
            // An affix: PoB's spawn rules allow it on this base, and the class pool lists it where both are known.
            expect(tags && tiers.canSpawn(id, tags), `${id} on ${base}`).toBe(true)
            const pool = modDb.classesForMod(id)
            const poolClass = modDb.classForBase(base)
            if (pool && poolClass) expect(pool, `${id} on ${base}`).toContain(poolClass)
          } else if (bucket === 'implicit' && /^[A-Z][A-Za-z]+Implicit/.test(id) && cls) {
            // An implicit is named after the class it sits on, or after the base's own item type (PoB's Warstaff class
            // holds the Quarterstaff bases: QuarterstaffImplicitDazeChance1 on Skullcrusher Quarterstaff).
            const owner = id.slice(0, id.indexOf('Implicit'))
            expect(cls.replace(/\s+/g, '') === owner || base.replace(/\s+/g, '').endsWith(owner), `${id} on ${base}`).toBe(true)
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(20)
  })

  it('reads the amulet’s two-line implicit as one mod: capacity 4 prefixes / 2 suffixes', async () => {
    const amulet = (await resolved()).find((i) => i.itemSlot === 4)!
    expect(amulet.itemData.mods?.implicit).toEqual([
      { id: 'AmuletImplicitPrefixSuffixAllowed1', stats: { 'local_maximum_prefixes_allowed_+': 1, 'local_maximum_suffixes_allowed_+': -1 } },
    ])
    const item = normalizeItems({ items: [amulet] }).find((i) => i.slotId === 4)!
    expect(analyzeItem(item, tiers, null).affixCapacity).toEqual({ prefix: 4, suffix: 2 })
  })

  it('keeps a stat stored in hundredths in its own units (8.43% leech is 843 permyriad)', async () => {
    // ninja-default's quarterstaff has no leech line; a variant adds one to its explicit text.
    const xml = (await decodePobExport(code)).replace('Gain 26 Mana per enemy killed', 'Gain 26 Mana per enemy killed\nLeeches 8.43% of Physical Damage as Life')
    const items = resolveItemMods(snapshotToCharModel(readPobSnapshot(xml)).items ?? [], tiers)
    const weapon = items.find((i) => i.itemSlot === 7)!
    const leech = (weapon.itemData.mods?.explicit as { id: string; stats: Record<string, number> }[]).find((m) => m.id.startsWith('LifeLeechLocal'))!
    expect(leech.stats).toEqual({ local_life_leech_from_physical_damage_permyriad: 843 })
  })
})

describe('CP-2: empty rune sockets', () => {
  // ninja-default fills every socket; a variant empties the quarterstaff's two (`Rune: None`, as PoB writes it).
  const emptied = async () => {
    const xml = (await decodePobExport(code)).replace('Rune: Soul Core of Topotante\nRune: Saqawal&apos;s Rune of the Sky', 'Rune: None\nRune: None')
    return pobToCharModel(encodePob(xml))
  }

  it('finds none on ninja-default', async () => {
    expect(findEmptySockets(normalizeItems(await pobToCharModel(code)))).toEqual([])
  })

  it('counts `Rune: None` as an empty socket: Skull Song has 2 of 2 empty', async () => {
    const empty = findEmptySockets(normalizeItems(await emptied()))
    expect(empty).toEqual([{ slotId: 7, slotLabel: expect.any(String), itemName: 'Skull Song', sockets: 2, filled: 0, empty: 2 }])
  })

  it('makes it a finding with no measured gain: a rune’s worth would be a simulated swap', async () => {
    const a = await analyzeCharacter(await emptied(), { source: 'pob-export', tree })
    const rec = a.recommendations.recommendations.find((r) => r.id === 'empty-rune-sockets-7')!
    expect(rec).toMatchObject({ category: 'efficiency', impact: null, provenance: 'pob-export' })
    expect(rec.measured?.dps).toBeNull()
    expect(rec.action).toBe('Fill the 2 empty rune sockets in Skull Song.')
    expect(rec.evidence[0]).toMatchObject({ kind: 'item', slotId: 7, itemName: 'Skull Song' })
  })
})

describe('CP-2: per-use vs continuous DPS', () => {
  it('does not split Storm Wave: its CombinedDPS is not below its TotalDPS', async () => {
    expect(analyzeDps(await pobToCharModel(code)).primary).toMatchObject({ name: 'Storm Wave', useRates: null })
  })

  it('labels Hollow Resonance (group 4) per use 66,832 and if used continuously 129,453', async () => {
    // A code carries PlayerStats for its own main group only, so the variant also carries PoB's engine figures for
    // group 4, read from the groups oracle (`reference/ninja-default/groups.oracle.json`, CP-7).
    const groups = JSON.parse(read('../reference/ninja-default/groups.oracle.json')) as { rows: { group: number; activeSkill: number; TotalDPS: number; CombinedDPS: number }[] }
    const g4 = groups.rows.find((r) => r.group === 4 && r.activeSkill === 1)!
    const xml = (await decodePobExport(code))
      .replace('mainSocketGroup="15"', 'mainSocketGroup="4"')
      .replace(/<PlayerStat stat="TotalDPS" value="[^"]*"\/>/, `<PlayerStat stat="TotalDPS" value="${g4.TotalDPS}"/>`)
      .replace(/<PlayerStat stat="CombinedDPS" value="[^"]*"\/>/, `<PlayerStat stat="CombinedDPS" value="${g4.CombinedDPS}"/>`)
    const primary = analyzeDps(snapshotToCharModel(readPobSnapshot(xml))).primary!
    expect(primary.name).toBe('Hollow Resonance')
    expect(Math.round(primary.useRates!.perUse)).toBe(66832)
    expect(Math.round(primary.useRates!.continuous)).toBe(129453)
    expect(USE_RATE_LABELS).toEqual({ perUse: 'per use', continuous: 'if used continuously' })
  })
})
