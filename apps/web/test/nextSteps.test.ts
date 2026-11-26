import { describe, expect, it } from 'vitest'
import { damageLever, findingForStep, stepAnchor } from '@/components/character/topFixesData'

const rec = (o: object) => ({ id: 'x', category: 'survivability', action: 'Cap fire — more life', ...o }) as never
const report = (recommendations: object[]) => ({ recommendations }) as never

describe('next-step helpers', () => {
  it('sends each area to its tab and the all-clear nowhere', () => {
    expect(stepAnchor({ area: 'defence' })).toBe('#defences')
    expect(stepAnchor({ area: 'gear' })).toBe('#gear')
    expect(stepAnchor({ area: 'damage' })).toBe('#damage')
    expect(stepAnchor({ area: 'clear' })).toBeNull()
  })
  it('finds the resistance finding behind a res-gap step, and none for a weak-hit step', () => {
    const fire = rec({ impact: { stat: 'fireResistance', delta: 12, from: 63, to: 75, label: 'Fire' } })
    const r = report([rec({ id: 'other' }), fire])
    expect(findingForStep({ area: 'defence', tip: { kind: 'res-gap', type: 'fire' } }, r)).toBe(fire)
    expect(findingForStep({ area: 'defence', tip: { kind: 'weak-hit', type: 'fire' } }, r)).toBeNull()
    expect(findingForStep({ area: 'gear' }, r)).toBeNull()
  })
  it('names the first damage finding as the lever, or nothing', () => {
    expect(damageLever(report([rec({}), rec({ category: 'damage', action: 'Raise accuracy to 100% — more damage' })]))).toBe('Raise accuracy to 100%')
    expect(damageLever(report([rec({})]))).toBeNull()
  })
})
