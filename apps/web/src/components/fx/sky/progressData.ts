import { atlasClusters, memoryForks } from '@/data/atlasTree'
import { PHASE_ORDER, orderedSteps } from '@/lib/roadmapOrder'
import type { AtlasClusterGroup, PersistedState, RoadmapPhase } from '@/lib/types'
import type { ProgressGroup } from './progress'

/**
 * Which phase's constellation an Atlas node joins: the point in the roadmap where the guide has you allocate it.
 * Early-progression is the pre-Ash sustain block (Precursor Fortress); the memory forks open after the first
 * Arbiter of Divinity; mechanic subtrees are the masters phase; the rest is the full-tree close-out.
 */
const ATLAS_PHASE: Record<AtlasClusterGroup, RoadmapPhase> = {
  'early-progression': 'precursor-fortress',
  'memory-fork': 'arbiter-of-divinity-loop',
  'mechanic-subtree': 'masters-and-mechanics',
  general: 'full-tree',
}

/** Every checklist step and Atlas node, grouped by phase: steps in play order, then Atlas nodes in allocation order. */
export function progressGroups(): ProgressGroup<RoadmapPhase>[] {
  const clusters = [...atlasClusters].sort((a, b) => a.order - b.order)
  return PHASE_ORDER.map((phase) => ({
    phase,
    ids: [
      ...orderedSteps.filter((s) => s.phase === phase).map((s) => s.id),
      ...clusters.filter((c) => ATLAS_PHASE[c.group] === phase).map((c) => c.id),
      ...(phase === ATLAS_PHASE['memory-fork'] ? memoryForks.map((f) => f.id) : []),
    ],
  }))
}

/** Done ids from the persisted state: ticked steps and allocated Atlas clusters and forks. */
export function doneIds(state: PersistedState): Set<string> {
  return new Set([...state.checklist.completedStepIds, ...state.atlas.allocatedClusterIds, ...state.atlas.allocatedForkIds])
}
