import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { AWAY_PX, HOP_MS, scrollAwayStep, type ScrollStep } from '../src/lib/companionScroll'

const base: ScrollStep = { phone: true, blocked: false, focused: false, y: 200, dy: 12 }

describe('wraith scroll-away on phones (B1-4)', () => {
  it('slides away when scrolling down past 48 px', () => {
    expect(scrollAwayStep(base)).toBe('away')
    expect(scrollAwayStep({ ...base, y: AWAY_PX })).toBe('wait')
  })

  it('comes back on scroll up, and stays on desktop, while blocked or focused', () => {
    expect(scrollAwayStep({ ...base, dy: -4 })).toBe('show')
    expect(scrollAwayStep({ ...base, phone: false })).toBe('show')
    expect(scrollAwayStep({ ...base, blocked: true })).toBe('show')
    expect(scrollAwayStep({ ...base, focused: true })).toBe('wait')
  })

  it('blocks only for as long as the CSS hop plays, not while a tip is pending', () => {
    const css = readFileSync(join(__dirname, '..', 'src', 'styles', 'companion.css'), 'utf8')
    const m = /animation:\s*wraith-hop\s+([\d.]+)s\s+[\w-]+\s+(\d+)/.exec(css)!
    expect(HOP_MS).toBe(Number(m[1]) * 1000 * Number(m[2]))
    const src = readFileSync(join(__dirname, '..', 'src', 'components', 'companion', 'Companion.tsx'), 'utf8')
    // The pending-hop flag alone must not block; only the HOP_MS window after it starts.
    expect(src).toMatch(/blocked: openRef\.current \|\| performance\.now\(\) < hopUntil\.current/)
    expect(src).not.toMatch(/block\.current = open \|\| hop\b/)
    // The window follows the class the CSS animates (re-armed when the bubble closes) and is off under reduced motion.
    expect(src).toMatch(/hopping \? 'is-hop'/)
    expect(src).toMatch(/hopUntil\.current = hopping && !still/)
    expect(src).toMatch(/\}, \[hopping\]\)/)
  })
})
