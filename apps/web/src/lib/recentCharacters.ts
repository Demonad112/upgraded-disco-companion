'use client'

import { BASE_PATH } from './basePath'
import { createLocalStore } from './localStore'

/** The first Top-3 finding at import: its lead line and the hash that opens it on the character page. */
export interface TopFix {
  title: string
  /** An id on the character page, e.g. `top-fixes-title` (lib/characterTab maps it to its tab). */
  tab: string
}

/** A character imported from a poe.ninja URL or a named PoB code, so it can be re-opened in one tap. */
export interface RecentCharacter {
  /** The poe.ninja profile URL; empty for a pasted code. */
  url: string
  /** The pasted PoB code, kept so it re-opens without pasting again (CP-3); absent for a URL import. */
  code?: string
  /** `snapshotKey(identity)`, to find this character's history snapshots. */
  key: string
  name: string
  className: string | null
  level: number | null
  /**
   * The headline grade at import (a range such as "D–B" when damage could not
   * be graded). Null when ungraded; absent on rows saved before it was kept.
   */
  grade?: string | null
  /** The first fix at import. Null when there was none; absent on rows saved before it was kept. */
  topFix?: TopFix | null
  at: string
}

const MAX_RECENT = 5

/**
 * The in-app path that re-imports a poe.ninja character. Without the base
 * path: Next's <Link> adds that itself. Use `importUrl` for a link that leaves
 * the app.
 */
export function importPath(url: string): string {
  return `/character/?import=${encodeURIComponent(url)}`
}

/** The account a named, pasted PoB code is saved under (a code carries none), so history keys it like an import. */
export const CODE_ACCOUNT = 'pob-code'

/** The in-app path that re-opens a recent character: the `?import=` URL, or `?recent=<key>` for a saved code. */
export function recentPath(r: Pick<RecentCharacter, 'url' | 'key' | 'code'>): string {
  return r.code ? `/character/?recent=${encodeURIComponent(r.key)}` : importPath(r.url)
}

/** The absolute, shareable form of `importPath`, base path included. */
export function importUrl(url: string, origin: string): string {
  return `${origin}${BASE_PATH}${importPath(url)}`
}

const isTopFix = (t: unknown): boolean =>
  t == null || (typeof (t as TopFix).title === 'string' && typeof (t as TopFix).tab === 'string')

/**
 * Rows only gain optional fields, so the key keeps `v1`: older rows still pass, and a row whose `topFix` is the wrong
 * shape fails the whole list (the store falls back to empty rather than hand the companion a bad link).
 */
export const acceptRecent = (v: unknown): v is RecentCharacter[] =>
  Array.isArray(v) && v.every((r) => typeof r?.url === 'string' && typeof r?.key === 'string' && isTopFix(r.topFix))

export const recentCharacters = createLocalStore<RecentCharacter[]>(
  'poe2-endgame-companion:recent-characters:v1',
  [],
  acceptRecent,
)

/** Newest first, one row per character. */
export function recordRecent(entry: RecentCharacter): void {
  recentCharacters.set((prev) => {
    const same = prev[0]
    if (same && same.url === entry.url && same.key === entry.key && same.level === entry.level && same.grade === entry.grade &&
      same.topFix?.title === entry.topFix?.title)
      return prev
    // A code row has no URL, so only a real URL (or the key) makes two rows the same character.
    return [entry, ...prev.filter((r) => !(entry.url && r.url === entry.url) && r.key !== entry.key)].slice(0, MAX_RECENT)
  })
}

/**
 * The first actionable finding as a stored top fix: the lead clause (as `splitAction` in topFixesData cuts it, kept
 * here so the character page's main chunk does not pull the Top-3 module) and the Top-3 heading's id.
 */
export function topFixOf(recs: readonly { action: string; category: string }[]): TopFix | null {
  const first = recs.find((r) => r.category !== 'question')
  if (!first) return null
  const at = first.action.indexOf(' — ')
  return { title: (at < 0 ? first.action : first.action.slice(0, at)).trim(), tab: 'top-fixes-title' }
}
