import { describe, expect, it } from 'vitest'
import type { Recommendation, RecommendationReport } from '@poe2/core'
import { URL_MAX_LENGTH } from '@poe2/core'
import { readFileSync } from 'node:fs'
import { analyzeCharacter } from '@poe2/core'
import { fixAnchor, fixLines, splitAction, topFixes, tradeLinkFor, tradeStatFor } from '@/components/character/topFixesData'

const rec = (over: Partial<Recommendation>): Recommendation =>
  ({ id: 'x', category: 'gear', action: 'Do it', impact: null, ...over }) as Recommendation

describe('top fixes', () => {
  it('takes the first three actionable findings', () => {
    const report = {
      recommendations: [
        rec({ id: 'q', category: 'question' }),
        rec({ id: 'a' }),
        rec({ id: 'b' }),
        rec({ id: 'c' }),
        rec({ id: 'd' }),
      ],
    } as RecommendationReport
    expect(topFixes(report).map((r) => r.id)).toEqual(['a', 'b', 'c'])
  })

  it('splits an action at its dash into a lead and a detail line', () => {
    expect(splitAction('Upgrade your weapon — Rust Mace is item level 40, 30 below your other gear.')).toEqual({
      lead: 'Upgrade your weapon',
      detail: 'Rust Mace is item level 40, 30 below your other gear.',
    })
    expect(splitAction('Anoint the amulet.')).toEqual({ lead: 'Anoint the amulet.', detail: null })
  })

  it('points Details at the section that holds the panel', () => {
    expect(fixAnchor({ category: 'survivability' })).toBe('#defences')
    expect(fixAnchor({ category: 'damage' })).toBe('#damage')
    expect(fixAnchor({ category: 'gear' })).toBe('#gear')
    expect(fixAnchor({ category: 'efficiency' })).toBe('#findings')
  })

  it('builds a trade2 ?q= search for a resistance shortfall only', () => {
    const chaos = rec({ impact: { stat: 'chaosResistance', label: 'Chaos', from: 18, to: 75, delta: 57, unit: 'percent', significance: 1 } })
    expect(tradeStatFor(chaos)).toEqual({ statId: 'base_chaos_damage_resistance_%', min: 47 }) // capped at the best single roll
    const fire = rec({ impact: { stat: 'fireResistance', label: 'Fire', from: 60, to: 75, delta: 14.2, unit: 'percent', significance: 1 } })
    expect(tradeStatFor(fire)?.min).toBe(15)
    const url = tradeLinkFor(chaos, { 'base_chaos_damage_resistance_%': 'explicit.stat_1' }, 'Runes of Aldur')
    expect(url).toMatch(/^https:\/\/www\.pathofexile\.com\/trade2\/search\/poe2\/Runes%20of%20Aldur\?q=/)
    const q = JSON.parse(decodeURIComponent(url!.split('?q=')[1]!))
    expect(q.query.stats[0].filters).toEqual([{ id: 'explicit.stat_1', value: { min: 47 }, disabled: false }])
    // No trade id for the stat, or not a resistance: no search, the button falls back to /trade.
    expect(tradeLinkFor(chaos, {}, 'L')).toBeNull()
    expect(tradeLinkFor(rec({ impact: { stat: 'armour', label: 'Armour', from: 1, to: 2, delta: 1, unit: 'flat', significance: 1 } }), {}, 'L')).toBeNull()
  })

  it('returns null (button falls back to /trade) when the link would pass URL_MAX_LENGTH', () => {
    const chaos = rec({ impact: { stat: 'chaosResistance', label: 'Chaos', from: 18, to: 75, delta: 57, unit: 'percent', significance: 1 } })
    const map = { 'base_chaos_damage_resistance_%': 'explicit.stat_1' }
    expect(tradeLinkFor(chaos, map, 'L')).not.toBeNull()
    expect(tradeLinkFor(chaos, map, 'x'.repeat(URL_MAX_LENGTH))).toBeNull()
  })

  it('default rows carry a lead and one gain line; the detail sentence is whole and Pro-only', async () => {
    for (const name of ['yykiuy-v51', 'athrynas-v43']) {
      const payload = JSON.parse(readFileSync(new URL(`../../../packages/core/test/fixtures/${name}.json`, import.meta.url), 'utf8'))
      const fixes = topFixes((await analyzeCharacter(payload)).recommendations)
      expect(fixes.length, name).toBeGreaterThan(0)
      for (const f of fixes) {
        const plain = fixLines(f, false)
        const pro = fixLines(f, true)
        const { lead, detail } = splitAction(f.action)
        expect(plain.detail, `${name} ${f.id}`).toBeNull()
        expect(plain.lead).toBe(lead)
        expect(plain.lead.length, plain.lead).toBeLessThanOrEqual(60)
        expect(plain.lead).not.toMatch(/…|\.\.\.$/)
        expect(plain.gain, f.id).toBe(pro.gain)
        if (f.impact) expect(plain.gain!.length, plain.gain!).toBeLessThanOrEqual(80)
        expect(plain.gain ?? '').not.toMatch(/…|\.\.\.$/)
        expect(pro.detail).toBe(detail) // full, untruncated
      }
    }
  })
})
