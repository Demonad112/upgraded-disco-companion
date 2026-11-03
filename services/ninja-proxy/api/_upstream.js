// Shared by the proxy's functions: every request to poe.ninja goes through
// `politeFetch`, which names this service and backs off when asked to.
//
// The leading underscore keeps Vercel from deploying this file as a route.

// A public repository URL, never a personal address. A fork sets
// UPSTREAM_CONTACT to its own.
export const UPSTREAM_USER_AGENT = `poe2-endgame-companion-proxy (+${
  process.env.UPSTREAM_CONTACT || 'https://github.com/Demonad112/upgraded-disco-companion'
})`

// Browsers allowed to read the proxy's responses: the app on Cloudflare Pages
// (production and preview hosts) and a local dev server. Non-browser callers
// send no Origin, so CORS does not apply to them.
const ALLOWED_ORIGIN = /^(https:\/\/([a-z0-9-]+\.)?upgraded-disco-companion\.pages\.dev|http:\/\/localhost:\d+)$/

/** The request's `Origin` when it is on the allowlist, otherwise null. */
export function allowOrigin(req) {
  const origin = req.headers?.origin
  return typeof origin === 'string' && ALLOWED_ORIGIN.test(origin) ? origin : null
}

/**
 * Sets the CORS headers: `Access-Control-Allow-Origin` echoes an allowed
 * origin and is omitted otherwise, and `Vary: Origin` is always sent so a CDN
 * never serves one origin's answer to another.
 */
export function applyCors(req, res, allowHeaders) {
  const origin = allowOrigin(req)
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  // A cross-origin page can only read Retry-After (on a 503) if it is exposed.
  res.setHeader('Access-Control-Expose-Headers', 'Retry-After')
  if (allowHeaders) res.setHeader('Access-Control-Allow-Headers', allowHeaders)
}

const RETRY_STATUSES = new Set([429, 502, 503, 504])
const MAX_RETRIES = 2
const BASE_DELAY_MS = 300
// A function that waits longer than this for upstream is near its own timeout.
const MAX_WAIT_MS = 2_000

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Longest accepted value for any query parameter. Account, character and league names are all far shorter. */
export const MAX_QUERY_LENGTH = 64

/**
 * The first named query parameter that is repeated, not a string, or longer than
 * MAX_QUERY_LENGTH; null when all present ones are fine. Absent parameters are
 * the handler's own concern and are not checked here.
 */
export function badQueryParam(query, names) {
  for (const name of names) {
    const value = query?.[name]
    if (value === undefined) continue
    if (typeof value !== 'string' || value.length > MAX_QUERY_LENGTH) return name
  }
  return null
}

/** Seconds from a `Retry-After` header, or null when absent or not a number of seconds. */
export function retryAfterMs(res) {
  const n = Number(res.headers?.get('retry-after'))
  return Number.isFinite(n) && n > 0 ? n * 1000 : null
}

/**
 * `fetch` with a descriptive User-Agent and a short, bounded retry on 429 and
 * transient 5xx. `Retry-After` wins over the backoff, but is not honoured past
 * MAX_WAIT_MS: the caller then gets the throttled response as it is. A thrown
 * error (including an abort) is not retried.
 */
export async function politeFetch(url, init = {}, { fetchImpl = fetch, sleepImpl = sleep } = {}) {
  const headers = { 'user-agent': UPSTREAM_USER_AGENT, ...init.headers }
  for (let attempt = 0; ; attempt++) {
    const res = await fetchImpl(url, { ...init, headers })
    if (!RETRY_STATUSES.has(res.status) || attempt >= MAX_RETRIES) return res
    const wait = retryAfterMs(res) ?? BASE_DELAY_MS * 2 ** attempt
    if (wait > MAX_WAIT_MS) return res
    await res.body?.cancel?.().catch(() => {})
    await sleepImpl(wait)
  }
}

const MAX_CACHED = 16

