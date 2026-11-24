/**
 * CP-7: every skill group of a code against PoB's own engine output for it.
 *
 * `<name>.groups.oracle.json` is written by headless PoB (`tools/pob2/groups.lua` via `npm run pob2:oracle`, CI job
 * `pob2-oracle`): one row per (group, active skill), with that group selected. No Lua runs here. It is CI-only ground
 * truth: a code stores PlayerStats for its main group only, and the site never shows or simulates the others (B9).
 *
 * Checked per code: the code's own TotalDPS equals the oracle row for its main group (0.1 %), every `<Skill>` group has
 * a row (decode completeness), and the oracle's skill per group is the active gem our `allGems` lists for it.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { readPlayerStats, readPobSnapshotFromCode } from '../src/pob/export.js'
import { activeSkillSet } from '../src/pob/snapshot.js'
import { pobToCharModel } from '../src/pob/to-model.js'

interface GroupRow {
  group: number
  activeSkill: number
  skill?: string
  enabled?: boolean
  loadError?: string
  TotalDPS?: number
  CombinedDPS?: number
}
interface GroupsOracle {
  groups: number
  rows: GroupRow[]
}

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url))
const pob2 = here('./pob2/')

/** Current-league fixtures plus the reference character (run.mjs `GROUPS_EXTRA`). */
const codes = [
  ...readdirSync(pob2, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== 'archive')
    .flatMap((d) => readdirSync(`${pob2}${d.name}`).filter((f) => f.endsWith('.code.txt')).map((f) => `${pob2}${d.name}/${f}`)),
  here('./ninja-legacy/main-ninja.code.txt'),
]

/**
 * Groups whose oracle row is not the group's own skill, and why. Group 18 on both builds is the Spear Throw that
 * Daevata's Wind grants on the swap weapon ("Weapon 1 Swap", not the live set): PoB logs "Failed to process skill:
 * Spear Throw" and computes its fallback attack (Spear Stab) instead. A change here means PoB's engine changed.
 */
const ENGINE_FALLBACK: Record<number, { code: string; engine: string }> = {
  18: { code: 'Spear Throw', engine: 'Spear Stab' },
}

/**
 * Codes whose embedded TotalDPS is stale against current PoB by more than 0.1 % (PB-3a): the owner's PoB2-app export
 * was written by an older PoB (125,658 embedded vs 125,919 now). Pinned, so a fix or a new drift shows up here.
 */
const STALE_TOTAL_DPS: Record<string, { gap: number; why: string }> = {
  'pob2/forbidden-rites/main.code.txt': { gap: 0.002077, why: 'PoB2-app export written by an older PoB (PB-3a)' },
}

const label = (file: string) => file.replace(/^.*\/test\//, '')

describe('PoB2 groups oracle (CP-7)', () => {
  it('covers the reference character and every current-league fixture', () => {
    expect(codes.length).toBeGreaterThanOrEqual(2)
    for (const file of codes) expect(existsSync(file.replace(/\.code\.txt$/, '.groups.oracle.json')), label(file)).toBe(true)
  })

  for (const file of codes) {
    describe(label(file), async () => {
      const code = readFileSync(file, 'utf8').trim()
      const oracle = JSON.parse(readFileSync(file.replace(/\.code\.txt$/, '.groups.oracle.json'), 'utf8')) as GroupsOracle
      const snap = await readPobSnapshotFromCode(code)
      const model = await pobToCharModel(code)
      const groups = activeSkillSet(snap)!.groups
      const first = (g: number) => oracle.rows.find((r) => r.group === g && r.activeSkill === 1)

      it('loaded every row', () => {
        expect(oracle.rows.filter((r) => r.loadError)).toEqual([])
      })

      it('the code’s TotalDPS equals the oracle row for its main group within 0.1 %', () => {
        const main = snap.build.mainSocketGroup!
        const active = groups[main - 1]!.mainActiveSkill ?? 1
        const row = oracle.rows.find((r) => r.group === main && r.activeSkill === active)!
        expect(row, `group ${main}`).toBeDefined()
        // Where the snapshot oracle exists, the groups run reproduces PoB's recomputed export exactly.
        const snapshotOracle = file.replace(/\.code\.txt$/, '.oracle.json')
        if (existsSync(snapshotOracle)) {
          const recomputed = (JSON.parse(readFileSync(snapshotOracle, 'utf8')) as { export: { PlayerStat: Record<string, number> } }).export
          expect(row.TotalDPS).toBe(recomputed.PlayerStat.TotalDPS)
        }
        const stated = readPlayerStats(snap).TotalDPS!
        const gap = Math.abs(row.TotalDPS! - stated) / stated
        const stale = STALE_TOTAL_DPS[label(file)]
        if (stale) expect(gap, stale.why).toBeCloseTo(stale.gap, 4)
        else expect(gap).toBeLessThan(0.001)
      })

      it('has a row for every <Skill> group in the code', () => {
        expect(oracle.groups).toBe(groups.length)
        expect([...new Set(oracle.rows.map((r) => r.group))]).toEqual(groups.map((_, i) => i + 1))
        groups.forEach((g, i) => expect(first(i + 1)?.enabled, `group ${i + 1}`).toBe(g.enabled))
      })

      it('names, per group, the active gem allGems lists first', () => {
        const fallbacks: number[] = []
        for (const skill of model.skills!.filter((s) => s.group !== undefined)) {
          const gem = skill.allGems!.find((g) => (g.itemData as { support?: boolean } | undefined)?.support !== true)!.name
          const engine = first(skill.group!)!.skill
          if (engine === gem) continue
          expect(ENGINE_FALLBACK[skill.group!], `group ${skill.group}: allGems ${gem}, PoB ${engine}`).toEqual({ code: gem, engine })
          fallbacks.push(skill.group!)
        }
        expect(fallbacks).toEqual(Object.keys(ENGINE_FALLBACK).map(Number))
      })
    })
  }

  describe('main-ninja, the reference numbers', async () => {
    const oracle = JSON.parse(readFileSync(here('./ninja-legacy/main-ninja.groups.oracle.json'), 'utf8')) as GroupsOracle
    const row = (g: number, a = 1) => oracle.rows.find((r) => r.group === g && r.activeSkill === a)!

    it('has 18 groups and 21 rows, Storm Wave at ≈ 98,591', () => {
      expect(oracle.groups).toBe(18)
      expect(oracle.rows).toHaveLength(21)
      expect(row(15)).toMatchObject({ skill: 'Storm Wave' })
      expect(Math.round(row(15).TotalDPS!)).toBe(98591)
    })

    it('has Hollow Resonance (group 4) as a combo skill: per use below if used continuously', () => {
      // `ninja-legacy/code-analysis.test.ts` feeds these figures to the CP-2 per-use label.
      expect(row(4)).toMatchObject({ skill: 'Hollow Resonance' })
      expect(Math.round(row(4).CombinedDPS!)).toBe(33332)
      expect(Math.round(row(4).TotalDPS!)).toBe(69531)
    })
  })
})
