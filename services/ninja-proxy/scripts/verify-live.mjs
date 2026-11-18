#!/usr/bin/env node
// Live check of a deployed proxy: health, ladder for each app league, and one
// real character import, all sent with the app's Origin so CORS is checked too.
//
//   node scripts/verify-live.mjs https://poe2-v3-ninja-proxy.vercel.app
//   node scripts/verify-live.mjs https://<worker>.workers.dev
//
// Exits 1 if any check fails. Every unit test mocks poe.ninja, so this is the
// only check that notices poe.ninja moving an endpoint (it did, 2026-11-18).

const base = (process.argv[2] || '').replace(/\/+$/, '')
if (!/^https?:\/\//.test(base)) {
  console.error('usage: node scripts/verify-live.mjs <proxy base URL>')
  process.exit(2)
}
const ORIGIN = process.env.VERIFY_ORIGIN || 'https://upgraded-disco-companion.pages.dev'
// Display names as the app sends them (apps/web/src/lib/constants.ts LEAGUES),
// with the slugs core derives for them (packages/core/src/ninja/url.ts).
const LEAGUES = [
  { name: 'Forbidden Rites', slug: 'forbiddenrites' },
  { name: 'Runes of Aldur', slug: 'runesofaldur' },
]
const CHARACTER = { account: 'Demonad112#2589', league: 'runesofaldur', character: 'Athrynas' }

let failed = 0
async function check(label, path, assertBody) {
  const started = Date.now()
  let line
  try {
    const res = await fetch(`${base}${path}`, { headers: { origin: ORIGIN }, signal: AbortSignal.timeout(25_000) })
    const acao = res.headers.get('access-control-allow-origin')
    const vary = res.headers.get('vary') || ''
    const text = await res.text()
    const problems = []
    if (res.status !== 200) problems.push(`status ${res.status}: ${text.slice(0, 160)}`)
    if (acao !== ORIGIN) problems.push(`Access-Control-Allow-Origin ${acao}`)
    if (!/\borigin\b/i.test(vary)) problems.push(`Vary "${vary}"`)
    if (!problems.length && assertBody) {
      const why = assertBody(JSON.parse(text))
      if (why) problems.push(why)
    }
    line = `${problems.length ? 'FAIL' : 'ok  '} ${label} (${Date.now() - started} ms)${problems.length ? ' — ' + problems.join('; ') : ''}`
    if (problems.length) failed++
  } catch (err) {
    failed++
    line = `FAIL ${label} — ${err?.name}: ${err?.message}`
  }
  console.log(line)
}

await check('health', '/api/health', (b) => (b.ok === true ? null : 'ok is not true'))
for (const { name, slug } of LEAGUES) {
  const q = new URLSearchParams({ league: slug, name })
  await check(`ladder ${name}`, `/api/ladder?${q}`, (b) => (b.dps?.median > 0 ? null : 'no dps.median'))
}
await check(
  `character ${CHARACTER.character}`,
  `/api/character?${new URLSearchParams(CHARACTER)}`,
  (b) => (b.charModel ? null : 'no charModel'),
)
console.log(failed ? `${failed} check(s) failed` : 'all checks passed')
process.exit(failed ? 1 : 0)
