import { BAND } from './field'

/**
 * LS1 progress constellations: pure layout and completion logic, no DOM. Positions are fractions of the sky's
 * radius unit `ru` (field.ts), relative to the pivot, so they are the same at every viewport size and only scale with it.
 */

export type ProgressGroup<P extends string = string> = { phase: P; ids: readonly string[] }

type ProgressStar = {
  id: string
  /** Index of its phase in the layout. */
  phase: number
  /** Position in units of `ru`, relative to the pivot, before rotation. */
  x: number
  y: number
}

type ProgressPhase<P extends string = string> = {
  phase: P
  /** Into `stars`: this phase's stars, in step order. */
  from: number
  to: number
  /** Where the flare and the name label sit, in units of `ru`. */
  cx: number
  cy: number
}

type ProgressLayout<P extends string = string> = { stars: ProgressStar[]; phases: ProgressPhase<P>[] }

/** FNV-1a, 32-bit: a stable number from an id, so a star never moves between loads or releases. */
export function hashId(id: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Two independent 0..1 numbers from an id. */
function unit2(id: string): [number, number] {
  const h = hashId(id)
  const g = hashId(`${id}#r`)
  return [h / 4294967296, g / 4294967296]
}

/** A sliver of band left empty between neighbouring phases, so each reads as its own constellation. */
const GAP = 0.05
/** Where the band starts going round (radians): the top, so play order runs clockwise from there. */
const START = -Math.PI / 2
/** Keeps stars off the band's edges, in units of the band's width. */
const EDGE = 0.12

/**
 * Lays every id out in the band. Each phase gets an arc of the band in proportion to its star count, in the order
 * given; inside it, star j sits near the j-th of n even slots with a jitter and radius seeded from its id. So the
 * stars run round the arc in step order (the links never fold back) and a new id never moves the others in its arc
 * more than its slot shift.
 */
export function layoutProgress<P extends string>(groups: readonly ProgressGroup<P>[]): ProgressLayout<P> {
  const live = groups.filter((g) => g.ids.length > 0)
  const total = live.reduce((n, g) => n + g.ids.length, 0)
  const stars: ProgressStar[] = []
  const phases: ProgressPhase<P>[] = []
  if (total === 0) return { stars, phases }
  const turn = Math.PI * 2 * (1 - GAP * live.length)
  const gap = Math.PI * 2 * GAP
  const [r0, r1] = BAND
  let a0 = START
  live.forEach((g, p) => {
    const span = (turn * g.ids.length) / total
    const n = g.ids.length
    const from = stars.length
    let cx = 0
    let cy = 0
    g.ids.forEach((id, j) => {
      const [h1, h2] = unit2(id)
      const a = a0 + (span * (j + 0.5 + 0.7 * (h1 - 0.5))) / n
      const r = r0 + (r1 - r0) * (EDGE + (1 - 2 * EDGE) * h2)
      const x = Math.cos(a) * r
      const y = Math.sin(a) * r
      stars.push({ id, phase: p, x, y })
      cx += x
      cy += y
    })
    phases.push({ phase: g.phase, from, to: stars.length, cx: cx / n, cy: cy / n })
    a0 += span + gap
  })
  return { stars, phases }
}

/**
 * For each star, the index of the previous done star in its phase (its thread runs from there), or -1. Undone stars
 * get -1 too.
 */
export function threadsFor(layout: ProgressLayout, done: ReadonlySet<string>): Int32Array {
  const prev = new Int32Array(layout.stars.length).fill(-1)
  for (const ph of layout.phases) {
    let last = -1
    for (let i = ph.from; i < ph.to; i++) {
      if (!done.has(layout.stars[i].id)) continue
      prev[i] = last
      last = i
    }
  }
  return prev
}

/** Whether every star in each phase is done. */
export function completePhases(layout: ProgressLayout, done: ReadonlySet<string>): boolean[] {
  return layout.phases.map((ph) => {
    for (let i = ph.from; i < ph.to; i++) if (!done.has(layout.stars[i].id)) return false
    return true
  })
}

/** Phases that were not complete before and are now: these flare. Undo and reset never do. */
export function newlyComplete(layout: ProgressLayout, before: ReadonlySet<string>, after: ReadonlySet<string>): number[] {
  const was = completePhases(layout, before)
  const now = completePhases(layout, after)
  const out: number[] = []
  now.forEach((c, i) => {
    if (c && !was[i]) out.push(i)
  })
  return out
}
