import { LEAGUES } from '@/lib/constants'
import forbiddenRites from './forbidden-rites'
import type { RuneSet } from './types'

/** One file per league. A new league adds its file here; the newest live league (LEAGUES[0]) picks the set. */
export const RUNE_SETS: readonly RuneSet[] = [forbiddenRites]

/** The current league's runes, or null (no glyphs) when no file matches it yet. */
export function currentRunes(league: string = LEAGUES[0]): RuneSet | null {
  return RUNE_SETS.find((s) => s.league === league) ?? null
}
