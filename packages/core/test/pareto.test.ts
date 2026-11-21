/** Pareto cost-vs-gain view (GF1 plan item 6): a view beside rank.ts, never a reorder. */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { analyzeCharacter } from '../src/analyze.js'
import { paretoView } from '../src/recommend/pareto.js'
import type { CostKind, Recommendation } from '../src/recommend/types.js'

const rec = (id: string, kind: CostKind, amount: number, grade: number | null): Recommendation =>
  ({ id, cost: { kind, amount, detail: '' }, measured: { grade, lowestMaxHit: null, dps: null } }) as unknown as Recommendation

describe('paretoView', () => {
  it('drops a finding that another beats on both cost and gain, and keeps rank order', () => {
    const v = paretoView([rec('cheap-big', 'free', 1, 0.3), rec('costly-small', 'currency', 2, 0.1), rec('costly-bigger', 'currency', 3, 0.5)])
    expect(v.frontier.map((p) => p.rec.id)).toEqual(['cheap-big', 'costly-bigger'])
    expect(v.dominated).toEqual([{ point: expect.objectContaining({ rec: expect.objectContaining({ id: 'costly-small' }) }), by: 'cheap-big' }])
  })

  it('keeps equal cost and equal gain on the frontier (nothing strictly better)', () => {
    const v = paretoView([rec('a', 'gear', 1, 0.2), rec('b', 'gear', 1, 0.2)])
    expect(v.frontier.map((p) => p.rec.id)).toEqual(['a', 'b'])
  })

  it('never places unknown cost or unmeasured gain, and never lets them beat anything', () => {
    const v = paretoView([rec('free-unmeasured', 'free', 1, null), rec('unknown-cost', 'unknown', 0, 9), rec('plain', 'currency', 2, 0.05)])
    expect(v.unplaced.map((u) => [u.point.rec.id, u.reason, u.point.gainLabel])).toEqual([
      ['free-unmeasured', 'gain not measured', 'missing'],
      ['unknown-cost', 'cost unknown', 'exact'],
    ])
    expect(v.frontier.map((p) => p.rec.id)).toEqual(['plain'])
    expect(v.dominated).toEqual([])
  })

  it('leaves the engine order alone on the recorded character', async () => {
    const here = dirname(fileURLToPath(import.meta.url))
    const payload = JSON.parse(readFileSync(join(here, 'fixtures', 'athrynas-v43.json'), 'utf8'))
    const recs = (await analyzeCharacter(payload)).recommendations.recommendations
    const before = recs.map((r) => r.id)
    const v = paretoView(recs)
    expect(recs.map((r) => r.id)).toEqual(before)
    const all = [...v.frontier.map((p) => p.rec.id), ...v.dominated.map((d) => d.point.rec.id), ...v.unplaced.map((u) => u.point.rec.id)]
    expect(all.sort()).toEqual([...before].sort())
    const order = (ids: string[]) => ids.map((id) => before.indexOf(id))
    expect(order(v.frontier.map((p) => p.rec.id))).toEqual([...order(v.frontier.map((p) => p.rec.id))].sort((a, b) => a - b))
  })
})
