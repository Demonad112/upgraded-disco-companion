/**
 * Route legs for the Atlas map (AR4). Pure: no canvas, no DOM.
 *
 * The route is a list of steps, each with the tree node ids it names. Walking the steps in order, every step is
 * reached by the shortest path (BFS over `neighbours`) from the nodes already reached (the start node, then every
 * node on earlier paths). The path begins at the reached node it attaches to. A new leg starts when that attachment
 * is not the previous step's target, i.e. the route jumped back to branch off somewhere else.
 */

export interface LegGraph {
  neighbours(id: number): number[]
}

export interface LegStepInput {
  id: string
  /** Tree node ids this step names. Several ids: the nearest one is the target. */
  nodes: number[]
}

export interface RouteLeg {
  stepId: string
  /** Attachment node first, target node last. One node when the target was already reached. */
  path: number[]
  /** 1-based leg number. */
  leg: number
}

/** BFS from every reached node at once; returns the path to the nearest wanted node, attachment first. */
function nearest(graph: LegGraph, reached: Iterable<number>, wanted: Set<number>): number[] | null {
  const prev = new Map<number, number | null>()
  const queue: number[] = []
  for (const id of reached) {
    prev.set(id, null)
    queue.push(id)
  }
  for (let head = 0; head < queue.length; head++) {
    const id = queue[head]!
    if (wanted.has(id)) {
      const path: number[] = []
      for (let at: number | null | undefined = id; at !== null && at !== undefined; at = prev.get(at)) path.push(at)
      return path.reverse()
    }
    for (const next of graph.neighbours(id)) {
      if (prev.has(next)) continue
      prev.set(next, id)
      queue.push(next)
    }
  }
  return null
}

/** Steps with no reachable node are left out; they get no leg. `start` is the root every route grows from. */
export function routeLegs(graph: LegGraph, start: number, steps: LegStepInput[]): RouteLeg[] {
  const reached = new Set<number>([start])
  const out: RouteLeg[] = []
  let leg = 0
  let lastTarget: number | null = null
  for (const step of steps) {
    if (!step.nodes.length) continue
    const path = nearest(graph, reached, new Set(step.nodes))
    if (!path) continue
    const attachment = path[0]!
    if (leg === 0 || attachment !== lastTarget) leg++
    for (const id of path) reached.add(id)
    lastTarget = path[path.length - 1]!
    out.push({ stepId: step.id, path, leg })
  }
  return out
}
