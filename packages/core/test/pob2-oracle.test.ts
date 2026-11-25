/**
 * The oracle is a CI guard: headless PoB2 (`npm run pob2:oracle`, CI job `pob2-oracle`) must reproduce the
 * reference code's own numbers. The code is the source of truth; a miss means our engine pin or runner is wrong.
 *
 * `test/reference/<name>/oracle.json` holds what headless PoB computes for `code.txt`. No Lua runs here.
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { decodePobExport } from '../src/pob/export.js'
import { readPobSnapshot } from '../src/pob/snapshot.js'

interface Oracle {
  pinCommit: string
  loadError: string | null
  fullDpsSkills: { name: string; count: number; dps: number }[]
  export: { PlayerStat: Record<string, number | string>; MinionStat: Record<string, number | string>; FullDPSSkill: { stat: string; value: number | string }[] }
}

const root = fileURLToPath(new URL('./reference/', import.meta.url))
const pin = JSON.parse(readFileSync(fileURLToPath(new URL('../../../vendor/pob2/PIN.json', import.meta.url)), 'utf8')) as { commit: string }
const refs = readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(`${root}${d.name}/code.txt`))
  .map((d) => d.name)

const num = (v: number | string) => (typeof v === 'number' ? v : v === 'inf' ? Infinity : v === '-inf' ? -Infinity : Number(v))

describe('PoB2 oracle reproduces the reference codes', () => {
  it('has at least one reference code', () => {
    expect(refs).toContain('ninja-default')
  })

  for (const name of refs) {
    describe(name, async () => {
      const dir = `${root}${name}/`
      const xml = await decodePobExport(readFileSync(`${dir}code.txt`, 'utf8'))
      const snap = readPobSnapshot(xml)
      const oracle = JSON.parse(readFileSync(`${dir}oracle.json`, 'utf8')) as Oracle

      it('was made by PoB at the pinned commit and loaded', () => {
        expect(oracle.loadError).toBeNull()
        expect(oracle.pinCommit).toBe(pin.commit)
      })

      it('reads every PlayerStat, FullDPSSkill and MinionStat row the code carries', () => {
        expect(Object.keys(snap.playerStats)).toHaveLength(new Set([...xml.matchAll(/<PlayerStat stat="([^"]+)"/g)].map((m) => m[1])).size)
        expect(snap.fullDpsSkills).toHaveLength([...xml.matchAll(/<FullDPSSkill\b/g)].length)
        expect(Object.keys(snap.minionStats)).toHaveLength([...xml.matchAll(/<MinionStat\b/g)].length)
      })

      it('equals the code for every PlayerStat the code carries (the code is never "stale")', () => {
        const fresh = oracle.export.PlayerStat
        for (const [k, v] of Object.entries(snap.playerStats)) {
          expect(k in fresh, k).toBe(true)
          expect(num(fresh[k]!), k).toBeCloseTo(v, 6)
        }
        for (const [k, v] of Object.entries(snap.minionStats)) expect(num(oracle.export.MinionStat[k]!), `Minion ${k}`).toBeCloseTo(v, 6)
      })

      it('writes the same FullDPS rows as the code', () => {
        expect(snap.fullDpsSkills.map((r) => r.stat)).toEqual(oracle.export.FullDPSSkill.map((r) => r.stat))
      })
    })
  }
})
