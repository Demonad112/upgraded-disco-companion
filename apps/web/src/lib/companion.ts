/**
 * The mock companion's lines: three canned pointers into real site content. Pure, so it is unit-tested and never
 * invents a number; the seed is derived from the guide and farm data on the server (`companionSeed.ts`).
 */

export interface CompanionSeed {
  /** Every checklist step in play order, titles only (from `stepSummaries()`). */
  steps: { id: string; title: string }[]
  /** The first curated farm quick pick. */
  pick: { id: string; name: string; line: string } | null
}

export interface CompanionLine {
  /** Which tool the line points into; it leads when the reader is already on that tool. */
  tool: 'checklist' | 'character' | 'farm'
  text: string
  href: string
}

export type CompanionPose = 'idle' | 'talking' | 'pointing' | 'asleep'

const TOOL_PATH: Record<CompanionLine['tool'], string> = {
  checklist: '/checklist',
  character: '/character',
  farm: '/dashboard',
}

export function companionLines(
  seed: CompanionSeed,
  completedStepIds: readonly string[],
  recent: { name: string; href: string } | null,
  pathname: string,
): CompanionLine[] {
  const done = new Set(completedStepIds)
  const next = seed.steps.find((s) => !done.has(s.id))
  const lines: CompanionLine[] = [
    next
      ? { tool: 'checklist', text: `Do this next: ${next.title}.`, href: `/checklist/#${next.id}` }
      : { tool: 'checklist', text: 'Checklist complete. Pick a farm and keep your Atlas up to date.', href: '/dashboard/' },
    recent
      ? { tool: 'character', text: `Re-open ${recent.name} to see its top 3 fixes.`, href: recent.href }
      : { tool: 'character', text: 'Import a character to see its top 3 fixes.', href: '/character/' },
  ]
  if (seed.pick) {
    lines.push({ tool: 'farm', text: `Try ${seed.pick.name}. ${seed.pick.line}`, href: `/dashboard/#quick-${seed.pick.id}` })
  }
  // The tool the reader is on leads; the rest keep their order (sort is stable).
  const here = (l: CompanionLine) => (pathname.startsWith(TOOL_PATH[l.tool]) ? 0 : 1)
  return [...lines].sort((a, b) => here(a) - here(b))
}

/** Asleep when there is nothing left to point at: checklist done and no character to re-open. */
export const restingPose = (seed: CompanionSeed, completedStepIds: readonly string[], hasRecent: boolean): CompanionPose =>
  !hasRecent && seed.steps.every((s) => completedStepIds.includes(s.id)) ? 'asleep' : 'idle'
