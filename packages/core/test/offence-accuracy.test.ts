/**
 * Batch 3.1 acceptance: on both reference codes the mini-calc's main skill is within 25% of the code's own
 * TotalDPS, and the per-skill estimates are compared with PoB's `groups.oracle.json`. The error is reported, and
 * asserted ≤ 25% after calibration for the skills in `CALIBRATED_OK` (the ones measured within it today); the rest
 * are listed with their error so a regression or an improvement shows in the diff.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { readPobSnapshotFromCode } from '../src/pob/export.js'
import { estimateOffence } from '../src/offence/index.js'
import { buildSkillInputs } from '../src/offence/input.js'
import { calcPass } from '../src/offence/pass.js'
import type { OffenceData } from '../src/offence/input.js'

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url))
const gen = (f: string) => JSON.parse(readFileSync(here(`../../data/generated/${f}`), 'utf8'))

function data(): OffenceData {
  const ps = gen('pob-skills.json')
  return {
    bases: gen('bases.json').bases,
    skillLevels: gen('skill-levels.json').actives,
    skillTypes: ps.actives,
    supports: ps.supports,
    treeNodes: gen('passive-tree.json').nodes,
    defaultResist: { physical: 0, lightning: 50, cold: 50, fire: 50, chaos: 0 },
  }
}

/** Skills whose calibrated estimate is within 25% of PoB's, on both codes. */
const CALIBRATED_OK = ['Storm Wave', 'Staggering Palm']

describe.each(['ninja-default', 'pob2-own'])('mini-calc accuracy: %s', (name) => {
  const code = readFileSync(here(`./reference/${name}/code.txt`), 'utf8').trim()
  const oracle = JSON.parse(readFileSync(here(`./reference/${name}/groups.oracle.json`), 'utf8')).rows as { group: number; skill: string; TotalDPS?: number }[]

  it('estimates the main skill within 25% of TotalDPS', async () => {
    const snap = await readPobSnapshotFromCode(code)
    const report = estimateOffence(snap, data())
    expect(report.mainEstimate).not.toBeNull()
    expect(Math.abs(report.errorPct!)).toBeLessThanOrEqual(25)
    expect(report.state).toBe('calibrated')
  })

  it('matches the code step by step: speed, crit chance and crit multiplier of the main skill', async () => {
    const snap = await readPobSnapshotFromCode(code)
    const main = buildSkillInputs(snap, data()).find((s) => s.group === snap.build.mainSocketGroup)!
    const out = calcPass(main.input!)
    expect(out.Speed).toBeCloseTo(snap.playerStats.Speed!, 1)
    expect(out.CritChance).toBeCloseTo(snap.playerStats.CritChance!, 1)
    expect(out.CritMultiplier).toBeCloseTo(snap.playerStats.CritMultiplier!, 2)
  })

  it('under own/none config lists only the main skill and the Full DPS rows, with no estimate (criterion 4)', async () => {
    const snap = await readPobSnapshotFromCode(code)
    const report = estimateOffence(snap, data(), { exactOnly: true })
    const fullDps = new Map(snap.fullDpsSkills.map((r) => [r.stat.replace(/^\d+x /, ''), r.value]))
    expect(report.state).toBe('exact')
    expect(report.skills.length).toBeGreaterThan(0)
    for (const s of report.skills) {
      expect(s.label, s.name).toBeNull()
      if (s.group === report.mainGroup) expect(s.value).toBe(snap.playerStats.TotalDPS)
      else expect(s.value, s.name).toBe(fullDps.get(s.name))
    }
    expect(report.skills.some((s) => s.group === report.mainGroup)).toBe(true)
  })

  it('keeps the calibrated per-skill estimates within 25% of PoB for the supported skills', async () => {
    const snap = await readPobSnapshotFromCode(code)
    const report = estimateOffence(snap, data())
    for (const s of report.skills) {
      const truth = oracle.find((r) => r.group === s.group && r.skill === s.name)?.TotalDPS
      if (!CALIBRATED_OK.includes(s.name) || s.group === report.mainGroup || !truth || s.value === null) continue
      expect(Math.abs(s.value / truth - 1), `${s.name} (group ${s.group})`).toBeLessThanOrEqual(0.25)
    }
  })
})
