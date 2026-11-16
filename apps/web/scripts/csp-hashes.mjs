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
writeFileSync(headersPath, headers.replace(re, [...kept, ...[...hashes].sort()].join(' ')))
console.log(`csp-hashes: ${hashes.size} inline script hashes written to out/_headers`)
