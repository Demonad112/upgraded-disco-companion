import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ICON_NAMES, ICON_PATHS, IconPlate, MapIcon } from '@/components/icons'

describe('IMG-2 icon set', () => {
  it('has the twelve icons the brief names', () => {
    expect(ICON_NAMES).toEqual([
      'waystone', 'map-boss', 'atlas-node', 'tablet', 'breach', 'ritual',
      'expedition', 'delirium', 'abyss', 'essence', 'shrine', 'trade',
    ])
  })

  it.each(ICON_NAMES)('%s is straight square-capped lines only', (name) => {
    // Move, line, horizontal, vertical and close only: no curves or arcs, so nothing reads as rounded.
    expect(ICON_PATHS[name]).toMatch(/^[MLHVZ0-9. ]+$/)
    const html = renderToStaticMarkup(createElement(MapIcon, { name }))
    expect(html).toContain('stroke-width="1.3"')
    expect(html).toContain('stroke-linecap="square"')
    expect(html).toContain('aria-hidden="true"')
    expect(html).not.toMatch(/#[0-9a-f]{3,8}\b/i)
  })

  it('names a standalone icon for screen readers', () => {
    const html = renderToStaticMarkup(createElement(MapIcon, { name: 'trade', label: 'Trade' }))
    expect(html).toContain('role="img"')
    expect(html).toContain('aria-label="Trade"')
  })

  it('seats an icon on the engraved plate from tokens', () => {
    const html = renderToStaticMarkup(createElement(IconPlate, { name: 'abyss' }))
    expect(html).toContain('var(--metal-hi)')
    expect(html).toContain('var(--well)')
    expect(html).not.toMatch(/#[0-9a-f]{3,8}\b/i)
  })
})
