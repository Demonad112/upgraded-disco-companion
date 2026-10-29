/**
 * Offline support.
 *
 * The point is the data artifacts: the passive tree is 604 KB and the affix
 * ladders 2 MB, and both are versioned build outputs that never change between
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
const DATA_FILES = ['/passive-tree.json', '/mod-tiers.json', '/monster-stats.json']

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
      await pruneOldCaches()
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
    event.waitUntil(pruneOldCaches())
  }

  const url = new URL(request.url)
  if (isLiveRequest(url)) return
  // Other origins are none of this worker's business.
  if (url.origin !== self.location.origin) return

  if (isDataRequest(url)) {
    event.respondWith(cacheFirst(request))
    return
  }

  event.respondWith(networkFirst(request))
})

async function cacheFirst(request) {
  const cache = await caches.open(DATA_CACHE)
  const hit = await cache.match(request)
  if (hit) return hit

  const response = await fetch(request)
  // Only cache a real success. An opaque or error response cached here would
  // poison every later load with a failure that looks like data.
  if (response.ok && response.status === 200) cache.put(request, response.clone())
  return response
}

async function networkFirst(request) {
  const cache = await caches.open(SHELL_CACHE)
  try {
    const response = await fetch(request)
    if (response.ok && response.status === 200) cache.put(request, response.clone())
    return response
  } catch (err) {
    const hit = await cache.match(request)
    if (hit) return hit
    // Navigations fall back to the app shell so a deep link still opens offline.
    if (request.mode === 'navigate') {
      const shell = await cache.match('./')
      if (shell) return shell
    }
    throw err
  }
}
