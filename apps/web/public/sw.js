/**
 * Offline support.
 *
 * The point is the data artifacts (passive tree, affix ladders, monster stats, atlas tree, bases, PoB skills, trade
 * stats), and the content-hashed /_next/static chunks: all are versioned build outputs that never change between
 * deploys. Refetching them on every visit is waste; serving them from cache
 * makes the tree and the gear panel work with no network at all.
 *
 * ## Two different caching strategies, on purpose
 *
 * **Data artifacts — cache first.** They are immutable for a given deploy, so a
 * cache hit is always correct and always faster. "For a given deploy" is
 * enforced: the data cache name carries a fingerprint of these files (VERSION
 * below), so a deploy with new data starts from an empty data cache.
 *
 * **Everything else — network first, cache as fallback.** The app shell must not
 * go stale: a user on an old cached bundle would see old analysis code against
 * new data and have no way to tell. Fresh when online, last-known when not.
 *
 * ## What is never cached
 *
 * Requests to the poe.ninja proxy. A character's stats change as they play, and
 * serving a stale sheet as if it were current is exactly the kind of quietly
 * wrong answer this project avoids. Offline means the tree and the last analysis
 * you loaded — not a stale character presented as fresh.
 */

// The page registers this worker as sw.js?v=<data fingerprint>&b=<build id>
// (see next.config.ts), so either changing means a new worker. Each cache is
// keyed on what invalidates it: the shell on the build, the data on the data.
// A code-only deploy then drops the old shell but keeps the 2.7 MB of data.
const params = new URL(self.location.href).searchParams
const VERSION = params.get('v') || 'v3'
const BUILD = params.get('b') || 'b0'
const SHELL_CACHE = `poe2-shell-${BUILD}`
const DATA_CACHE = `poe2-data-${VERSION}`

/** Immutable per deploy. Cache-first. */
const DATA_FILES = [
  '/passive-tree.json',
  '/mod-tiers.json',
  '/mod-display.json',
  '/monster-stats.json',
  '/pob-skills.json',
  '/bases.json',
  '/trade2-stats.json',
  '/trade-map.json',
  '/atlas-tree.json',
]

/** Content-hashed build output: the URL changes whenever the bytes do, so a hit is always right. Cache-first. */
const isHashedAsset = (url) => url.pathname.includes('/_next/static/')

/** Install metadata, cached with the shell (relative to the root, so it follows the base path). */
const INSTALL_FILES = ['manifest.webmanifest', 'icon.svg', 'icon-192.png']

const isDataRequest = (url) => DATA_FILES.some((file) => url.pathname.endsWith(file))

/** Never cached — a character sheet must not be served stale. */
const isLiveRequest = (url) =>
  /ninja-proxy|poe\.ninja/.test(url.hostname) || url.pathname.includes('/api/')

self.addEventListener('install', (event) => {
  // Do not pre-fetch the data here: 2.7 MB on first visit, before the user has
  // asked for anything, on a connection that may be metered. They are cached on
  // first real use instead. The shell of the pages already open is different:
  // see cacheOpenPages.
  event.waitUntil(
    (async () => {
      await cacheOpenPages().catch(() => {})
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await pruneOldCaches().catch(() => {})
      // Navigations start their network request while the worker boots instead of after.
      await self.registration?.navigationPreload?.enable().catch(() => {})
      await self.clients.claim()
    })(),
  )
})

/** Delete every cache of ours that is neither this build's shell nor this data version's data. */
async function pruneOldCaches() {
  const keys = await caches.keys()
  await Promise.all(
    keys
      .filter((key) => key.startsWith('poe2-') && key !== SHELL_CACHE && key !== DATA_CACHE)
      .map((key) => caches.delete(key)),
  )
}

/**
 * Cache the open pages, and the chunks and preloaded fonts their HTML
 * references, from this build.
 *
 * Those pages were loaded through the previous worker, so their shell sits in
 * the cache activate is about to delete; without this, an offline reload
 * straight after an update finds nothing. Only the open pages and the root
 * (the offline fallback for navigations), which a reload would fetch anyway.
 */
async function cacheOpenPages() {
  const cache = await caches.open(SHELL_CACHE)
  const root = new URL('./', self.location.href).href
  const pages = new Set([root])
  for (const client of await self.clients.matchAll({ type: 'window', includeUncontrolled: true })) {
    const url = new URL(client.url)
    if (url.origin === self.location.origin) pages.add(url.origin + url.pathname + url.search)
  }
  const assets = new Set()
  for (const page of pages) {
    // no-cache: the HTTP cache may still hold the previous build's HTML.
    const response = await fetch(page, { cache: 'no-cache' })
    if (!response.ok) continue
    const html = await response.clone().text()
    await cache.put(page, response)
    for (const m of html.matchAll(/["']([^"']*\/_next\/static\/[^"']+\.(?:js|css|woff2))["']/g)) assets.add(new URL(m[1], page).href)
  }
  // The install metadata is fixed, so a build the browser installs from offline still finds it.
  for (const file of INSTALL_FILES) assets.add(new URL(file, root).href)
  await Promise.all(
    [...assets].map(async (asset) => {
      // One missing file must not leave the rest of the shell uncached.
      const response = await fetch(asset).catch(() => null)
      if (response?.ok) await cache.put(asset, response)
    }),
  )
}

// The previous worker can still be answering the page's requests while this one
// activates, and its next cache write recreates the cache just deleted. The first
// request this worker handles means the old one is done: prune again then.
let pruned = false

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  if (!pruned) {
    pruned = true
    event.waitUntil(pruneOldCaches().catch(() => {}))
  }

  const url = new URL(request.url)
  if (isLiveRequest(url)) return
  // Other origins are none of this worker's business.
  if (url.origin !== self.location.origin) return

  if (isDataRequest(url)) {
    event.respondWith(cacheFirst(request, DATA_CACHE))
    return
  }

  if (isHashedAsset(url)) {
    event.respondWith(cacheFirst(request, SHELL_CACHE))
    return
  }

  event.respondWith(networkFirst(request, event))
})

// Cache Storage can fail on its own: Chrome throws "UnknownError" from caches.open
// on a damaged profile or a storage fault. The worker then answers from the
// network as if it had no cache instead of failing every request, online
// included. A cache error costs offline support, nothing more.
const openCache = (name) => caches.open(name).catch(() => null)
const lookup = async (cache, request) => (cache ? cache.match(request).catch(() => undefined) : undefined)
const store = (cache, request, response) => cache?.put(request, response).catch(() => {})

async function cacheFirst(request, name) {
  const cache = await openCache(name)
  const hit = await lookup(cache, request)
  if (hit) return hit

  const response = await fetch(request)
  // Only cache a real success. An opaque or error response cached here would
  // poison every later load with a failure that looks like data.
  if (response.ok && response.status === 200) store(cache, request, response.clone())
  return response
}

async function networkFirst(request, event) {
  const cache = await openCache(SHELL_CACHE)
  try {
    const response = (await event.preloadResponse) || (await fetch(request))
    if (response.ok && response.status === 200) store(cache, request, response.clone())
    return response
  } catch (err) {
    const hit = await lookup(cache, request)
    if (hit) return hit
    // Navigations fall back to the app shell so a deep link still opens offline.
    if (request.mode === 'navigate') {
      const shell = await lookup(cache, './')
      if (shell) return shell
    }
    throw err
  }
}
