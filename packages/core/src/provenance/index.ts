/**
 * Where a number came from, so an assistant knows how far to trust it.
 *
 * Ported from demonad112/poe2-mcp2 `src/provenance.py` (MIT). Every fact a tool
 * returns can carry a stamp naming its tier, the data revision that produced
 * it and when that data was extracted, so "this is from before the last patch"
 * is detectable and a hand-written summary is never quoted as game data.
 *
 * Not to be confused with `model/provenance.ts`, which labels a single stat
 * value (observed / pob-simulated / …) inside the character model.
 *
 * Pure: the data version is passed in (parse `@poe2/data/generated/version.json`
 * with `readDataVersion`), and `now` is passed to `externalProvenance`.
 */

import { dataAge } from '../dataage/index.js'

/** Stable vocabulary; downstream tooling reads these strings. */
export type Tier = 'canonical' | 'computed' | 'interpreted' | 'external'

export const TIERS: readonly Tier[] = Object.freeze(['canonical', 'computed', 'interpreted', 'external'])

/** What each tier means, in one line. */
export const TIER_MEANING: Readonly<Record<Tier, string>> = Object.freeze({
  canonical: 'Read from the Path of Building 2 data export shipped with this app.',
  computed: 'Derived by a documented formula from canonical or external inputs.',
  interpreted: 'Hand-written summary; verify balance-sensitive numbers in game.',
  external: 'Live from an external service (poe.ninja); may change between calls.',
})

const TIER_NOTE: Readonly<Partial<Record<Tier, string>>> = Object.freeze({
  interpreted: 'Hand-authored summary: verify against the in-game tooltip for balance-sensitive numbers.',
  external: 'Live external source: depends on its uptime and how recently it indexed the character.',
})

/**
 * Which tier each of the site's sources maps to. Owner-approved mapping
 * (docs/plans/MCP2-PORT.md).
 */
export const SOURCE_TIER = Object.freeze({
  /** Fields read from a poe.ninja character payload. */
  ninja: 'external',
  /** `packages/data/generated/*.json`, from the PoB2 export. */
  generated: 'canonical',
  /** Figures derived in `defense/` and `gear/`. */
  derived: 'computed',
  /** Mechanic explanations written by hand (`apps/mcp/src/mechanics.ts`). */
  mechanics: 'interpreted',
} as const satisfies Record<string, Tier>)

export type SiteSource = keyof typeof SOURCE_TIER

/** Machine-readable data version, as written to `packages/data/generated/version.json`. */
export interface DataVersion {
  /** e.g. "0.5.5@ce566ea": game patch and PoB commit. */
  dataRevision: string
  gameVersion: string | null
  /** ISO date the data was exported. */
  extractedAt: string
  /** Where it was exported from. */
  source: string
}

/** Validate a parsed `version.json`; null when it is missing or malformed, so callers never crash on it. */
export function readDataVersion(raw: unknown): DataVersion | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.dataRevision !== 'string' || typeof r.extractedAt !== 'string' || typeof r.source !== 'string') return null
  return {
    dataRevision: r.dataRevision,
    gameVersion: typeof r.gameVersion === 'string' ? r.gameVersion : null,
    extractedAt: r.extractedAt,
    source: r.source,
  }
}

export interface ProvenanceStamp {
  tier: Tier
  dataRevision: string | null
  extractedAt: string | null
  /** Path or URL of what the number came from. */
  source: string | null
  /** Caveat for the tier, when it has one. */
  note: string | null
}

export interface ProvenanceInput {
  dataRevision?: string | null
  extractedAt?: string | null
  source?: string | null
}

/** Build a stamp. Unknown fields are null, never guessed. */
export function provenance(tier: Tier, input: ProvenanceInput = {}): ProvenanceStamp {
  return {
    tier,
    dataRevision: input.dataRevision ?? null,
    extractedAt: input.extractedAt ?? null,
    source: input.source ?? null,
    note: TIER_NOTE[tier] ?? null,
  }
}

/** A stamp for one of the site's sources, filled from the shipped data version. */
export function provenanceFor(source: SiteSource, version: DataVersion | null, path?: string): ProvenanceStamp {
  const tier = SOURCE_TIER[source]
  // A poe.ninja number is not versioned by our data export.
  if (tier === 'external') return provenance(tier, { source: path ?? 'poe.ninja' })
  return provenance(tier, {
    dataRevision: version?.dataRevision ?? null,
    extractedAt: version?.extractedAt ?? null,
    source: path ?? version?.source ?? null,
  })
}

/**
 * A stamp for poe.ninja data, dated by the character's own update time
 * (`dataAge`), since that, not our export, is what goes stale.
 */
export function externalProvenance(updatedUtc: string | null | undefined, now: Date, source = 'poe.ninja'): ProvenanceStamp {
  const age = dataAge(updatedUtc, now)
  const stamp = provenance('external', { source, extractedAt: age.hours === null ? null : (updatedUtc ?? null) })
  return { ...stamp, note: `${stamp.note} Character ${age.label}${age.stale ? ' (stale)' : ''}.` }
}

/**
 * ASCII footer for a text response (round-trips through cp1252 terminals):
 *
 *     ---
 *     Data: 0.5.5@ce566ea (extracted 2026-09-25) | Tier: canonical
 *     Source: generated/mod-tiers.json
 */
export function formatProvenance(stamp: ProvenanceStamp): string {
  const lines = ['---', `Data: ${stamp.dataRevision ?? 'unknown'} (extracted ${stamp.extractedAt ?? '?'}) | Tier: ${stamp.tier}`]
  if (stamp.source) lines.push(`Source: ${stamp.source}`)
  if (stamp.note) lines.push(stamp.note)
  return lines.join('\n')
}
