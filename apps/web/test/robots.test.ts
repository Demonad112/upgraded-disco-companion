import { describe, expect, it } from 'vitest'
import robots from '../src/app/robots'
import sitemap from '../src/app/sitemap'

describe('robots', () => {
  const r = robots()

  it('allows all crawlers', () => {
    expect(r.rules).toEqual({ userAgent: '*', allow: '/' })
  })

  it('points at an absolute sitemap.xml on the same origin as the sitemap URLs', () => {
    expect(r.sitemap).toMatch(/^https?:\/\/[^/]+(\/[^/]+)*\/sitemap\.xml$/)
    const origin = new URL(sitemap()[0].url).origin
    expect(new URL(r.sitemap as string).origin).toBe(origin)
  })
})