/**
 * Last good body and ETag per URL, for the life of this function instance.
 * Only used for URLs that name an immutable version (the model URL carries the
 * version number), so a 304 can never serve a stale body under a new version.
 * Serverless instances come and go: this is a best-effort saving, not a store.
 */
const bodies = new Map()

/** Drops everything cached; tests only. */
export function clearBodyCache() {
  bodies.clear()
}

/**
 * `politeFetch` plus `If-None-Match` revalidation. Returns `{ status, ok, body,
 * etag, revalidated }` for a 2xx or a 304 that the cache can answer, and the raw
 * response otherwise. Whether poe.ninja sends an ETag on this endpoint has not
 * been verified: without one nothing is cached and this behaves as `politeFetch`.
 */
export async function revalidatingFetch(url, init = {}, { fetchImpl, sleepImpl } = {}) {
  const hit = bodies.get(url)
  const headers = hit ? { ...init.headers, 'if-none-match': hit.etag } : init.headers
  const res = await politeFetch(url, { ...init, headers }, { fetchImpl, sleepImpl })
  if (res.status === 304 && hit) {
    return { status: 200, ok: true, body: hit.body, etag: hit.etag, revalidated: true }
  }
  if (!res.ok) return res
  const body = await res.text()
  const etag = res.headers?.get('etag') ?? null
  if (etag) {
    bodies.delete(url)
    bodies.set(url, { etag, body })
    if (bodies.size > MAX_CACHED) bodies.delete(bodies.keys().next().value)
  }
  return { status: res.status, ok: true, body, etag, revalidated: false }
}

/** poe.ninja throttling or failing on its side: the caller should wait and try again, not read it as a bug here. */
export function isBusyStatus(status) {
  return status === 429 || status >= 500
}

/** Seconds to ask the caller to wait: upstream's own `Retry-After` (capped), else this default. */
export const DEFAULT_RETRY_AFTER_S = 5
const MAX_RETRY_AFTER_S = 30

export function retryAfterSeconds(upstream) {
  const ms = upstream ? retryAfterMs(upstream) : null
  return ms === null ? DEFAULT_RETRY_AFTER_S : Math.min(MAX_RETRY_AFTER_S, Math.max(1, Math.ceil(ms / 1000)))
}

/** A cacheable-by-us result describing "poe.ninja is busy": 503 with `Retry-After`, never stored. */
export function busyResult(upstream) {
  return {
    status: 503,
    json: { error: 'poe.ninja is busy right now. Try again in a few seconds.' },
    headers: { 'Retry-After': String(retryAfterSeconds(upstream)), 'Cache-Control': 'no-store' },
  }
}

export const RESPONSE_TTL_MS = 60_000
const MAX_RESPONSES = 64
/** key -> { at, result }. Per function instance, best effort, like the body cache above. */
const responses = new Map()
/** key -> Promise<result> for requests already running; identical callers share it. */
const inflight = new Map()

/** Drops cached responses and in-flight work; tests only. */
export function clearResponseCache() {
  responses.clear()
  inflight.clear()
}

/**
 * Runs `produce()` once per key at a time and keeps a 200 or 404 result for
 * RESPONSE_TTL_MS. Errors (including 503) are shared with callers that were
 * already waiting but never stored, so the next request tries upstream again.
 * `produce` returns `{ status, json | body, headers }`; a throw is shared too.
 */
export function coalesced(key, produce, { now = Date.now, ttlMs = RESPONSE_TTL_MS } = {}) {
  const hit = responses.get(key)
  if (hit && now() - hit.at < ttlMs) return Promise.resolve(hit.result)
  responses.delete(key)
  const running = inflight.get(key)
  if (running) return running
  const p = (async () => {
    try {
      const result = await produce()
      if (result.status === 200 || result.status === 404) {
        responses.set(key, { at: now(), result })
        if (responses.size > MAX_RESPONSES) responses.delete(responses.keys().next().value)
      }
      return result
    } finally {
      inflight.delete(key)
    }
  })()
  inflight.set(key, p)
  return p
}
