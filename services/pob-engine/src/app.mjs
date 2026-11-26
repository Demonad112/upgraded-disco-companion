// HTTP handler for the engine. No framework: node:http request/response.
//   GET  /health                  -> { ok, pobVersion, pinCommit, busy }
//   POST /calc  { "code": "..." } -> { pobVersion, pinCommit, snapshot, groups, ms, cached }
// Browsers are allowed only from ALLOWED_ORIGIN (the Pages app and localhost), as the ninja-proxy does.
import { createHash } from 'node:crypto'
import { DecodeError, decodePobCode } from './decode.mjs'

export const DEFAULT_ORIGIN = /^(https:\/\/([a-z0-9-]+\.)?upgraded-disco-companion\.pages\.dev|http:\/\/localhost:\d+)$/

export class Lru {
  constructor(max) {
    this.max = max
    this.map = new Map()
  }
  get(k) {
    const v = this.map.get(k)
    if (v !== undefined) {
      this.map.delete(k)
      this.map.set(k, v)
    }
    return v
  }
  set(k, v) {
    this.map.delete(k)
    this.map.set(k, v)
    while (this.map.size > this.max) this.map.delete(this.map.keys().next().value)
  }
}

/** Per-client fixed window: at most `limit` calcs per `windowMs`. */
export class RateLimit {
  constructor(limit, windowMs, now = Date.now) {
    this.limit = limit
    this.windowMs = windowMs
    this.now = now
    this.hits = new Map()
  }
  take(key) {
    const t = this.now()
    const h = this.hits.get(key)
    if (!h || t - h.start >= this.windowMs) {
      this.hits.set(key, { start: t, n: 1 })
      if (this.hits.size > 10_000) this.hits.clear()
      return 0
    }
    if (h.n >= this.limit) return Math.ceil((h.start + this.windowMs - t) / 1000)
    h.n++
    return 0
  }
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers })
  res.end(JSON.stringify(body))
}

function readBody(req, max) {
  return new Promise((resolve, reject) => {
    const tooLarge = () => Object.assign(new Error('too large'), { status: 413 })
    if (Number(req.headers['content-length']) > max) return reject(tooLarge())
    let size = 0
    let over = false
    const parts = []
    // Past the limit the rest is read and dropped (not destroyed), so the client still gets the 413.
    req.on('data', (c) => {
      size += c.length
      if (size > max) over = true
      else parts.push(c)
    })
    req.on('end', () => (over ? reject(tooLarge()) : resolve(Buffer.concat(parts).toString('utf8'))))
    req.on('error', reject)
  })
}

export function createHandler({
  worker,
  allowedOrigin = DEFAULT_ORIGIN,
  maxBodyBytes = 256 * 1024,
  maxQueue = 4,
  cache = new Lru(64),
  rateLimit = new RateLimit(20, 10 * 60_000),
  log = () => {},
} = {}) {
  let queued = 0
  return async function handle(req, res) {
    const origin = typeof req.headers.origin === 'string' && allowedOrigin.test(req.headers.origin) ? req.headers.origin : null
    const cors = { Vary: 'Origin', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Expose-Headers': 'Retry-After' }
    if (origin) cors['Access-Control-Allow-Origin'] = origin
    // A browser on another origin is refused outright, so a third-party page cannot spend our CPU.
    if (req.headers.origin && !origin) return send(res, 403, { error: 'origin not allowed' }, cors)
    const path = new URL(req.url, 'http://x').pathname
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { ...cors, 'Access-Control-Max-Age': '86400' })
      return res.end()
    }
    if (path === '/health' && req.method === 'GET') {
      return send(res, 200, { ok: true, ...(worker.info ?? {}), busy: queued }, cors)
    }
    if (path !== '/calc') return send(res, 404, { error: 'not found' }, cors)
    if (req.method !== 'POST') return send(res, 405, { error: 'POST only' }, { ...cors, Allow: 'POST, OPTIONS' })

    let code
    try {
      const raw = await readBody(req, maxBodyBytes)
      code = (req.headers['content-type'] ?? '').includes('application/json') ? JSON.parse(raw).code : raw
    } catch (e) {
      return send(res, e.status ?? 400, { error: e.status === 413 ? 'code too large' : 'body must be JSON { code }' }, e.status === 413 ? { ...cors, Connection: 'close' } : cors)
    }
    let xml
    try {
      xml = decodePobCode(code)
    } catch (e) {
      if (e instanceof DecodeError) return send(res, 400, { error: e.message }, cors)
      throw e
    }
    const key = createHash('sha256').update(xml).digest('hex')
    const hit = cache.get(key)
    if (hit) return send(res, 200, { ...hit, cached: true }, cors)

    const client = String(req.headers['cf-connecting-ip'] ?? req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').split(',')[0].trim()
    const wait = rateLimit.take(client)
    if (wait) return send(res, 429, { error: 'too many builds, try again shortly' }, { ...cors, 'Retry-After': String(wait) })
    if (queued >= maxQueue) return send(res, 503, { error: 'engine busy' }, { ...cors, 'Retry-After': '15' })

    queued++
    const t0 = Date.now()
    try {
      const result = await worker.calc(xml)
      const body = { ...result, ms: Date.now() - t0 }
      // A build PoB could not load is an answer too (snapshot.loadError), so it is cached like any other.
      cache.set(key, body)
      log(`calc ${key.slice(0, 12)} ${body.ms} ms`)
      return send(res, 200, { ...body, cached: false }, cors)
    } catch (e) {
      log(`calc failed: ${e.message}`)
      return send(res, e.engine ? 422 : 500, { error: e.engine ? e.message : 'engine failed on this build' }, cors)
    } finally {
      queued--
    }
  }
}
