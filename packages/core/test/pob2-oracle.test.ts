/**
 * PB-3 oracle test: our `PobSnapshot` reader against what real PoB2 computes for the same code.
 *
 * `test/pob2/<league>/<name>.oracle.json` is written by headless PoB (`npm run pob2:oracle`, CI job
 * `pob2-oracle`); no Lua runs here. Figures read from a code must match PoB, with one exception
 * that is the code's, not ours: an export written by an older PoB embeds older figures. Those are exactly
 * the `staleExport` stats, and every other stat must match PoB's recomputed export exactly.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { analyzeCharacter } from '../src/analyze.js'
import { decodePobExport } from '../src/pob/export.js'
import { readPobSnapshot } from '../src/pob/snapshot.js'
import { staleExport, type PobRecomputed } from '../src/pob/stale.js'
import { pobToCharModel } from '../src/pob/to-model.js'

interface Oracle extends PobRecomputed {
  pinCommit: string
  loadError: string | null
  fullDpsSkills: { name: string; count: number; dps: number }[]
  export: { PlayerStat: Record<string, number | string>; MinionStat: Record<string, number | string>; FullDPSSkill: { stat: string; value: number | string }[] }
}

const root = fileURLToPath(new URL('./pob2/', import.meta.url))
const pin = JSON.parse(readFileSync(fileURLToPath(new URL('../../../vendor/pob2/PIN.json', import.meta.url)), 'utf8')) as { commit: string }

/** Current-league fixtures only: `archive/<league>/` is never regenerated (B7) and is not compared to the pin. */
const fixtures = readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== 'archive')
  .flatMap((d) =>
    readdirSync(`${root}${d.name}`)
      .filter((f) => f.endsWith('.code.txt'))
      .map((f) => ({ league: d.name, name: f.replace(/\.code\.txt$/, ''), dir: `${root}${d.name}/` })),
  )

const num = (v: number | string) => (typeof v === 'number' ? v : v === 'inf' ? Infinity : v === '-inf' ? -Infinity : Number(v))

describe('PoB2 oracle fixtures', () => {
  it('exist for the current league', () => {
    expect(fixtures.length).toBeGreaterThan(0)
  })

  for (const f of fixtures) {
    describe(`${f.league}/${f.name}`, async () => {
      const code = readFileSync(`${f.dir}${f.name}.code.txt`, 'utf8')
      const oraclePath = `${f.dir}${f.name}.oracle.json`
      const oracle = existsSync(oraclePath) ? (JSON.parse(readFileSync(oraclePath, 'utf8')) as Oracle) : null
      const xml = await decodePobExport(code)
      const snap = readPobSnapshot(xml)
      const stale = oracle ? staleExport(snap, oracle) : null
      const staleKeys = new Set(stale?.stats.map((s) => s.stat) ?? [])

      it('has an oracle that PoB loaded at the pinned commit', () => {
        expect(oracle, `run npm run pob2:oracle for ${f.name}`).not.toBeNull()
        expect(oracle!.loadError).toBeNull()
        expect(oracle!.pinCommit).toBe(pin.commit)
      })

      it('reads every PlayerStat, FullDPSSkill and MinionStat row the code carries', () => {
        expect(Object.keys(snap.playerStats)).toHaveLength(new Set([...xml.matchAll(/<PlayerStat stat="([^"]+)"/g)].map((m) => m[1])).size)
        expect(snap.fullDpsSkills).toHaveLength([...xml.matchAll(/<FullDPSSkill\b/g)].length)
        expect(Object.keys(snap.minionStats)).toHaveLength([...xml.matchAll(/<MinionStat\b/g)].length)
      })

      it('equals PoB exactly for every stat PoB still computes the same (the rest is the stale-export finding)', () => {
        const fresh = oracle!.export.PlayerStat
        const same = Object.keys(fresh).filter((k) => !staleKeys.has(k))
        expect(same.length).toBeGreaterThan(0)
        for (const k of same) expect(snap.playerStats[k], k).toBe(num(fresh[k]!))
        // No stat goes unaccounted for: present on one side only is stale too.
        for (const k of Object.keys(snap.playerStats)) expect(k in fresh || staleKeys.has(k), k).toBe(true)
        for (const k of Object.keys(oracle!.export.MinionStat)) expect(snap.minionStats[k], `Minion ${k}`).toBe(num(oracle!.export.MinionStat[k]!))
      })

      it('reads the FullDPS rows PoB writes', () => {
        const rows = oracle!.export.FullDPSSkill.map((r) => r.stat)
        if (!staleKeys.size) expect(snap.fullDpsSkills.map((r) => r.stat)).toEqual(rows)
        // A code's rows are a subset of what PoB can name: every embedded row is a skill PoB still computes.
        const names = new Set(oracle!.fullDpsSkills.map((r) => r.name))
        for (const r of snap.fullDpsSkills) expect(names.has(r.stat.replace(/^\d+(?:\.\d+)?x /, '')), r.stat).toBe(true)
      })

      it('surfaces embedded vs recomputed differences as the stale-export finding', async () => {
        const model = await pobToCharModel(code)
        const a = await analyzeCharacter(model, { source: 'pob-export', pobRecomputed: oracle })
        expect(a.staleExport).toEqual(stale)
        if (stale) expect(a.warnings.some((w) => w.startsWith('Stale export: re-export from current Path of Building.'))).toBe(true)
        const plain = await analyzeCharacter(model, { source: 'pob-export' })
        expect(plain.staleExport).toBeNull()
      })
    })
  }
})
