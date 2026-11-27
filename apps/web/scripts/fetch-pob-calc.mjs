/**
 * Put PoB2's browser calc engine (Demonad112/disco-pob-calc) into public/pob-calc/<release id>/ so the static export
 * serves it from the site's own origin (browsers start module workers only from the page's origin).
 *
 *   node scripts/fetch-pob-calc.mjs              download the release pinned in pob-calc.lock.json, verify, unpack
 *   node scripts/fetch-pob-calc.mjs --check      only check the lock against vendor/pob2/PIN.json (no network)
 *   node scripts/fetch-pob-calc.mjs --update <tag>   pin <tag>: read its published .sha256 and write the lock
 *   POB_CALC_LOCAL=<file.tar.gz> node scripts/fetch-pob-calc.mjs   unpack a local tarball instead (dev, e2e; build
 *     with NEXT_PUBLIC_POB_CALC_LOCAL=1 so the page uses it when no release is pinned)
 *
 * <release id> is the first 16 hex digits of the tarball's sha256 in the lock ('unpinned' without one), so the folder
 * changes whenever any file in it does and `immutable` caching is safe. Must match src/lib/pobEngineBrowser.ts.
 *
 * The lock pins the release by tag and sha256. Its pinCommit must equal vendor/pob2/PIN.json's commit, and the
 * tarball's manifest.json must say the same: the engine and the CI oracle run the same PoB2 release, or the build
 * fails. With no sha256 in the lock (no release yet) the build goes on without the engine; the site then uses the
 * server engine if NEXT_PUBLIC_POB_ENGINE_BASE is set, else none.
 *
 * Downloads are cached in node_modules/.cache/pob-calc/. public/pob-calc/ is generated and gitignored.
 */

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const here = dirname(fileURLToPath(import.meta.url))
const webRoot = join(here, '..')
const repoRoot = join(webRoot, '..', '..')
const LOCK = join(webRoot, 'pob-calc.lock.json')
const OUT_ROOT = join(webRoot, 'public', 'pob-calc')
const CACHE = join(repoRoot, 'node_modules', '.cache', 'pob-calc')

const lock = JSON.parse(readFileSync(LOCK, 'utf8'))
const vendorPin = JSON.parse(readFileSync(join(repoRoot, 'vendor', 'pob2', 'PIN.json'), 'utf8')).commit
const tarName = (pin) => `pob-calc-${pin}.tar.gz`
export const releaseId = (sha) => (sha ? sha.slice(0, 16) : 'unpinned')
const releaseUrl = (tag, file) => `https://github.com/${lock.repo}/releases/download/${encodeURIComponent(tag)}/${file}`
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')
const fail = (msg) => {
  console.error(`fetch-pob-calc: ${msg}`)
  process.exit(1)
}

function checkPin() {
  if (lock.pinCommit !== vendorPin) {
    fail(`pob-calc.lock.json pins PoB2 ${lock.pinCommit}, but vendor/pob2 is ${vendorPin}. Bump disco-pob-calc, tag a release and run --update <tag> (docs/POB2-SYNC.md).`)
  }
}

/** Entries of an uncompressed ustar archive (regular files only). */
export function untar(buf) {
  const files = []
  let off = 0
  while (off + 512 <= buf.length) {
    const header = buf.subarray(off, off + 512)
    if (header.every((b) => b === 0)) break
    const str = (a, b) => header.subarray(a, b).toString('utf8').replace(/\0.*$/s, '')
    const name = (str(345, 500) ? `${str(345, 500)}/` : '') + str(0, 100)
    const size = parseInt(str(124, 136).trim() || '0', 8)
    const type = String.fromCharCode(header[156] || 48)
    off += 512
    if (type === '0' || type === '\0') files.push({ name: name.replace(/^\.\//, ''), data: buf.subarray(off, off + size) })
    off += Math.ceil(size / 512) * 512
  }
  return files
}

function unpack(tgz, pin) {
  const files = untar(gunzipSync(tgz))
  const manifest = files.find((f) => f.name === 'manifest.json')
  if (!manifest) fail('the tarball has no manifest.json')
  const m = JSON.parse(manifest.data.toString('utf8'))
  if (m.pinCommit !== pin) fail(`the tarball's manifest.json says PoB2 ${m.pinCommit}, the lock says ${pin}`)
  rmSync(OUT_ROOT, { recursive: true, force: true })
  const out = join(OUT_ROOT, releaseId(lock.sha256))
  for (const f of files) {
    const dest = normalize(join(out, f.name))
    if (!dest.startsWith(out + sep)) fail(`refusing a path outside the target: ${f.name}`)
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, f.data)
  }
  console.log(`fetch-pob-calc: PoB ${m.pobVersion} @ ${pin.slice(0, 7)} -> public/pob-calc/${releaseId(lock.sha256)}/ (${files.length} files)`)
}

async function get(url) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { redirect: 'follow' })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      return Buffer.from(await res.arrayBuffer())
    } catch (err) {
      if (i >= 4) throw new Error(`${url}: ${err.message}`)
      await new Promise((r) => setTimeout(r, i * 2000))
    }
  }
}

async function update(tag) {
  if (!tag) fail('--update needs a release tag, e.g. v0.23.1-1')
  const name = tarName(vendorPin)
  const line = (await get(releaseUrl(tag, `${name}.sha256`))).toString('utf8').trim()
  const [hash, file] = line.split(/\s+/)
  if (!/^[0-9a-f]{64}$/.test(hash ?? '') || file !== name) fail(`release ${tag} has no ${name}.sha256 for vendor/pob2's commit (got "${line}")`)
  const next = { ...lock, tag, pinCommit: vendorPin, sha256: hash }
  writeFileSync(LOCK, JSON.stringify(next, null, 2) + '\n')
  console.log(`fetch-pob-calc: pinned ${tag} (${hash})`)
}

async function main() {
  const args = process.argv.slice(2)
  if (args[0] === '--update') return update(args[1])
  checkPin()
  if (args[0] === '--check') return console.log(`fetch-pob-calc: lock matches vendor/pob2 (${vendorPin.slice(0, 7)})`)

  const local = process.env.POB_CALC_LOCAL
  if (local) return unpack(readFileSync(local), lock.pinCommit)

  if (!lock.sha256) {
    rmSync(OUT_ROOT, { recursive: true, force: true })
    console.log(`fetch-pob-calc: no release pinned yet (pob-calc.lock.json sha256 is null); building without the browser engine`)
    return
  }
  const name = tarName(lock.pinCommit)
  const cached = join(CACHE, `${lock.sha256}.tar.gz`)
  let tgz = existsSync(cached) ? readFileSync(cached) : null
  if (!tgz || sha256(tgz) !== lock.sha256) {
    tgz = await get(releaseUrl(lock.tag, name))
    const got = sha256(tgz)
    if (got !== lock.sha256) fail(`${name} from ${lock.tag} has sha256 ${got}, the lock says ${lock.sha256}`)
    mkdirSync(CACHE, { recursive: true })
    writeFileSync(cached, tgz)
  }
  unpack(tgz, lock.pinCommit)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => fail(err.message))
}
