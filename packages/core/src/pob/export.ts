/**
 * Path of Building export decoding.
 *
 * `charModel.pathOfBuildingExport` is a base64url + zlib blob wrapping PoB's
 * own XML. It matters for two reasons:
 *
 *  1. Round-tripping a build into PoB.
 *  2. It carries PoB's OWN computed `<PlayerStat>` values, which are an
 *     INDEPENDENT second opinion on poe.ninja's numbers. On the reference
 *     character PoB's `TotalDPS` reads 109859.05 against poe.ninja's 109,859 —
 *     they agree, which is exactly what makes disagreement meaningful. The
 *     reconciliation harness uses this rather than trusting either blindly.
 *
 * Not used for stats V1-style: V1's `importer._extract_stats` was a placeholder
 * that returned a note dict and computed nothing.
 *
 * Decoding is dependency-free and works in both Node and the browser: Node has
 * `zlib` but the browser does not, so inflation goes through
 * `DecompressionStream('deflate')` where available.
 */

/** Parsing quirks recorded so they aren't rediscovered:
 *  - `<Item>` elements have NO slot attribute. Join `<ItemSet><Slot itemId=>`
 *    on the item's `id` to learn where it is equipped.
 *  - The item NAME is the line AFTER the "Rarity:" line, not the first line.
 */

import { readPobSnapshot, type PobSnapshot } from './snapshot.js'

export class PobDecodeError extends Error {
  override name = 'PobDecodeError'
}

/**
 * Build sites whose links PoB2 resolves to a raw code (`Modules/BuildSiteTools.lua`). The site is static and
 * these hosts send no CORS headers, so a link is named back to the player instead of fetched.
 */
const BUILD_SITES: readonly (readonly [site: string, pattern: RegExp])[] = [
  ['pobb.in', /(^|\/\/|\.)pobb\.in\//i],
  ['poe.ninja', /(^|\/\/|\.)poe\.ninja\/.*pob/i],
  ['maxroll.gg', /(^|\/\/|\.)maxroll\.gg\//i],
  ['poe2db.tw', /(^|\/\/|\.)poe2db\.tw\//i],
  ['pastebin.com', /(^|\/\/|\.)pastebin\.com\//i],
  ['rentry.co', /(^|\/\/|\.)rentry\.(co|org)\//i],
]

/** The build site a pasted link points at (`pobb.in`, `poe.ninja`…), or null when the text is not such a link. */
export function pobSiteLink(text: string): string | null {
  const t = text.trim()
  return BUILD_SITES.find(([, re]) => re.test(t))?.[0] ?? null
}

/**
 * The code as PoB2's ImportTab reads it: trim whitespace and `?` (ImportTab.lua:219), map base64url back
 * (:260), then drop every character outside the alphabet, as `base64.decode` does. Padding is restored.
 */
function toStandardBase64(code: string): string {
  const compact = code
    .replace(/^[\s?]+|[\s?]+$/g, '')
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .replace(/[^A-Za-z0-9+/]/g, '')
  return compact + '='.repeat((4 - (compact.length % 4)) % 4)
}

function base64ToBytes(b64: string): Uint8Array {
  if (typeof atob === 'function') {
    const bin = atob(b64)
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
  }
  // Node without atob (shouldn't happen on >=22, but keep it total).
  return new Uint8Array(Buffer.from(b64, 'base64'))
}

/** zlib (PoB's own output) or gzip, picked from the header the way PoB's `Inflate` auto-detects it. */
async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const gzip = bytes[0] === 0x1f && bytes[1] === 0x8b
  if (typeof DecompressionStream === 'function') {
    const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream(gzip ? 'gzip' : 'deflate'))
    return new Uint8Array(await new Response(stream).arrayBuffer())
  }
  const { inflateSync, gunzipSync } = await import('node:zlib')
  return new Uint8Array(gzip ? gunzipSync(bytes) : inflateSync(bytes))
}

/** Decode a PoB export code to its raw XML. */
export async function decodePobExport(code: string): Promise<string> {
  if (typeof code !== 'string' || !code.trim()) {
    throw new PobDecodeError('Empty Path of Building export code.')
  }
  const site = pobSiteLink(code)
  if (site) throw new PobDecodeError(`That is a ${site} link, not a code. Open it, copy the PoB code, and paste the code.`)
  let bytes: Uint8Array
  try {
    bytes = base64ToBytes(toStandardBase64(code))
  } catch {
    throw new PobDecodeError('Export code is not valid base64.')
  }
  let xml: string
  try {
    const inflated = await inflate(bytes)
    xml = new TextDecoder('utf-8').decode(inflated)
  } catch {
    throw new PobDecodeError('Export code did not inflate — it may be truncated or not a PoB code.')
  }
  if (!xml.includes('<PathOfBuilding')) {
    throw new PobDecodeError('Decoded payload is not a Path of Building document.')
  }
  return xml
}

const SNAPSHOT_CACHE_MAX = 2
const snapshotCache = new Map<string, Promise<PobSnapshot>>()
/** Test hook: how many codes have been inflated and parsed (cache misses). */
let snapshotParses = 0
export function snapshotParseCount(): number {
  return snapshotParses
}

/**
 * Decode and parse a code once. The character page analyses the same code twice (card pass, full pass) and
 * `pobToCharModel` decodes it a third time, so the last two snapshots are kept by code string. Callers must
 * treat the snapshot as read-only. A failed decode is not cached.
 */
export function readPobSnapshotFromCode(code: string): Promise<PobSnapshot> {
  const hit = snapshotCache.get(code)
  if (hit) {
    snapshotCache.delete(code)
    snapshotCache.set(code, hit)
    return hit
  }
  snapshotParses++
  const p = decodePobExport(code).then((xml) => readPobSnapshot(xml))
  snapshotCache.set(code, p)
  p.catch(() => {
    if (snapshotCache.get(code) === p) snapshotCache.delete(code)
  })
  while (snapshotCache.size > SNAPSHOT_CACHE_MAX) snapshotCache.delete(snapshotCache.keys().next().value as string)
  return p
}

/** A decoded document, or a snapshot already read from one (so callers parse a code once). */
export type PobSource = string | PobSnapshot

/** The snapshot for a source: read it when given XML, pass it through when given a snapshot. */
export function snapshotOf(source: PobSource): PobSnapshot {
  return typeof source === 'string' ? readPobSnapshot(source) : source
}

/**
 * PoB's own computed stats (`<PlayerStat>`), finite values only. Read through `PobSnapshot`, which keeps
 * Lua's `inf`/`nan` too; those are dropped here because nothing downstream can use them as a figure.
 */
export function readPlayerStats(source: PobSource): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [key, value] of Object.entries(snapshotOf(source).playerStats)) if (Number.isFinite(value)) out[key] = value
  return out
}
