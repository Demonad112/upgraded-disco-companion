/**
 * HG1-9 farm copy: the strategy's own rating is "Farm risk" everywhere, and
 * the methodology documents the Danger formula the planner runs (B2: each stat
 * normalised by its own max roll, shown as Low / Medium / High).
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = (p: string) => readFileSync(fileURLToPath(new URL(`../src/${p}`, import.meta.url)), 'utf8')

describe('farm copy', () => {
  it('labels the strategy rating "Farm risk" on the farm tiles, not "Danger"', () => {
    const decide = src('components/farm/DecideStep.tsx')
    expect(decide).toContain('label="Farm risk" value={s.risk}')
    expect(decide).not.toContain('label="Danger" value={s.risk}')
  })

  it('documents the max-roll danger formula and its bands', () => {
    const page = src('app/methodology/page.tsx')
    expect(page).toMatch(/\['Danger', '[^']*max roll[^']*'\]/)
    expect(page).toMatch(/Low, Medium or High/)
    expect(page).not.toContain('Σ (stat total × the stat’s danger rating)')
  })
})
