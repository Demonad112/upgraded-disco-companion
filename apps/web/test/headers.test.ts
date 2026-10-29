import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PROXY_BASE } from '../src/lib/proxy'

describe('Cloudflare _headers', () => {
  const csp = readFileSync(resolve(__dirname, '../public/_headers'), 'utf8')
    .split('\n')
    .find((l) => l.trim().startsWith('Content-Security-Policy:'))

  const connect = /connect-src ([^;]+)/.exec(csp ?? '')?.[1].split(/\s+/) ?? []

  it('lets the page connect to the import proxy', () => {
    expect(connect).toContain(new URL(PROXY_BASE).origin)
  })

  // Direct-mode chat fetches each provider from the browser (SEC-01). `keyUrl` lines are links, not fetches.
  it('lets the page connect to every chat provider core fetches', () => {
    const origins = readFileSync(resolve(__dirname, '../../../packages/core/src/chat/provider.ts'), 'utf8')
      .split('\n')
      .filter((l) => l.includes('doFetch(') || l.includes('const url ='))
      .flatMap((l) => l.match(/https:\/\/[a-z0-9.-]+(?=\/)/g) ?? [])
    expect(origins.length).toBeGreaterThanOrEqual(3)
    for (const origin of origins) expect(connect).toContain(origin)
  })

  // CF-01: unhashed images and icons get a day of caching. Data JSON, the manifest and HTML stay on revalidate.
  describe('cache rules', () => {
    const rules = new Map<string, string[]>()
    let current = ''
    for (const line of readFileSync(resolve(__dirname, '../public/_headers'), 'utf8').split('\n')) {
      if (/^\S/.test(line)) rules.set((current = line.trim()), [])
      else if (line.trim()) rules.get(current)?.push(line.trim())
    }

    it.each(['/images/*', '/icon-*', '/icon.svg', '/apple-touch-icon.png', '/favicon.ico'])('%s is cached for a day', (path) => {
      expect(rules.get(path)).toContain('Cache-Control: public, max-age=86400, stale-while-revalidate=604800')
    })

    it('leaves data JSON and the manifest on revalidate', () => {
      for (const path of ['/manifest.webmanifest', '/*.json']) expect(rules.has(path)).toBe(false)
    })
  })
})
