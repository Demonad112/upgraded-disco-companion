import { describe, expect, it } from 'vitest'
import { companionLines, restingPose } from '@/lib/companion'
import { companionSeed } from '@/lib/companionSeed'

const seed = companionSeed()
const allIds = seed.steps.map((s) => s.id)

describe('companion lines', () => {
  it('points at the first unticked step, like the Up next card', () => {
    const [first] = companionLines(seed, [seed.steps[0].id], null, '/')
    expect(first.tool).toBe('checklist')
    expect(first.text).toContain(seed.steps[1].title)
    expect(first.href).toBe(`/checklist/#${seed.steps[1].id}`)
  })

  it('says the checklist is complete when every step is ticked', () => {
    expect(companionLines(seed, allIds, null, '/')[0].text).toMatch(/^Checklist complete/)
  })

  it('re-opens a recent character, else asks for an import', () => {
    const none = companionLines(seed, [], null, '/').find((l) => l.tool === 'character')!
    expect(none.href).toBe('/character/')
    const recent = companionLines(seed, [], { name: 'Athrynas', href: '/character/?import=x' }, '/').find((l) => l.tool === 'character')!
    expect(recent.text).toContain('Athrynas')
    expect(recent.href).toBe('/character/?import=x')
  })

  it("uses the first quick pick's own words", () => {
    const farm = companionLines(seed, [], null, '/').find((l) => l.tool === 'farm')!
    expect(farm.text).toContain(seed.pick!.name)
    expect(farm.text).toContain(seed.pick!.line)
    expect(farm.href).toBe(`/dashboard/#quick-${seed.pick!.id}`)
  })

  it("leads with the current tool's line", () => {
    expect(companionLines(seed, [], null, '/dashboard/').map((l) => l.tool)).toEqual(['farm', 'checklist', 'character'])
    expect(companionLines(seed, [], null, '/').map((l) => l.tool)).toEqual(['checklist', 'character', 'farm'])
  })

  it('keeps every line within the caddy cap (docs/COPY.md)', () => {
    for (const ids of [[], allIds]) {
      for (const l of companionLines(seed, ids, { name: 'A'.repeat(24), href: '/' }, '/')) {
        expect(l.text.length, l.text).toBeLessThanOrEqual(140)
      }
    }
  })

  it('sleeps only when there is nothing left to point at', () => {
    expect(restingPose(seed, allIds, false)).toBe('asleep')
    expect(restingPose(seed, allIds, true)).toBe('idle')
    expect(restingPose(seed, [], false)).toBe('idle')
  })
})
