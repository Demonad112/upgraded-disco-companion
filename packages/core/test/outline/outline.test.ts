/**
 * Batch 1: the character outline. Every value read from the code equals the code's PlayerStat, every field is a
 * value or `missing` with a reason, and the owner's screenshot numbers (`app.expected.json`) that the code carries
 * match.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { buildCharacterOutline } from '../../src/outline/build.js'
import type { CharacterOutline, OutlineField } from '../../src/outline/types.js'
import { readPobSnapshotFromCode } from '../../src/pob/export.js'
import { readPobSnapshot } from '../../src/pob/snapshot.js'

const dir = (f: string) => fileURLToPath(new URL(`../reference/ninja-default/${f}`, import.meta.url))
const snap = await readPobSnapshotFromCode(readFileSync(dir('code.txt'), 'utf8').trim())
const expected = JSON.parse(readFileSync(dir('app.expected.json'), 'utf8')) as { sidebar: Record<string, number> }

function fields(o: CharacterOutline): OutlineField<unknown>[] {
  const out: OutlineField<unknown>[] = [
    ...Object.values(o.identity),
    ...o.character,
    ...o.defensive,
    ...o.recovery,
    o.mainSkill.name,
    ...o.mainSkill.stats,
    o.mainSkill.damageMix,
    ...o.tree.points,
    ...o.tree.keystones,
    ...o.tree.ascendancyNodes,
    ...o.config.settings,
    ...o.config.questRewards,
  ]
  for (const g of o.skills) out.push(g.dps, ...g.gems.flatMap((x) => [x.level, x.quality]))
  for (const it of [...o.equipment, ...o.utility]) {
    out.push(it.name, it.base, it.rarity, it.itemLevel)
    for (const l of it.lines) out.push(l.text, l.range, l.tier)
  }
  return out
}

const ninja = buildCharacterOutline(snap, { box: 'ninja' })

describe('buildCharacterOutline', () => {
  it('fills or explains every field: a value with provenance, or missing with a reason', () => {
    for (const o of [ninja, buildCharacterOutline(snap, { box: 'pob', config: 'own' }), buildCharacterOutline(snap, { box: 'pob', config: 'none' })]) {
      for (const f of fields(o)) {
        expect(f.key, JSON.stringify(f)).toBeTruthy()
        if (f.provenance === 'missing') {
          expect(f.value).toBeNull()
          expect((f as { reason: string }).reason.length).toBeGreaterThan(5)
        } else {
          expect(f.value).not.toBeNull()
          expect(['pob-export', 'derived', 'estimate', 'nominal']).toContain(f.provenance)
        }
      }
    }
  })

  it('reads every PlayerStat exactly: the value is the code’s number (percentages of a multiplier aside)', () => {
    const read = fields(ninja).filter((f) => f.stat && f.provenance !== 'missing')
    expect(read.length).toBeGreaterThan(30)
    for (const f of read) {
      const raw = snap.playerStats[f.stat!]!
      if (f.key === 'movementSpeed') expect(f.value).toBe(Math.round(raw * 100))
      else expect(f.value, f.stat).toBe(raw)
    }
  })

  it('matches the owner’s screenshot numbers wherever the code carries the stat', () => {
    let checked = 0
    for (const f of fields(ninja)) {
      if (!f.stat || f.provenance === 'missing') continue
      const shown = expected.sidebar[f.stat]
      if (shown === undefined || f.key === 'movementSpeed') continue
      // The screenshot shows PoB's rounded display value.
      const digits = String(shown).split('.')[1]?.length ?? 0
      // PoB truncates some of them (Deflection 1925.82 shows as 1925), so a display step of error is allowed.
      expect(Math.abs((f.value as number) - shown), f.stat).toBeLessThanOrEqual(1 / 10 ** digits + 1e-9)
      checked++
    }
    expect(checked).toBeGreaterThan(25)
  })

  it('says what a code cannot carry', () => {
    const keys = ninja.missing.map((m) => m.key)
    for (const k of ['name', 'account', 'league', 'lastFetched', 'itemRarity', 'runicWard', 'esRecharge', 'damageMix']) expect(keys).toContain(k)
  })

  it('reads the main skill and the Full DPS rows exactly, and does not invent DPS for other groups', () => {
    expect(ninja.mainSkill.name.value).toBe('Storm Wave')
    const main = ninja.skills.find((g) => g.main)!
    expect(main.dps.value).toBe(snap.playerStats.TotalDPS)
    for (const g of ninja.skills.filter((x) => !x.main && x.dps.provenance !== 'missing')) {
      expect(snap.fullDpsSkills.some((r) => r.value === g.dps.value)).toBe(true)
    }
  })

  it('lists items with mod lines, ranges, and no tier until tier data is given', () => {
    expect(ninja.equipment.length).toBeGreaterThan(8)
    const lines = ninja.equipment.flatMap((i) => i.lines)
    expect(lines.length).toBeGreaterThan(20)
    expect(lines.every((l) => l.tier.provenance === 'missing')).toBe(true)
    for (const l of lines) if (l.range.value) expect(l.range.value.roll).toBeGreaterThanOrEqual(0)
  })

  it('reads a roll range and its position from the item text and PoB’s ModRange', () => {
    const xml = `<PathOfBuilding2><Build level="80" className="Monk"/>
<Items activeItemSet="1"><Item id="1">Rarity: RARE
Doom Coil
Amethyst Ring
Item Level: 80
Implicits: 0
+(10-20) to maximum Life
+30% to Fire Resistance
{range:0.25}Adds (1-3) to (5-9) Fire damage
<ModRange id="1" range="0.5"/></Item>
<ItemSet id="1"><Slot name="Ring 1" itemId="1"/></ItemSet></Items></PathOfBuilding2>`
    const o = buildCharacterOutline(readPobSnapshot(xml), { box: 'pob' })
    const lines = o.equipment[0]!.lines
    expect(lines.map((l) => l.text.value)).toEqual(['+15 to maximum Life', '+30% to Fire Resistance', 'Adds 2 to 6 Fire damage'])
    expect(lines[0]!.range.value).toEqual({ min: 10, max: 20, roll: 0.5 })
    expect(lines[1]!.range.provenance).toBe('missing')
    expect(lines[2]!.range.value).toMatchObject({ min: 1, max: 3, roll: 0.25 })
  })

  it('takes a tier from analysed items, and says why when the line has none', () => {
    const xml = `<PathOfBuilding2><Build level="80" className="Monk"/>
<Items activeItemSet="1"><Item id="1">Rarity: RARE
Doom Coil
Amethyst Ring
Implicits: 0
+15 to maximum Life
+30% to Fire Resistance
</Item><ItemSet id="1"><Slot name="Ring 1" itemId="1"/></ItemSet></Items></PathOfBuilding2>`
    const items = [
      { slotId: 8, mods: [{ text: '+15 to maximum Life', tier: 3, unresolved: null }, { text: '+30% to Fire Resistance', tier: null, unresolved: 'no ladder for this base' }] },
    ] as unknown as import('../../src/gear/analyze.js').ItemAnalysis[]
    const lines = buildCharacterOutline(readPobSnapshot(xml), { box: 'pob', items }).equipment[0]!.lines
    expect(lines[0]!.tier).toMatchObject({ value: 3, provenance: 'derived' })
    expect(lines[1]!.tier).toMatchObject({ provenance: 'missing', reason: 'no ladder for this base' })
  })

  it('states the config by mode, and lists nothing under "no config"', () => {
    const own = buildCharacterOutline(snap, { box: 'pob', config: 'own' })
    const none = buildCharacterOutline(snap, { box: 'pob', config: 'none' })
    expect(ninja.config.settings.map((s) => s.value)).toContain('Guardian/Pinnacle boss')
    expect(ninja.config.settings.some((s) => s.label === 'Enemy level' && s.value === '82')).toBe(true)
    expect(own.config.statement).toMatch(/saved in your code/)
    expect(none.config.settings).toEqual([])
    expect(none.config.questRewards[0]!.provenance).toBe('missing')
    expect(ninja.config.questRewards.length).toBeGreaterThan(3)
  })

  it('a poe.ninja code is always the poe.ninja baseline, whatever the toggle says', () => {
    expect(buildCharacterOutline(snap, { box: 'ninja', config: 'none' }).configMode).toBe('ninja')
  })

  it('uses a typed name', () => {
    expect(buildCharacterOutline(snap, { box: 'ninja', name: ' Yykiuy ' }).identity.name.value).toBe('Yykiuy')
  })

  it('matches its golden', () => {
    const json = JSON.stringify(ninja, null, 2) + '\n'
    const path = fileURLToPath(new URL('./ninja-default.outline.expected.json', import.meta.url))
    let want: string | null = null
    try {
      want = readFileSync(path, 'utf8')
    } catch {
      want = null
    }
    if (want === null || process.env.UPDATE_OUTLINE_GOLDEN) {
      writeFileSync(path, json)
      want = json
    }
    expect(json).toBe(want)
  })
})

describe('pob2-own: the owner’s own config, listed as PoB’s Configuration tab shows it', async () => {
  const own = fileURLToPath(new URL('../reference/pob2-own/code.txt', import.meta.url))
  const o = buildCharacterOutline(await readPobSnapshotFromCode(readFileSync(own, 'utf8').trim()), { box: 'pob', config: 'own' })
  const shown = Object.fromEntries(o.config.settings.map((s) => [s.label === 'Condition' ? `Condition: ${s.value}` : s.label, s.value]))

  it('lists every setting the code saved, in PoB’s words, with no blank value', () => {
    expect(shown).toMatchObject({
      Boss: 'Guardian/Pinnacle boss',
      'Enemy level': '82',
      'Power charges': '5',
      'Effect of Chill': '27%',
      'Effect of Shock': '27%',
      Rage: '20',
      Combo: '18',
    })
    for (const c of [
      'enemy is chilled', 'enemy is dazed', 'enemy is shocked', 'you have been hit recently', 'you have crit recently',
      'you have crit in the past 8 seconds', 'you have dealt a non-crit recently', 'you killed a shocked enemy in the last 3 seconds',
      'you have chilled an enemy recently', 'you have shocked an enemy recently', 'you always have energy shield',
    ]) expect(shown, c).toHaveProperty([`Condition: ${c}`])
    for (const s of o.config.settings) expect(s.value, s.label).not.toBeNull()
  })

  it('reads Storm Wave as the main skill at the code’s 372,908 DPS', () => {
    expect(o.mainSkill.name.value).toBe('Storm Wave')
    expect(Math.round(o.skills.find((g) => g.main)!.dps.value!)).toBe(372908)
  })
})

describe('custom modifiers (PoB2 ConfigOptions.lua customMods)', () => {
  const xml = `<PathOfBuilding2><Config activeConfigSet="1"><ConfigSet id="1">
<Input name="customMods" string="+500 to maximum Life&#10;&#10;  20% more Damage  "/></ConfigSet></Config></PathOfBuilding2>`
  it('lists each non-empty line as a setting, since PoB applied it to the numbers', () => {
    const snap = readPobSnapshot(xml)
    const own = buildCharacterOutline(snap, { box: 'pob', config: 'own' })
    const custom = own.config.settings.filter((s) => s.label === 'Custom modifier')
    expect(custom.map((s) => s.value)).toEqual(['+500 to maximum Life', '20% more Damage'])
    expect(custom.every((s) => s.provenance === 'pob-export')).toBe(true)
    expect(buildCharacterOutline(snap, { box: 'pob', config: 'none' }).config.settings).toEqual([])
  })
})

