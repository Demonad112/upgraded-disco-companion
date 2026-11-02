import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MAPPED_STATS, resolveTradeStatMapFromSnapshot, type Trade2StatsSnapshot } from '@poe2/core'
import { TRADE_LEAGUE } from '../src/lib/constants'

const snapshot = JSON.parse(
  readFileSync(resolve(__dirname, '../../../packages/data/trade2-stats.json'), 'utf8'),
) as Trade2StatsSnapshot

describe('trade data', () => {
  it('parses with a patch and fetchedAt when it has entries', () => {
    expect(Array.isArray(snapshot.entries)).toBe(true)
    if (snapshot.entries.length > 0) {
      expect(snapshot.patch).toBeTruthy()
      expect(snapshot.fetchedAt).toBeTruthy()
    }
  })

  it('resolves every mapped stat to an id with provenance, or null with a reason', () => {
    const rows = resolveTradeStatMapFromSnapshot(snapshot)
    expect(rows).toHaveLength(MAPPED_STATS.length)
    for (const r of rows) {
      if (r.tradeId !== null) {
        expect(r.patch).toBeTruthy()
        expect(r.fetchedAt).toBeTruthy()
        expect(snapshot.entries.some((e) => e.id === r.tradeId)).toBe(true)
      } else {
        expect(r.reason).not.toBeNull()
      }
    }
  })

  it('has a non-empty TRADE_LEAGUE', () => {
    expect(TRADE_LEAGUE.length).toBeGreaterThan(0)
  })
})
