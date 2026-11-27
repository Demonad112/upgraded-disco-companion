import { describe, expect, it } from 'vitest'
import { benchmarkGates } from '../src/data/benchmarks'
import {
  acceptTargets,
  DEFAULT_TARGETS,
  DEFAULT_TARGETS_SOURCE,
  newTarget,
  patchTarget,
  removeTarget,
} from '../src/lib/targets'

describe('default targets', () => {
  it('take only the numbers the pinnacle benchmark states', () => {
    const label = benchmarkGates.find((g) => g.id === DEFAULT_TARGETS_SOURCE)!.label
    expect(label).toMatch(/5,000\+ life/)
    expect(label).toMatch(/80%\+ resistances/)
    expect(DEFAULT_TARGETS.map((t) => [t.stat, t.want])).toEqual([
      ['life', 5000],
      ['fireRes', 80],
      ['coldRes', 80],
      ['lightningRes', 80],
    ])
  })

  it('are a valid stored list', () => {
    expect(acceptTargets(DEFAULT_TARGETS)).toBe(true)
    expect(acceptTargets([{ id: 'x', stat: 'life', op: '>=', want: 'max' }])).toBe(false)
    expect(acceptTargets({})).toBe(false)
  })
})

describe('editing targets', () => {
  it('starts a resistance at its max and gives each a fresh id', () => {
    const a = newTarget('chaosRes')
    const b = newTarget('life')
    expect(a.want).toBe('max')
    expect(b.want).toBe(0)
    expect(a.id).not.toBe(b.id)
  })

  it('drops "max" when the stat changes to one without a cap', () => {
    const list = [{ id: 'x', stat: 'fireRes', op: '>=', want: 'max' }] as const
    expect(patchTarget(list, 'x', { stat: 'life' })[0]).toMatchObject({ stat: 'life', want: 0 })
    expect(patchTarget(list, 'x', { stat: 'coldRes' })[0]).toMatchObject({ want: 'max' })
    expect(removeTarget(list, 'x')).toEqual([])
  })
})
