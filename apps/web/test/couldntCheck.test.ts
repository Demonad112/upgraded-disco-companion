/**
 * HG1-9: everything the analysis could not check sits in one panel, once each.
 * The tree-version and keystone warnings are shown from their structured
 * fields, so their free-text copies in `warnings` are not repeated.
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { NO_KEYSTONE_EFFECTS, type Analysis } from '@poe2/core'
import { couldntCheck } from '@/lib/couldntCheck'
import { CouldntCheck } from '@/components/character/CouldntCheck'
import { PersistedStateProvider } from '@/hooks/usePersistedState'

const base = {
  warnings: [] as string[],
  keystones: NO_KEYSTONE_EFFECTS,
  treeCheck: { status: 'current', treeName: 'PassiveTree-0.5', missing: [] as number[] },
} as unknown as Analysis

const stale = {
  ...base,
  treeCheck: { status: 'stale', treeName: 'PassiveTree-0.5', missing: [1, 2, 3] },
  keystones: {
    ...NO_KEYSTONE_EFFECTS,
    unverified: [{ keystone: 'Iron Reflexes', kind: 'unconfirmed', reason: 'evasion rating is not reported, so its effect cannot be confirmed' }],
  },
  warnings: [
    '3 allocated passive nodes (id 1, 2, 3) are not in this tree data (PassiveTree-0.5). Their effects are not read.',
    'Iron Reflexes is allocated on the passive tree, but evasion rating is not reported. Its corrections were not applied.',
    'The attached Path of Building export could not be decoded (bad), so poe.ninja’s numbers could not be cross-checked.',
  ],
} as unknown as Analysis

describe('couldntCheck', () => {
  it('is empty when everything was checked', () => {
    expect(couldntCheck(base)).toEqual([])
    expect(renderToStaticMarkup(createElement(CouldntCheck, { analysis: base }))).toBe('')
  })

  it('lists the stale tree, each unchecked keystone and other warnings once', () => {
    const items = couldntCheck(stale)
    expect(items).toHaveLength(3)
    expect(items[0]!.text).toMatch(/3 passive nodes .*\(PassiveTree-0\.5\)/)
    expect(items.filter((i) => i.text.includes('Iron Reflexes'))).toHaveLength(1)
    expect(items.some((i) => i.text.includes('could not be decoded'))).toBe(true)
  })

  it('renders as one panel titled "What we couldn’t check", one line with the list behind Pro detail', () => {
    const html = renderToStaticMarkup(createElement(PersistedStateProvider, null, createElement(CouldntCheck, { analysis: stale })))
    expect(html.match(/<aside/g)).toHaveLength(1)
    expect(html).toContain('What we couldn’t check')
    expect(html).not.toContain('<ul')
  })
})
