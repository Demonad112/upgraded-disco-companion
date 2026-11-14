import { describe, expect, it } from 'vitest'
import robots from '../src/app/robots'

describe('robots', () => {
  const r = robots()

  it('allows all crawlers', () => {
    expect(r.rules).toEqual({ userAgent: '*', allow: '/' })
  })

  it('points at the absolute sitemap URL', () => {
    expect(r.sitemap).toMatch(/^https?:\/\/[^/]+(\/[^/]+)*\/sitemap\.xml$/)
  })
})
