import { describe, expect, it } from 'vitest'
import { TAB_IDS, hashId, tabForHash, targetForHash } from '@/lib/characterTab'

describe('character tab hash', () => {
  it('opens Overview with no hash or an unknown one', () => {
    expect(tabForHash('')).toBe('overview')
    expect(tabForHash('#nope')).toBe('overview')
  })
  it('maps every tab id to itself', () => {
    for (const id of TAB_IDS) expect(tabForHash(`#${id}`)).toBe(id)
  })
  it('keeps the old deep links working', () => {
    expect(tabForHash('#findings')).toBe('overview')
    expect(tabForHash('#headroom')).toBe('defences')
    expect(tabForHash('#damage-review')).toBe('damage')
    expect(tabForHash('#progress-history')).toBe('progress')
    expect(tabForHash('#compare')).toBe('progress')
    expect(tabForHash('#advanced-fold')).toBe('advanced')
    for (const id of ['detail-checks', 'checks-list', 'character-notes', 'passive-tree', 'reconciliation', 'attribution'])
      expect(tabForHash(`#${id}`)).toBe('advanced')
  })
  it('scrolls to an alias but not to a tab id', () => {
    expect(targetForHash('#headroom')).toBe('headroom')
    expect(targetForHash('#gear')).toBeNull()
    expect(targetForHash('')).toBeNull()
  })
  it('survives a malformed escape', () => {
    expect(hashId('#%E0%A4%A')).toBe('%E0%A4%A')
  })
})
