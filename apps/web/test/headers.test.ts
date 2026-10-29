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
})
