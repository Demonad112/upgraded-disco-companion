import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import sitemap from '../src/app/sitemap'

const appDir = resolve(__dirname, '../src/app')

describe('sitemap', () => {
  const urls = sitemap().map((e) => e.url)

  it('uses absolute URLs with a trailing slash', () => {
    for (const url of urls) expect(url).toMatch(/^https?:\/\/[^/]+(\/[^/]+)*\/$/)
  })

  it('lists every page route in src/app', () => {
    const routes = readdirSync(appDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(resolve(appDir, d.name, 'page.tsx')))
      .map((d) => d.name)
    for (const route of routes) expect(urls.some((u) => u.endsWith(`/${route}/`))).toBe(true)
    expect(urls).toHaveLength(routes.length + 1)
  })
})
