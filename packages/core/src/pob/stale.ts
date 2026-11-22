/**
 * Stale export: what the code says vs what current Path of Building computes for it.
 *
 * A code embeds the `<PlayerStat>` values of the PoB version that wrote it. When PoB's engine has since
 * changed (a weekly PoB release, a league patch), the embedded figures are out of date while the build
 * itself is not. The site never recomputes; this only compares against figures PoB's own engine produced
 * for the same code (the headless oracle in CI today, `pob-sim` provenance once a calc service exists,
 * B9). Any difference is reported, never corrected: the fix is to re-export from current PoB.
 */

import type { PobSnapshot } from './snapshot.js'

/** PoB's recomputed export for a code: the `export` half of a `*.oracle.json` (`npm run pob2:oracle`). */
export interface PobRecomputed {
  pobVersion?: string | null
  export: { PlayerStat: Record<string, number | string> }
}

export interface StaleStat {
  stat: string
  /** Null when the code did not carry the stat at all. */
  embedded: number | null
  /** Null when current PoB no longer writes the stat. */
  recomputed: number | null
}

export interface StaleExport {
  pobVersion: string | null
  /** Every stat whose embedded value differs from PoB's recomputed one, sorted by stat name. */
  stats: StaleStat[]
}

/** Oracle values are numbers, or Lua's `inf`/`-inf`/`nan` as strings. */
function oracleNumber(v: number | string | undefined): number | null {
  if (v === undefined) return null
  if (typeof v === 'number') return v
  if (v === 'inf') return Infinity
  if (v === '-inf') return -Infinity
  if (v === 'nan') return NaN
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

/**
 * The stats a code carries that PoB now computes differently. Exact comparison: both sides are written by
 * PoB's own `tostring`, so any difference is a real one. Null when nothing differs.
 */
export function staleExport(snapshot: PobSnapshot, recomputed: PobRecomputed): StaleExport | null {
  const now = recomputed.export.PlayerStat
  const keys = [...new Set([...Object.keys(snapshot.playerStats), ...Object.keys(now)])].sort()
  const stats: StaleStat[] = []
  for (const stat of keys) {
    const embedded = snapshot.playerStats[stat] ?? null
    const fresh = oracleNumber(now[stat])
    if (embedded === null && fresh === null) continue
    if (embedded !== null && fresh !== null && Object.is(embedded, fresh)) continue
    stats.push({ stat, embedded, recomputed: fresh })
  }
  return stats.length ? { pobVersion: recomputed.pobVersion ?? null, stats } : null
}

/** Headline stats, in the order a stale-export sentence names them. */
const HEADLINE = ['TotalDPS', 'CombinedDPS', 'FullDPS', 'Life', 'EnergyShield', 'TotalEHP', 'PhysicalMaximumHitTaken'] as const

const fmt = (n: number | null) => (n === null ? 'absent' : Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : String(n))

/** The finding, action first (docs/COPY.md). */
export function describeStaleExport(stale: StaleExport): string {
  const lead = HEADLINE.map((k) => stale.stats.find((s) => s.stat === k)).find(Boolean) ?? stale.stats[0]!
  const n = stale.stats.length
  const version = stale.pobVersion ? `Path of Building ${stale.pobVersion}` : 'current Path of Building'
  return (
    `Stale export: re-export from current Path of Building. ${n} stat${n === 1 ? '' : 's'} differ${n === 1 ? 's' : ''} from what ${version} computes for this build now, ` +
    `including ${lead.stat} (${fmt(lead.embedded)} in the code, ${fmt(lead.recomputed)} now).`
  )
}
