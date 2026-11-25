/**
 * CP-7: every skill group of a code against PoB's own engine output for it.
 *
 * `<name>.groups.oracle.json` is written by headless PoB (`tools/pob2/groups.lua` via `npm run pob2:oracle`, CI job
 * `pob2-oracle`): one row per (group, active skill), with that group selected in a single loaded build. No Lua runs here. It is the
 * accuracy reference: a code stores PlayerStats for its main group only, so the site's figures for the others are
 * simulated (B9, browser engine, labelled "≈ est.") and checked against these rows.
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
  /** PoB's own socketGroupList index the row was computed from (groups.lua). */
  pobGroup?: number
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
const reference = here('./reference/')

/** Every reference code: `test/reference/<name>/code.txt`. */
const codes = readdirSync(reference, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(`${reference}${d.name}/code.txt`))
  .map((d) => `${reference}${d.name}/code.txt`)
const groupsPath = (file: string) => file.replace(/code\.txt$/, 'groups.oracle.json')

/**
 * Groups PoB folds into another group on its first calc (CalcSetup.lua mergedGroups / granted-skill cleanup), as
 * export index → PoB index of the group it computes them from. PoB2 0.23.1 (the release the code was written by)
 * folds none on ninja-default: every group is computed from its own index. A change here means PoB's merge rules changed.
 */
const FOLDED: Record<number, number> = {}

const label = (file: string) => file.replace(/^.*\/test\//, '')

describe('PoB2 groups oracle (CP-7)', () => {
  it('covers every reference code', () => {
    expect(codes.length).toBeGreaterThanOrEqual(1)
    for (const file of codes) expect(existsSync(groupsPath(file)), label(file)).toBe(true)
  })

  for (const file of codes) {
    describe(label(file), async () => {
      const code = readFileSync(file, 'utf8').trim()
      const oracle = JSON.parse(readFileSync(groupsPath(file), 'utf8')) as GroupsOracle
      const snap = await readPobSnapshotFromCode(code)
      const model = await pobToCharModel(code)
      const groups = activeSkillSet(snap)!.groups
      const first = (g: number) => oracle.rows.find((r) => r.group === g && r.activeSkill === 1)

      it('loaded every row', () => {
        expect(oracle.rows.filter((r) => r.loadError)).toEqual([])
      })

      it('the code’s TotalDPS equals the oracle row for its main group', () => {
        const main = snap.build.mainSocketGroup!
        const active = groups[main - 1]!.mainActiveSkill ?? 1
        const row = oracle.rows.find((r) => r.group === main && r.activeSkill === active)!
        expect(row, `group ${main}`).toBeDefined()
        // Where the snapshot oracle exists, the groups run reproduces PoB's recomputed export exactly.
        const snapshotOracle = file.replace(/code\.txt$/, 'oracle.json')
        if (existsSync(snapshotOracle)) {
          const recomputed = (JSON.parse(readFileSync(snapshotOracle, 'utf8')) as { export: { PlayerStat: Record<string, number> } }).export
          expect(row.TotalDPS).toBe(recomputed.PlayerStat.TotalDPS)
        }
        const stated = readPlayerStats(snap).TotalDPS!
        expect(Math.abs(row.TotalDPS! - stated) / stated).toBeLessThan(1e-9)
      })

      it('has a row for every <Skill> group in the code', () => {
        expect(oracle.groups).toBe(groups.length)
        expect([...new Set(oracle.rows.map((r) => r.group))]).toEqual(groups.map((_, i) => i + 1))
        groups.forEach((g, i) => expect(first(i + 1)?.enabled, `group ${i + 1}`).toBe(g.enabled))
      })

      it('names, per group, the active gem allGems lists first', () => {
        for (const skill of model.skills!.filter((s) => s.group !== undefined)) {
          const gem = skill.allGems!.find((g) => (g.itemData as { support?: boolean } | undefined)?.support !== true)!.name
          expect(first(skill.group!)!.skill, `group ${skill.group}`).toBe(gem)
        }
      })

      it('computes each group from PoB’s own group, folded groups from the one PoB kept', () => {
        // Observed from the rows alone: a kept group is the next PoB index; any other pobGroup is a fold.
        const folded: Record<number, number> = {}
        let kept = 0
        for (let g = 1; g <= groups.length; g++) {
          const pobGroup = first(g)!.pobGroup!
          if (pobGroup === kept + 1) kept++
          else folded[g] = pobGroup
        }
        expect(folded).toEqual(FOLDED)
      })
    })
  }

  describe('ninja-default, the reference numbers', async () => {
    const oracle = JSON.parse(readFileSync(here('./reference/ninja-default/groups.oracle.json'), 'utf8')) as GroupsOracle
    const row = (g: number, a = 1) => oracle.rows.find((r) => r.group === g && r.activeSkill === a)!

    it('has 18 groups and 21 rows, Storm Wave at the code’s 186,706', () => {
      expect(oracle.groups).toBe(18)
      expect(oracle.rows).toHaveLength(21)
      expect(row(15)).toMatchObject({ skill: 'Storm Wave' })
      expect(Math.round(row(15).TotalDPS!)).toBe(186706)
    })

    it('matches what poe.ninja showed for the other skills (Hollow Resonance 67k, Tempest Bell 47k, Whirling Assault 66k)', () => {
      expect(Math.round(row(4).CombinedDPS! / 1000)).toBe(67)
      expect(Math.round(row(6).CombinedDPS! / 1000)).toBe(47)
      expect(Math.round(row(10).CombinedDPS! / 1000)).toBe(66)
    })
  })
})
