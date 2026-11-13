import { farmData } from '@/data/farm'
import { stepSummaries } from '@/lib/stepSummary'
import type { CompanionSeed } from './companion'

/**
 * Server-only: what the companion needs, cut down at build time so the roadmap and farm JSON never reach the client
 * bundle (the root layout passes this as a prop).
 */
export function companionSeed(): CompanionSeed {
  const p = farmData.quickPicks.picks[0]
  return {
    steps: stepSummaries().map((s) => ({ id: s.id, title: s.title })),
    pick: p ? { id: p.id, name: p.name, line: p.line } : null,
  }
}
