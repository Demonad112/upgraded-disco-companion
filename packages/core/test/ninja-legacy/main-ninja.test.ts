/**
 * NJ-1: the poe.ninja-origin code of the owner's main character, `main-ninja.code.txt`
 * (the build as poe.ninja applied it), characterised on its own and against the owner's
 * own export of the same build (`pob2/forbidden-rites/main.code.txt`).
 *
 * The code is untrusted data: decoded and read, never executed. The figures are pinned as
 * recorded in that code, not as current for any league. It runs as `source: 'pob-export'`;
 * its origin (poe.ninja) is not a core concept.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { analyzeCharacter } from '../../src/analyze.js'
import { decodePobExport, readPlayerStats } from '../../src/pob/export.js'
import { pobToCharModel } from '../../src/pob/to-model.js'
import { reconcile } from '../../src/reconcile/index.js'
import type { CharModel } from '../../src/model/types.js'

const read = (p: string) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8').trim()
const ninjaCode = read('./main-ninja.code.txt')
const mainCode = read('../pob2/forbidden-rites/main.code.txt')

describe('the poe.ninja code as recorded', () => {
  it('reads the embedded PlayerStats', async () => {
    const xml = await decodePobExport(ninjaCode)
    expect(xml.length).toBe(52823)
    const stats = readPlayerStats(xml)
    expect(Object.keys(stats)).toHaveLength(107)
    expect(stats).toMatchObject({
      Life: 1494,
      EnergyShield: 2827,
      Mana: 790,
      Spirit: 147,
      FireMaximumHitTaken: 18482,
      ChaosMaximumHitTaken: 8003,
    })
    expect(stats.TotalDPS).toBeCloseTo(98589.73, 2)
    expect(stats.TotalEHP).toBeCloseTo(20451.92, 2)
  })

  it('runs as a pob-export analysis with the stated source gaps and a stable projection', async () => {
    const a = await analyzeCharacter((await pobToCharModel(ninjaCode)) as unknown as Record<string, unknown>, { source: 'pob-export' })
    expect(a.source).toBe('pob-export')
    expect(a.sourceGaps.map((g) => g.what)).toEqual([
      'Per-skill damage',
      'Stat attribution — which item or passive grants each point',
      'Ward',
      'Block chance',
    ])
    const out = {
      source: a.source,
      sourceGaps: a.sourceGaps,
      identity: a.identity,
      defence: {
        life: a.defense.life,
        energyShield: a.defense.energyShield,
        lowestMaximumHit: a.defense.lowestMaximumHit,
        lowestMaximumHitType: a.defense.lowestMaximumHitType,
        maxHits: a.defense.maxHits.map((m) => ({ type: m.type, value: m.value })),
        resistances: a.defense.resistances.map((r) => ({ type: r.type, value: r.value, max: r.max, overCap: r.overCap, underCap: r.underCap })),
      },
      primarySkill: a.dps.primary ? { name: a.dps.primary.name, totalDps: a.dps.primary.totalDps } : null,
      assessment: {
        score: a.assessment.score,
        scoreRange: a.assessment.scoreRange,
        tier: a.assessment.tier,
        weaknesses: a.assessment.weaknesses.map((w) => `${w.severity}: ${w.text}`),
      },
      warnings: a.warnings,
    }
    await expect(`${JSON.stringify(out, null, 2)}\n`).toMatchFileSnapshot('./golden/main-ninja.expected.json')
  })
})

describe('two sources, one character: reconcile(main, poe.ninja code)', () => {
  it('pins the Life / ES / TotalDPS / TotalEHP deltas', async () => {
    const ninja = readPlayerStats(await decodePobExport(ninjaCode))
    const main = readPlayerStats(await decodePobExport(mainCode))
    const model = (await pobToCharModel(mainCode)) as unknown as CharModel
    const report = reconcile(model, ninja)
    const by = (stat: string) => report.checks.find((c) => c.stat === stat || c.stat.startsWith(stat))!

    // `ninja` side of a check = the main build, `other` = the poe.ninja code.
    expect(by('life')).toMatchObject({ ninja: 1494, other: 1494, severity: 'match' })
    expect(by('energyShield')).toMatchObject({ ninja: 2673, other: 2827, severity: 'major' })
    expect(by('energyShield').other! - by('energyShield').ninja!).toBe(154)
    expect(by('dps:')).toMatchObject({ other: 98589.729976259, severity: 'major' })
    expect(by('dps:').other! - by('dps:').ninja!).toBeCloseTo(-27068.45, 1)

    // reconcile has no TotalEHP check; the delta comes straight from the two exports.
    expect(main.TotalEHP).toBeCloseTo(18872.80984258, 5)
    expect(ninja.TotalEHP! - main.TotalEHP!).toBeCloseTo(1579.115067374, 4)
  })
})
