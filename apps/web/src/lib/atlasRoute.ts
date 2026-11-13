import { atlasClusters, memoryForks } from '@/data/atlasTree'

/** The tabs on /atlas. Only the first three have a sequence the map can number. */
export type AtlasTab = 'path' | 'forks' | 'mechanics' | 'late' | 'traps'

/** One numbered step of a tab: a cluster, or a Memory fork. A step with several tree nodes shares one number. */
export interface RouteStep {
  num: number
  kind: 'cluster' | 'fork'
  id: string
  name: string
  /** Exact node names in the tree data. */
  treeNodes: string[]
}

const byOrder = (group: string) =>
  atlasClusters
    .filter((c) => c.group === group)
    .sort((a, b) => a.order - b.order)
    .map((c): RouteStep => ({ num: c.order, kind: 'cluster', id: c.id, name: c.name, treeNodes: c.treeNodes ?? [] }))

const PATH = byOrder('early-progression')
const LATE = byOrder('general')
const FORKS = memoryForks.map((f, i): RouteStep => ({ num: i + 1, kind: 'fork', id: f.id, name: f.title, treeNodes: f.treeNodes ?? [] }))

/** Path = early-progression clusters by order, Late game = general clusters, Forks = file order; other tabs have none. */
export function routeSteps(tab: AtlasTab): RouteStep[] {
  return tab === 'path' ? PATH : tab === 'late' ? LATE : tab === 'forks' ? FORKS : []
}

/** The first step not yet taken. The map's pulsing node and the "Up next" card both read this. */
export function nextStep(steps: RouteStep[], isDone: (step: RouteStep) => boolean): RouteStep | undefined {
  return steps.find((s) => !isDone(s))
}
