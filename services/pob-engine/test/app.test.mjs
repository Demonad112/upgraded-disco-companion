import assert from 'node:assert/strict'
import { once } from 'node:events'
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { test } from 'node:test'
import { createHandler, Lru, RateLimit } from '../src/app.mjs'

const CODE = readFileSync(new URL('../../../packages/core/test/reference/ninja-default/code.txt', import.meta.url), 'utf8').trim()
const OTHER = readFileSync(new URL('../../../packages/core/test/reference/pob2-own/code.txt', import.meta.url), 'utf8').trim()
const APP = 'https://upgraded-disco-companion.pages.dev'

function fakeWorker(impl) {
  const w = { calls: 0, info: { pobVersion: '0.23.1', pinCommit: 'abc' } }
  w.calc = async (xml) => {
    w.calls++
    return impl ? impl(xml) : { ...w.info, snapshot: { stats: { TotalDPS: 1 } }, groups: { groups: 0, rows: [] } }
  }
  return w
}

async function serve(opts) {
  const server = createServer(createHandler(opts))
  server.listen(0)
  await once(server, 'listening')
  const base = `http://127.0.0.1:${server.address().port}`
  return { base, close: () => server.close() }
}

const post = (base, body, headers = {}) =>
  fetch(`${base}/calc`, { method: 'POST', headers: { 'content-type': 'application/json', origin: APP, ...headers }, body: JSON.stringify(body) })

test('POST /calc runs the build once and caches the answer', async () => {
  const worker = fakeWorker()
  const s = await serve({ worker })
  try {
    const a = await post(s.base, { code: CODE })
    assert.equal(a.status, 200)
    assert.equal(a.headers.get('access-control-allow-origin'), APP)
    const body = await a.json()
    assert.equal(body.snapshot.stats.TotalDPS, 1)
    assert.equal(body.cached, false)
    const b = await (await post(s.base, { code: CODE })).json()
    assert.equal(b.cached, true)
    assert.equal(worker.calls, 1)
  } finally {
    s.close()
  }
})

test('a browser on another origin is refused before any work', async () => {
  const worker = fakeWorker()
  const s = await serve({ worker })
  try {
    const r = await post(s.base, { code: CODE }, { origin: 'https://evil.example' })
    assert.equal(r.status, 403)
    assert.equal(r.headers.get('access-control-allow-origin'), null)
    assert.equal(worker.calls, 0)
  } finally {
    s.close()
  }
})

test('preflight, health, 404 and 405', async () => {
  const s = await serve({ worker: fakeWorker() })
  try {
    const pre = await fetch(`${s.base}/calc`, { method: 'OPTIONS', headers: { origin: APP } })
    assert.equal(pre.status, 204)
    assert.match(pre.headers.get('access-control-allow-methods'), /POST/)
    const h = await (await fetch(`${s.base}/health`)).json()
    assert.deepEqual([h.ok, h.pobVersion], [true, '0.23.1'])
    assert.equal((await fetch(`${s.base}/nope`)).status, 404)
    assert.equal((await fetch(`${s.base}/calc`)).status, 405)
  } finally {
    s.close()
  }
})

test('a bad code is a 400 with the reason; an oversized body is a 413', async () => {
  const worker = fakeWorker()
  const s = await serve({ worker, maxBodyBytes: 1000 })
  try {
    const bad = await post(s.base, { code: 'hello world' })
    assert.equal(bad.status, 400)
    assert.match((await bad.json()).error, /base64/)
    assert.equal((await post(s.base, { code: CODE })).status, 413)
    assert.equal(worker.calls, 0)
  } finally {
    s.close()
  }
})

test('rate limit answers 429 with Retry-After; cached answers do not count', async () => {
  const worker = fakeWorker()
  const s = await serve({ worker, rateLimit: new RateLimit(1, 60_000), cache: new Lru(4) })
  try {
    assert.equal((await post(s.base, { code: CODE })).status, 200)
    assert.equal((await post(s.base, { code: CODE })).status, 200) // cached: not counted
    const limited = await post(s.base, { code: OTHER })
    assert.equal(limited.status, 429)
    assert.ok(Number(limited.headers.get('retry-after')) > 0)
    assert.equal(worker.calls, 1)
  } finally {
    s.close()
  }
})

test('RateLimit window resets', () => {
  let t = 0
  const limiter = new RateLimit(1, 60_000, () => t)
  assert.equal(limiter.take('a'), 0)
  assert.equal(limiter.take('a'), 60)
  assert.equal(limiter.take('b'), 0)
  t = 60_000
  assert.equal(limiter.take('a'), 0)
})

test('engine errors: a build error is 422 with PoB\'s message, a crash is 500 without internals', async () => {
  let mode = 'engine'
  const worker = fakeWorker(() => {
    throw mode === 'engine' ? Object.assign(new Error('PoB says no'), { engine: true }) : new Error('/secret/path exploded')
  })
  const s = await serve({ worker, cache: new Lru(0) })
  try {
    const a = await post(s.base, { code: CODE })
    assert.deepEqual([a.status, (await a.json()).error], [422, 'PoB says no'])
    mode = 'crash'
    const b = await post(s.base, { code: CODE })
    assert.deepEqual([b.status, (await b.json()).error], [500, 'engine failed on this build'])
  } finally {
    s.close()
  }
})

test('a full queue answers 503 busy', async () => {
  let release
  const gate = new Promise((r) => (release = r))
  const worker = fakeWorker(async () => (await gate, { snapshot: {}, groups: {} }))
  const s = await serve({ worker, maxQueue: 1, cache: new Lru(0) })
  try {
    const first = post(s.base, { code: CODE })
    await new Promise((r) => setTimeout(r, 50))
    const second = await post(s.base, { code: CODE })
    assert.equal(second.status, 503)
    assert.equal(second.headers.get('retry-after'), '15')
    release()
    assert.equal((await first).status, 200)
  } finally {
    s.close()
  }
})
