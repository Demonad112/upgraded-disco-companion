/**
 * The owner's PoB2 0.23.1 app screenshots (`reference/<name>/app.expected.json`) against the code itself: every
 * sidebar figure the code also carries as a PlayerStat matches within display rounding, and every other skill the
 * owner selected in the Calcs tab matches the groups oracle (headless PoB with that group selected). The code is
 * the authority; the screenshots are the next one down and must agree with it.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { readPobSnapshotFromCode } from '../src/pob/export.js'
import { readPobConfig } from '../src/pob/config.js'

interface App {
  sidebar: Record<string, number>
  maximumHitTaken: Record<string, number>
  otherSkills?: Record<string, { group: number; sidebar: Record<string, number> }>
  configuration: {
    general: Record<string, unknown>
    enemyStats: { enemyIsBoss: string }
    forEffectiveDps: Record<string, unknown>
    whenInCombat: Record<string, unknown>
  }
}
interface GroupRow { group: number; activeSkill: number; skill: string; [stat: string]: unknown }

const root = fileURLToPath(new URL('./reference/', import.meta.url))
const refs = readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(`${root}${d.name}/app.expected.json`))
  .map((d) => d.name)

/** One unit of the last digit the screenshot shows: PoB rounds or floors to it. */
const unit = (shown: number) => {
  const decimals = (String(shown).split('.')[1] ?? '').length
  return 10 ** -decimals
}

/** Config tab checkboxes and the label `readPobConfig` gives the condition each one saves. */
const CONDITIONS: Record<string, string> = {
  enemyBleeding: 'enemy is bleeding',
  enemyChilled: 'enemy is chilled',
  enemyDazed: 'enemy is dazed',
  enemyIgnited: 'enemy is ignited',
  enemyShocked: 'enemy is shocked',
  beenHitRecently: 'you have been hit recently',
  critRecently: 'you have crit recently',
  critInPast8s: 'you have crit in the past 8 seconds',
  nonCritRecently: 'you have dealt a non-crit recently',
  killedShockedEnemyInLast3s: 'you killed a shocked enemy in the last 3 seconds',
  chilledRecently: 'you have chilled an enemy recently',
  shockedRecently: 'you have shocked an enemy recently',
  alwaysEnergyShield: 'you always have energy shield',
}

it('has both reference codes with app screenshots', () => {
  expect(refs).toEqual(expect.arrayContaining(['ninja-default', 'pob2-own']))
})

for (const name of refs) {
  describe(`${name}: app screenshots agree with the code`, async () => {
    const app = JSON.parse(readFileSync(`${root}${name}/app.expected.json`, 'utf8')) as App
    const snap = await readPobSnapshotFromCode(readFileSync(`${root}${name}/code.txt`, 'utf8'))
    const carried = Object.keys(app.sidebar).filter((k) => k in snap.playerStats)

    it('covers the headline stats', () => {
      for (const k of ['TotalDPS', 'CombinedDPS', 'AverageDamage', 'TotalEHP', 'Life', 'EnergyShield', 'PhysicalMaximumHitTaken']) expect(carried).toContain(k)
    })

    for (const k of carried) {
      it(k, () => {
        const shown = app.sidebar[k]!
        expect(Math.abs(snap.playerStats[k]! - shown), `${k}: code ${snap.playerStats[k]}, app ${shown}`).toBeLessThanOrEqual(unit(shown) + 1e-9)
      })
    }

    it('max hits by type', () => {
      for (const [type, shown] of Object.entries(app.maximumHitTaken)) {
        const key = `${type[0]!.toUpperCase()}${type.slice(1)}MaximumHitTaken`
        expect(snap.playerStats[key], key).toBe(shown)
      }
    })

    it('the config the code saved is the config the app shows', () => {
      const config = readPobConfig(snap)
      expect(app.configuration.enemyStats.enemyIsBoss).toBe('Guardian/Pinnacle Boss')
      expect(config.boss).toBe('Pinnacle')
      const { general, forEffectiveDps, whenInCombat } = app.configuration
      const on = (k: string) => general[k] === true || forEffectiveDps[k] === true || whenInCombat[k] === true
      for (const [k, label] of Object.entries(CONDITIONS)) expect(config.conditionals.includes(label), k).toBe(on(k))
    })

    for (const [skill, shot] of Object.entries(app.otherSkills ?? {})) {
      it(`${skill} (group ${shot.group}) matches PoB with that group selected`, () => {
        const oracle = JSON.parse(readFileSync(`${root}${name}/groups.oracle.json`, 'utf8')) as { rows: GroupRow[] }
        const row = oracle.rows.find((r) => r.group === shot.group && r.activeSkill === 1)!
        expect(row.skill).toBe(skill)
        for (const [k, shown] of Object.entries(shot.sidebar)) {
          expect(Math.abs((row[k] as number) - shown), `${k}: oracle ${row[k]}, app ${shown}`).toBeLessThanOrEqual(unit(shown) + 1e-9)
        }
        // Its Full DPS row is the same PoB number the oracle computed.
        const full = snap.fullDpsSkills.find((r) => r.stat === skill)
        if (full) expect(full.value).toBeCloseTo(row.TotalDPS as number, 3)
      })
    }
  })
}
