import { test } from 'node:test'
import assert from 'node:assert/strict'
import { allowOrigin, applyCors } from '../api/_upstream.js'
import characterHandler from '../api/character.js'
import ladderHandler from '../api/ladder.js'
import healthHandler from '../api/health.js'

const ALLOWED = [
  'https://upgraded-disco-companion.pages.dev',
  'https://claude-gallant-gates-fwoykk.upgraded-disco-companion.pages.dev',
  'http://localhost:3000',
  'http://localhost:8788',
]
const DENIED = [
  'https://evil.example',
  'https://upgraded-disco-companion.pages.dev.evil.example',
  'https://evil-upgraded-disco-companion.pages.dev',
  'https://a.b.upgraded-disco-companion.pages.dev',
  'http://upgraded-disco-companion.pages.dev',
  'https://localhost:3000',
  'http://localhost',
  'http://localhost:3000.evil.example',
  'null',
  '',
]

const fakeRes = () => {
  const headers = {}
  return {
    headers,
    statusCode: null,
    setHeader(k, v) { headers[k.toLowerCase()] = v },
    status(c) { this.statusCode = c; return this },
    json(b) { this.body = b; return this },
    end() { return this },
  }
}

test('allowOrigin echoes allowlisted origins', () => {
  for (const origin of ALLOWED) assert.equal(allowOrigin({ headers: { origin } }), origin)
})

test('allowOrigin rejects everything else, including a missing Origin', () => {
  for (const origin of DENIED) assert.equal(allowOrigin({ headers: { origin } }), null, origin)
  assert.equal(allowOrigin({ headers: {} }), null)
  assert.equal(allowOrigin({}), null)
})

test('applyCors sets Vary: Origin whether or not the origin is allowed', () => {
  for (const origin of [ALLOWED[0], 'https://evil.example', undefined]) {
    const res = fakeRes()
    applyCors({ headers: { origin } }, res, 'Content-Type')
    assert.equal(res.headers.vary, 'Origin')
    assert.equal(res.headers['access-control-allow-origin'], origin === ALLOWED[0] ? origin : undefined)
  }
})

test('character preflight: allowed origin is echoed, never "*"', async () => {
  const res = fakeRes()
  await characterHandler({ method: 'OPTIONS', headers: { origin: ALLOWED[1] } }, res)
  assert.equal(res.statusCode, 204)
  assert.equal(res.headers['access-control-allow-origin'], ALLOWED[1])
  assert.equal(res.headers.vary, 'Origin')
})

test('character preflight from a foreign origin gets no allow-origin header', async () => {
  const res = fakeRes()
  await characterHandler({ method: 'OPTIONS', headers: { origin: 'https://evil.example' } }, res)
  assert.equal(res.headers['access-control-allow-origin'], undefined)
  assert.equal(res.headers.vary, 'Origin')
})

test('error responses carry the same CORS headers', async () => {
  const res = fakeRes()
  await characterHandler({ method: 'GET', headers: { origin: ALLOWED[0] }, query: {} }, res)
  assert.equal(res.statusCode, 400)
  assert.equal(res.headers['access-control-allow-origin'], ALLOWED[0])
})

test('health follows the allowlist', () => {
  const ok = fakeRes()
  healthHandler({ method: 'GET', headers: { origin: ALLOWED[2] } }, ok)
  assert.equal(ok.headers['access-control-allow-origin'], ALLOWED[2])
  const no = fakeRes()
  healthHandler({ method: 'GET', headers: { origin: 'https://evil.example' } }, no)
  assert.equal(no.headers['access-control-allow-origin'], undefined)
  assert.equal(no.headers.vary, 'Origin')
  assert.equal(no.statusCode, 200)
})

test('ladder preflight follows the allowlist', async () => {
  const ok = fakeRes()
  await ladderHandler({ method: 'OPTIONS', headers: { origin: ALLOWED[0] }, query: {} }, ok)
  assert.equal(ok.statusCode, 204)
  assert.equal(ok.headers['access-control-allow-origin'], ALLOWED[0])
  const no = fakeRes()
  await ladderHandler({ method: 'OPTIONS', headers: { origin: 'https://evil.example' }, query: {} }, no)
  assert.equal(no.headers['access-control-allow-origin'], undefined)
  assert.equal(no.headers.vary, 'Origin')
})
