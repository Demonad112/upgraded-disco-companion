/**
 * The owner's PoB2 0.23.1 app screenshots (`reference/ninja-default/app.expected.json`) against the code itself:
 * every sidebar figure the code also carries as a PlayerStat matches within display rounding. The code is the
 * authority; the screenshots are the next one down and must agree with it.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { readPobSnapshotFromCode } from '../src/pob/export.js'
import { readPobConfig } from '../src/pob/config.js'

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url))
const app = JSON.parse(readFileSync(here('./reference/ninja-default/app.expected.json'), 'utf8')) as {
  sidebar: Record<string, number>
  maximumHitTaken: Record<string, number>
  configuration: { enemyStats: { enemyIsBoss: string }; forEffectiveDps: Record<string, unknown>; whenInCombat: Record<string, unknown> }
}
const snap = await readPobSnapshotFromCode(readFileSync(here('./reference/ninja-default/code.txt'), 'utf8'))

/** One unit of the last digit the screenshot shows: PoB rounds or floors to it. */
const unit = (shown: number) => {
  const decimals = (String(shown).split('.')[1] ?? '').length
  return 10 ** -decimals
}

describe('ninja-default: app screenshots agree with the code', () => {
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
    const on = (k: string) => app.configuration.forEffectiveDps[k] === true || app.configuration.whenInCombat[k] === true
    const conditions: Record<string, string> = {
      enemyBleeding: 'enemy is bleeding', enemyChilled: 'enemy is chilled', enemyDazed: 'enemy is dazed', enemyIgnited: 'enemy is ignited',
      beenHitRecently: 'you have been hit recently', critRecently: 'you have crit recently',
    }
    for (const [k, label] of Object.entries(conditions)) expect(config.conditionals.includes(label), k).toBe(on(k))
  })
})
