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

import { activeSpec, readPobSnapshot, type PobSnapshot } from './snapshot.js'

export class PobDecodeError extends Error {
  override name = 'PobDecodeError'
}

/** base64url -> standard base64, padded. */
function toStandardBase64(code: string): string {
  const compact = code.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')
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

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'function') {
    const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate'))
    return new Uint8Array(await new Response(stream).arrayBuffer())
  }
  const { inflateSync } = await import('node:zlib')
  return new Uint8Array(inflateSync(bytes))
}

/** Decode a PoB export code to its raw XML. */
export async function decodePobExport(code: string): Promise<string> {
  if (typeof code !== 'string' || !code.trim()) {
    throw new PobDecodeError('Empty Path of Building export code.')
  }
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

export interface PobBuildInfo {
  level: number | null
  className: string | null
  ascendClassName: string | null
  /** PoB's own computed stats — the independent second opinion. */
  playerStats: Record<string, number>
  /** Every allocated node id of the active tree spec, weapon-set nodes included (PoB's `nodes`). */
  treeNodeIds: number[]
}

/**
 * Extract the parts of a PoB document we actually use. Anything absent comes
 * back null rather than defaulted — a missing level must be reported, not
 * silently rendered as 0.
 */
export function parsePobXml(source: PobSource): PobBuildInfo {
  const snap = snapshotOf(source)
  return {
    level: snap.build.level,
    className: snap.build.className,
    ascendClassName: snap.build.ascendClassName,
    playerStats: readPlayerStats(snap),
    treeNodeIds: activeSpec(snap)?.nodes ?? [],
  }
}

/** Convenience: decode and parse in one step. */
export async function importPobExport(code: string): Promise<PobBuildInfo & { xml: string; snapshot: PobSnapshot }> {
  const xml = await decodePobExport(code)
  const snapshot = readPobSnapshot(xml)
  return { ...parsePobXml(snapshot), xml, snapshot }
}
