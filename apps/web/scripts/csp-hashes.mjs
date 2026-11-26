// WQA1-1: drop 'unsafe-inline' from script-src. Next inlines its flight payload per page and the layout inlines four
// bootstrap scripts, so after `next build` this hashes every inline <script> in out/**/*.html and appends the
// sha256 sources to script-src in out/_headers. Fails the build if a page has no scripts or the header is missing.
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const out = resolve(import.meta.dirname, '..', 'out')

function* htmlFiles(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '_next') continue
    const p = join(dir, e.name)
    if (e.isDirectory()) yield* htmlFiles(p)
    else if (p.endsWith('.html')) yield p
  }
}

const hashes = new Set()
for (const file of htmlFiles(out)) {
  const html = readFileSync(file, 'utf8')
  let n = 0
  for (const m of html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
    n++
    hashes.add(`'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`)
  }
  if (n === 0) throw new Error(`csp-hashes: no inline scripts found in ${file}`)
}

const headersPath = join(out, '_headers')
const headers = readFileSync(headersPath, 'utf8')
// The directive may list hosts after 'self' (Cloudflare Web Analytics); hashes from an earlier run are replaced.
const re = /script-src 'self'[^;]*(?=;)/
const directive = re.exec(headers)?.[0]
if (!directive) throw new Error("csp-hashes: script-src 'self' not found in out/_headers")
const kept = directive.split(/\s+/).filter((t) => !t.startsWith("'sha256-"))
let next = headers.replace(re, [...kept, ...[...hashes].sort()].join(' '))

// The PoB engine (src/lib/usePobEngine.ts) is deployed separately, so its origin comes from the same build-time env
// var the app reads, rather than a host hard-coded in public/_headers.
const engineBase = process.env.NEXT_PUBLIC_POB_ENGINE_BASE
if (engineBase) {
  const origin = new URL(engineBase).origin
  if (!/^(https:\/\/|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$)/.test(origin)) throw new Error(`csp-hashes: NEXT_PUBLIC_POB_ENGINE_BASE must be https (or localhost), got ${origin}`)
  const connect = /connect-src 'self'[^;]*(?=;)/
  const current = connect.exec(next)?.[0]
  if (!current) throw new Error("csp-hashes: connect-src 'self' not found in out/_headers")
  if (!current.split(/\s+/).includes(origin)) next = next.replace(connect, `${current} ${origin}`)
  console.log(`csp-hashes: PoB engine ${origin} added to connect-src`)
}
writeFileSync(headersPath, next)
console.log(`csp-hashes: ${hashes.size} inline script hashes written to out/_headers`)
