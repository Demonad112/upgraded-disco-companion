/** A point on a rune, in a -1..1 box, y down. */
export type RunePoint = readonly [number, number]

/** One sigil: strokes of straight segments through its points, traced in order. Each point is drawn as a star. */
export type Rune = { name: string; strokes: readonly (readonly RunePoint[])[] }

/** A league's runes. `league` is matched against LEAGUES[0] (lib/constants); `patch` records the patch they were made for. */
export type RuneSet = { league: string; patch: string; runes: readonly Rune[] }
