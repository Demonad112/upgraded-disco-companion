import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { busyResult, clearBodyCache, clearResponseCache, coalesced, isBusyStatus } from '../api/_upstream.js'
import handler from '../api/character.js'

const fakeRes = () => {
  const headers = {}
  return {
    headers,
    statusCode: null,
    setHeader(k, v) { headers[k] = v },
    status(c) { this.statusCode = c; return this },
    json(b) { this.body = b; return this },
    send(b) { this.body = b; return this },
    end() { return this },
  }
}
const req = (q) => ({ method: 'GET', headers: {}, query: q })
const Q = { account: 'A#1', league: 'L', character: 'C' }

const sse = () => ({
  status: 200,
  ok: true,
  headers: { get: () => null },
  body: new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('data: {"version":3}\n\n')) } }),
})
const json = (status, body, headers = {}) => ({
  status,
  ok: status >= 200 && status < 300,
  headers: { get: (k) => headers[k.toLowerCase()] ?? null },
  text: async () => body,
  body: { cancel: async () => {} },
})

let realFetch
beforeEach(() => {
  clearResponseCache()
  clearBodyCache()
  realFetch ??= globalThis.fetch
})

test('isBusyStatus: 429 and 5xx only', () => {
  for (const s of [429, 500, 502, 503, 504]) assert.ok(isBusyStatus(s))
  for (const s of [200, 304, 400, 404]) assert.ok(!isBusyStatus(s))
})

test('busyResult is a 503 with a capped Retry-After and no caching', () => {
  const r = busyResult({ headers: { get: () => '120' } })
  assert.equal(r.status, 503)
  assert.equal(r.headers['Retry-After'], '30')
  assert.equal(r.headers['Cache-Control'], 'no-store')
  assert.equal(busyResult(null).headers['Retry-After'], '5')
})

test('coalesced shares one in-flight call and caches 200 for the TTL', async () => {
  let calls = 0
  let t = 1000
  const produce = async () => { calls++; return { status: 200, json: { n: calls } } }
  const [a, b] = await Promise.all([coalesced('k', produce, { now: () => t }), coalesced('k', produce, { now: () => t })])
  assert.equal(calls, 1)
  assert.equal(a, b)
  t += 59_000
  assert.equal((await coalesced('k', produce, { now: () => t })).json.n, 1)
  t += 2_000
  assert.equal((await coalesced('k', produce, { now: () => t })).json.n, 2)
})

test('coalesced does not store a 503', async () => {
  let calls = 0
  const produce = async () => { calls++; return busyResult(null) }
  await coalesced('b', produce)
  await coalesced('b', produce)
  assert.equal(calls, 2)
})

test('handler: upstream 429 on the version stream becomes 503 + Retry-After, and is not cached', async () => {
  let calls = 0
  globalThis.fetch = async () => { calls++; return json(429, '', { 'retry-after': '7' }) }
  try {
    const res = fakeRes()
    await handler(req(Q), res)
    assert.equal(res.statusCode, 503)
    assert.equal(res.headers['Retry-After'], '7')
    const res2 = fakeRes()
    await handler(req(Q), res2)
    assert.equal(res2.statusCode, 503)
  } finally { globalThis.fetch = realFetch }
})

test('handler: upstream 5xx on the model becomes 503', async () => {
  globalThis.fetch = async (url) => (String(url).includes('/events/') ? sse() : json(500, 'x'))
  try {
    const res = fakeRes()
    await handler(req(Q), res)
    assert.equal(res.statusCode, 503)
    assert.ok(res.headers['Retry-After'])
  } finally { globalThis.fetch = realFetch }
})

test('handler: a good answer carries the 60 s cache header and the second call is served from memory', async () => {
  let calls = 0
  globalThis.fetch = async (url) => { calls++; return String(url).includes('/events/') ? sse() : json(200, '{"ok":1}') }
  try {
    const res = fakeRes()
    await handler(req(Q), res)
    assert.equal(res.statusCode, 200)
    assert.equal(res.headers['Cache-Control'], 'public, s-maxage=60, stale-while-revalidate=300')
    const before = calls
    const res2 = fakeRes()
    await handler(req(Q), res2)
    assert.equal(res2.body, '{"ok":1}')
    assert.equal(calls, before)
  } finally { globalThis.fetch = realFetch }
})
