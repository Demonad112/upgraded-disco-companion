import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The offline worker (public/sw.js), run against an in-memory Cache Storage.
 *
 * The data files are served cache-first, so the only thing that gets a
 * returning visitor new data after a deploy is the version in the worker's URL
 * (sw.js?v=<hash of the data files>, see next.config.ts). These tests hold the
 * worker to that: a new version drops the old caches and reads the files from
 * the network again. A browser test of the same thing depends on when Chromium
 * hands a page to a new worker, which is not deterministic.
 */
const source = readFileSync(resolve(__dirname, '../public/sw.js'), 'utf8')
const ORIGIN = 'https://example.test'

type Stores = Map<string, Map<string, Response>>

function worker(
  version: string,
  stores: Stores,
  network: (url: string) => Response,
  build?: string,
  /** URLs of the windows open when the worker installs. */
  openPages: string[] = [],
) {
  const handlers: Record<string, (e: unknown) => void> = {}
  const caches = {
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
    open: async (name: string) => {
      if (!stores.has(name)) stores.set(name, new Map())
      const store = stores.get(name)!
      const key = (r: Request | string) => (typeof r === 'string' ? new URL(r, ORIGIN).href : r.url)
      return {
        match: async (r: Request | string) => store.get(key(r))?.clone(),
        put: async (r: Request, res: Response) => void store.set(key(r), res),
      }
    },
  }
  const self = {
    location: { href: `${ORIGIN}/sw.js?v=${version}${build ? `&b=${build}` : ''}`, origin: ORIGIN },
    addEventListener: (type: string, fn: (e: unknown) => void) => (handlers[type] = fn),
    skipWaiting: async () => {},
    clients: { claim: async () => {}, matchAll: async () => openPages.map((url) => ({ url })) },
  }
  const fetch = async (r: Request | string) => network(typeof r === 'string' ? new URL(r, ORIGIN).href : r.url)
  new Function('self', 'caches', 'fetch', source)(self, caches, fetch)

  const settle = async (type: string, extra: object = {}) => {
    let done: Promise<unknown> = Promise.resolve()
    handlers[type]({ ...extra, waitUntil: (p: Promise<unknown>) => (done = p), respondWith: (p: Promise<unknown>) => (done = p) })
    return done
  }
  return {
    install: () => settle('install'),
    activate: () => settle('activate'),
    /** Whether the worker answers this request itself rather than leaving it to the network. */
    answers: (url: string) => {
      let answered = false
      handlers.fetch({ request: new Request(url), waitUntil: () => {}, respondWith: () => (answered = true) })
      return answered
    },
    get: async (path: string) => {
      const request = new Request(`${ORIGIN}${path}`)
      const res = (await settle('fetch', { request })) as Response
      await new Promise((r) => setTimeout(r, 0)) // cache.put runs after the response is handed back
      return res.text()
    },
  }
}

describe('offline worker', () => {
  it('serves a data file from cache until the data version changes', async () => {
    const stores: Stores = new Map()
    let deployed = 'old data'
    const network = () => new Response(deployed)

    const before = worker('a', stores, network)
    await before.activate()
    expect(await before.get('/monster-stats.json')).toBe('old data')

    deployed = 'new data'
    // Same version: cache-first, so the stored copy wins.
    expect(await before.get('/monster-stats.json')).toBe('old data')

    // A deploy with new data registers the worker under a new version.
    const after = worker('b', stores, network)
    await after.activate()
    expect([...stores.keys()].filter((k) => k.endsWith('-a'))).toEqual([])
    expect(await after.get('/monster-stats.json')).toBe('new data')
    expect([...stores.keys()]).toContain('poe2-data-b')
  })

  it('drops the old shell cache on a new build and keeps the data cache', async () => {
    const stores: Stores = new Map()
    let deployed = 'old'
    const network = () => new Response(deployed)

    const before = worker('d1', stores, network, 'build1')
    await before.activate()
    await before.get('/')
    await before.get('/monster-stats.json')
    expect([...stores.keys()].sort()).toEqual(['poe2-data-d1', 'poe2-shell-build1'])

    // A code-only deploy: same data, new build.
    deployed = 'new'
    const after = worker('d1', stores, network, 'build2')
    await after.activate()
    expect(stores.has('poe2-shell-build1')).toBe(false)
    expect(stores.has('poe2-data-d1')).toBe(true)
    // The data copy survives the code deploy.
    expect(await after.get('/monster-stats.json')).toBe('old')
    expect(await after.get('/')).toBe('new')
    expect(stores.has('poe2-shell-build2')).toBe(true)
  })

  it('drops the old data cache on a new data version', async () => {
    const stores: Stores = new Map()
    const network = () => new Response('x')

    const before = worker('d1', stores, network, 'build1')
    await before.activate()
    await before.get('/')
    await before.get('/monster-stats.json')

    const after = worker('d2', stores, network, 'build1')
    await after.activate()
    expect(stores.has('poe2-data-d1')).toBe(false)
    expect(stores.has('poe2-shell-build1')).toBe(true)
  })

  it('caches the open pages and their chunks from the new build before it activates', async () => {
    // The open pages were loaded through the previous worker, whose shell cache
    // activate deletes. Without this, an offline reload straight after an
    // update finds an empty shell cache.
    const stores: Stores = new Map()
    const html =
      '<link rel="preload" href="/_next/static/media/f.woff2"><link href="/_next/static/chunks/a.css"><script src="/_next/static/chunks/b.js"></script>'
    const network = (url: string) => new Response(url.endsWith('/') ? html : `body of ${new URL(url).pathname}`)

    const w = worker('d1', stores, network, 'build2', [`${ORIGIN}/checklist/#tips`, 'https://other.example/'])
    await w.install()
    const shell = stores.get('poe2-shell-build2')!
    expect([...shell.keys()].sort()).toEqual([
      `${ORIGIN}/`,
      `${ORIGIN}/_next/static/chunks/a.css`,
      `${ORIGIN}/_next/static/chunks/b.js`,
      `${ORIGIN}/_next/static/media/f.woff2`,
      `${ORIGIN}/checklist/`,
    ])
  })

  it('still installs when the shell cannot be fetched', async () => {
    const stores: Stores = new Map()
    const w = worker('d1', stores, () => Response.error(), 'build2', [`${ORIGIN}/`])
    await expect(w.install()).resolves.toBeUndefined()
  })

  it('prunes an old cache the previous worker recreated after activation', async () => {
    const stores: Stores = new Map()
    const network = () => new Response('x')
    const w = worker('d1', stores, network, 'build2')
    await w.activate()
    // The previous worker was still answering the page's requests and wrote one more entry.
    stores.set('poe2-shell-build1', new Map())
    await w.get('/')
    await new Promise((r) => setTimeout(r, 0))
    expect(stores.has('poe2-shell-build1')).toBe(false)
    expect(stores.has('poe2-shell-build2')).toBe(true)
  })

  it('leaves caches that are not its own alone', async () => {
    const stores: Stores = new Map([['other-app', new Map()]])
    await worker('d1', stores, () => new Response(''), 'build1').activate()
    expect(stores.has('other-app')).toBe(true)
  })

  it('leaves character requests and other sites to the network', async () => {
    const w = worker('a', new Map(), () => new Response(''))
    expect(w.answers(`${ORIGIN}/api/character?account=x`)).toBe(false)
    expect(w.answers('https://poe.ninja/poe2/api/profile')).toBe(false)
    expect(w.answers('https://fonts.example/font.woff2')).toBe(false)
    expect(w.answers(`${ORIGIN}/passive-tree.json`)).toBe(true)
  })
})
