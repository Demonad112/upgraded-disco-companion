import { describe, expect, it } from 'vitest'
import { pageMeta } from '../src/lib/pageMeta'

describe('pageMeta', () => {
  const m = pageMeta('Atlas Tree Planner', 'Which Atlas nodes to take, in order.')

  it('builds the suffixed title and keeps the description', () => {
    expect(m.title).toBe('Atlas Tree Planner — PoE2 Endgame Companion')
    expect(m.description).toBe('Which Atlas nodes to take, in order.')
  })

  it('restates Open Graph and Twitter fields with the page title and the share image', () => {
    expect(m.openGraph).toMatchObject({ type: 'website', siteName: 'PoE2 Endgame Companion', title: m.title, description: m.description })
    expect(JSON.stringify(m.openGraph?.images)).toContain('og-cover.jpg')
    expect(m.twitter).toMatchObject({ card: 'summary_large_image', title: m.title, description: m.description })
  })
})
