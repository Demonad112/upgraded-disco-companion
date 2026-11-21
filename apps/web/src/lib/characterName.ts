import type { Analysis } from '@poe2/core'

/** What to call a character. A Path of Building code carries no name, so it gets a label instead of a blank heading. */
export function characterName(a: Pick<Analysis, 'identity' | 'source'>): string {
  if (a.identity.name) return a.identity.name
  return a.source === 'pob-export' ? 'Path of Building build' : 'Unnamed character'
}

/** Where the figures came from, for the build card's top line when there is no league to show. */
export function sourceLabel(a: Pick<Analysis, 'identity' | 'source'>): string | null {
  if (a.identity.league) return a.identity.league
  return a.source === 'pob-export' ? 'From a Path of Building code' : null
}
