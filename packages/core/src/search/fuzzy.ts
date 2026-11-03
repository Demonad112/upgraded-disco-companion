/**
 * Name lookup that tolerates typos: "Did you mean …" instead of "not found".
 *
 * Ported from demonad112/poe2-mcp2 `src/text_search.py` (MIT). Same order of
 * signals: an exact (case-insensitive) hit, then names starting with the query,
 * then names containing it, then a fuzzy match for typos. The fuzzy step is
 * Python difflib's `SequenceMatcher.ratio()` (Ratcliff/Obershelp) reimplemented
 * here so core takes no dependency; 0.4 is the fork's empirically chosen cutoff,
 * low enough to catch "Avatar of Fir" and high enough to skip unrelated words.
 *
 * Pure: the caller supplies the candidate names.
 */

export interface FuzzyOptions {
  /** Most suggestions to return. Default 5. */
  limit?: number
  /** Minimum similarity ratio (0–1) for a fuzzy suggestion. Default 0.4. */
  cutoff?: number
}

export interface FuzzyResult {
  /** The candidate equal to the query ignoring case and outer spaces; null when none is. */
  match: string | null
  /** Closest other names, most likely first. Empty when there is an exact match. */
  suggestions: string[]
}

export const FUZZY_DEFAULT_CUTOFF = 0.4

/** Longest common block of a[aLo..aHi) and b[bLo..bHi): earliest in a, then in b, on ties (as difflib). */
function longestMatch(a: string, aLo: number, aHi: number, b: string, bLo: number, bHi: number): [number, number, number] {
  let bestI = aLo
  let bestJ = bLo
  let bestK = 0
  let prev = new Map<number, number>()
  for (let i = aLo; i < aHi; i++) {
    const next = new Map<number, number>()
    for (let j = bLo; j < bHi; j++) {
      if (a[i] !== b[j]) continue
      const k = (prev.get(j - 1) ?? 0) + 1
      next.set(j, k)
      if (k > bestK) {
        bestI = i - k + 1
        bestJ = j - k + 1
        bestK = k
      }
    }
    prev = next
  }
  return [bestI, bestJ, bestK]
}

function matchingChars(a: string, b: string): number {
  let total = 0
  const queue: [number, number, number, number][] = [[0, a.length, 0, b.length]]
  while (queue.length) {
    const [aLo, aHi, bLo, bHi] = queue.pop()!
    const [i, j, k] = longestMatch(a, aLo, aHi, b, bLo, bHi)
    if (k === 0) continue
    total += k
    if (aLo < i && bLo < j) queue.push([aLo, i, bLo, j])
    if (i + k < aHi && j + k < bHi) queue.push([i + k, aHi, j + k, bHi])
  }
  return total
}

/** Ratcliff/Obershelp similarity, 0–1; equal to difflib's `SequenceMatcher(None, a, b).ratio()` for short strings. */
export function similarity(a: string, b: string): number {
  const length = a.length + b.length
  return length === 0 ? 1 : (2 * matchingChars(a, b)) / length
}

/**
 * Look a name up in `names`.
 *
 * `match` is set only for an exact case-insensitive hit. Otherwise
 * `suggestions` lists up to `limit` names: prefix hits, then substring hits,
 * then fuzzy hits at or above `cutoff`, best ratio first. Duplicates are
 * dropped case-insensitively, keeping the first spelling seen.
 */
export function fuzzyFind(query: string, names: Iterable<string>, options: FuzzyOptions = {}): FuzzyResult {
  const limit = options.limit ?? 5
  const cutoff = options.cutoff ?? FUZZY_DEFAULT_CUTOFF
  const q = query.trim().toLowerCase()
  if (!q || limit <= 0) return { match: null, suggestions: [] }

  const pool: { name: string; lower: string }[] = []
  const seen = new Set<string>()
  for (const name of names) {
    if (!name) continue
    const lower = name.toLowerCase()
    if (seen.has(lower)) continue
    seen.add(lower)
    pool.push({ name, lower })
  }

  const exact = pool.find((c) => c.lower.trim() === q)
  if (exact) return { match: exact.name, suggestions: [] }

  const prefix = pool.filter((c) => c.lower.startsWith(q))
  const contained = pool.filter((c) => !c.lower.startsWith(q) && c.lower.includes(q))
  const out = [...prefix, ...contained].slice(0, limit).map((c) => c.name)
  if (out.length >= limit) return { match: null, suggestions: out }

  const taken = new Set(out.map((n) => n.toLowerCase()))
  const fuzzy = pool
    .filter((c) => !taken.has(c.lower))
    .map((c, order) => ({ name: c.name, order, score: similarity(q, c.lower) }))
    .filter((c) => c.score >= cutoff)
    .sort((x, y) => y.score - x.score || x.order - y.order)
  for (const c of fuzzy) {
    if (out.length >= limit) break
    out.push(c.name)
  }
  return { match: null, suggestions: out }
}
