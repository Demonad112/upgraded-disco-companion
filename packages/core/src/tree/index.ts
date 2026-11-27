/**
 * Passive tree graph.
 *
 * The tree data is loaded by the caller (the web app fetches it as a static
 * asset) and passed in — the core stays free of I/O.
 *
 * CORRECTNESS RULE: the stored `connections` are DIRECTED — of 5,888 entries
 * only one is reciprocated. The shipped artifact therefore carries an
 * undirected, de-duplicated edge list, and everything here walks that.
 *
 * On "disconnected tree" warnings: V1 emitted them constantly. They were nearly
 * always missing ascendancy node ids in its local database rather than a real
 * problem — the game will not allow a broken tree. This module reports
 * unresolved ids explicitly instead, naming what is missing.
 */

import type { PassiveAllocation } from '../model/passives.js'

export type NodeKind = 0 | 1 | 2 | 3 | 4

export const NODE_KIND = {
  normal: 0,
  notable: 1,
  keystone: 2,
  jewel: 3,
  start: 4,
} as const satisfies Record<string, NodeKind>

/** A node as it appears in the shipped artifact. Keys are short by design. */
export interface TreeNodeRaw {
  x: number
  y: number
  /** Name. */
  n: string
  /** Kind. */
  k: NodeKind
  /** Group id. */
  g: number
  /** Stat lines. */
  s?: string[]
  /** Ascendancy class name, when this node belongs to an ascendancy wheel. */
  a?: string
  /** 1 when this is the ascendancy class node itself. */
  c?: 1
}

export interface PassiveTreeData {
  version: number
  treeName: string
  nodeCount: number
  edgeCount: number
  extent: Extent
  mainExtent: Extent
  classStarts: Record<string, string>
  ascendancies: string[]
  /** Flat undirected pairs: [a0, b0, a1, b1, ...]. */
  edges: number[]
  nodes: Record<string, TreeNodeRaw>
  /** PoB's character base values and quest rewards (CP-5). Absent from older tree data. */
  characterBase?: CharacterBase
}

/** One quest reward as PoB's Config tab offers it: a `stat` defaults on, `options` default to nothing. */
export interface QuestReward {
  /** PoB's config input name (`quest` + description + area + info). */
  key: string
  /** "Act 4: Halls Of The Dead", as PoB names the source. */
  label: string
  stat?: string
  options?: string[]
}

/** What every character starts from in PoB, before any item, passive or quest (`tools/pob2/export/constants.lua`). */
export interface CharacterBase {
  /** Life = perLevel x level + base, plus perStrength x Strength. */
  life: { perLevel: number; base: number; perStrength: number }
  mana: { perLevel: number; base: number; perIntelligence: number }
  spirit: { base: number }
  evasion: { base: number }
  /** Elemental resistances start at the config's penalty (`resistancePenalty`, else `penaltyDefault`); chaos at `chaosBase`. */
  resistance: { penaltyDefault: number; chaosBase: number; max: number }
  questRewards: QuestReward[]
}

export interface Extent {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface TreeNode {
  id: number
  x: number
  y: number
  name: string
  kind: NodeKind
  groupId: number
  stats: string[]
  /** Null for main-tree nodes. */
  ascendancy: string | null
  isAscendancyClassNode: boolean
}

function toNode(id: number, raw: TreeNodeRaw): TreeNode {
  return {
    id,
    x: raw.x,
    y: raw.y,
    name: raw.n,
    kind: raw.k,
    groupId: raw.g,
    stats: raw.s ?? [],
    ascendancy: raw.a ?? null,
    isAscendancyClassNode: raw.c === 1,
  }
}

export class PassiveTree {
  private readonly nodes = new Map<number, TreeNode>()
  private readonly adjacency = new Map<number, number[]>()

  readonly extent: Extent
  readonly mainExtent: Extent
  readonly treeName: string
  readonly ascendancies: string[]
  readonly classStarts: Map<number, string>
  /** Null for tree data built before CP-5. */
  readonly characterBase: CharacterBase | null

  constructor(data: PassiveTreeData) {
    for (const [key, raw] of Object.entries(data.nodes ?? {})) {
      const id = Number(key)
      if (Number.isInteger(id)) this.nodes.set(id, toNode(id, raw))
    }

    const edges = data.edges ?? []
    for (let i = 0; i + 1 < edges.length; i += 2) {
      const a = edges[i]!
      const b = edges[i + 1]!
      let listA = this.adjacency.get(a)
      if (!listA) this.adjacency.set(a, (listA = []))
      listA.push(b)
      let listB = this.adjacency.get(b)
      if (!listB) this.adjacency.set(b, (listB = []))
      listB.push(a)
    }

    this.extent = data.extent
    this.mainExtent = data.mainExtent ?? data.extent
    this.treeName = data.treeName
    this.ascendancies = data.ascendancies ?? []
    this.classStarts = new Map(Object.entries(data.classStarts ?? {}).map(([k, v]) => [Number(k), v]))
    this.characterBase = data.characterBase ?? null
  }

  get size(): number {
    return this.nodes.size
  }

  node(id: number): TreeNode | null {
    return this.nodes.get(id) ?? null
  }

  neighbours(id: number): number[] {
    return this.adjacency.get(id) ?? []
  }

  /** Every edge as an [a, b] pair. Undirected; each pair appears once. */
  *edgePairs(): Generator<[number, number]> {
    for (const [a, neighbours] of this.adjacency) {
      for (const b of neighbours) if (a < b) yield [a, b]
    }
  }

  allNodes(): IterableIterator<TreeNode> {
    return this.nodes.values()
  }
}

export interface ResolvedAllocation {
  /** Nodes resolved against the tree, for the live weapon set. */
  live: TreeNode[]
  main: TreeNode[]
  set1: TreeNode[]
  set2: TreeNode[]
  /** Allocated on the ascendancy wheels. */
  ascendancy: TreeNode[]
  /** Allocated on the main tree, excluding ascendancy. */
  mainTree: TreeNode[]
  notables: TreeNode[]
  keystones: TreeNode[]
  jewelSockets: TreeNode[]
  /**
   * Allocated ids with no entry in the tree data. NOT a broken build — the game
   * would not allow one. It means this data set is missing those nodes, and
   * that is what gets reported.
   */
  unresolvedIds: number[]
  /**
   * The same, per saved allocation. `unresolvedIds` covers the live allocation
   * only; a missing node in the other weapon set would otherwise vanish.
   */
  unresolvedBySet: { main: number[]; set1: number[]; set2: number[] }
  /**
   * Connected groups within the live allocation, largest first.
   *
   * More than one is NORMAL and must never be reported as a broken build. A
   * group never crosses the ascendancy boundary, so the wheel is its own group
   * even though the class start links it to the main tree. On the main
   * reference code: the main tree (107, with the class start), the Martial
   * Artist wheel (9), and 7 single notables a radius jewel (Controlled
   * Metamorphosis) allocates without a link (PB-11).
   */
  components: AllocationComponent[]
}

export interface AllocationComponent {
  kind: 'main-tree' | 'ascendancy' | 'detached'
  /** Ascendancy class name for `ascendancy` groups. */
  ascendancy: string | null
  nodes: TreeNode[]
}

function resolve(tree: PassiveTree, ids: number[]): { found: TreeNode[]; missing: number[] } {
  const found: TreeNode[] = []
  const missing: number[] = []
  for (const id of ids) {
    const node = tree.node(id)
    if (node) found.push(node)
    else missing.push(id)
  }
  return { found, missing }
}

/** Group allocated ids into connected clusters, largest first. */
function findComponents(tree: PassiveTree, ids: number[]): AllocationComponent[] {
  const remaining = new Set(ids.filter((id) => tree.node(id) !== null))
  const groups: TreeNode[][] = []

  while (remaining.size) {
    const start: number = remaining.values().next().value!
    remaining.delete(start)
    const group = [start]
    const stack = [start]
    while (stack.length) {
      const current = stack.pop()!
      const onWheel = tree.node(current)!.ascendancy !== null
      for (const next of tree.neighbours(current)) {
        if (!remaining.has(next)) continue
        // The class start links to the ascendancy wheel; keep the wheel a group of its own.
        if ((tree.node(next)!.ascendancy !== null) !== onWheel) continue
        remaining.delete(next)
        group.push(next)
        stack.push(next)
      }
    }
    groups.push(group.map((id) => tree.node(id)!))
  }

  groups.sort((a, b) => b.length - a.length)

  // The main tree is the group holding a class start, else the largest non-ascendancy group. Any other
  // non-ascendancy group is `detached`: a radius jewel that needs no link, or a link the data lacks; never broken.
  const isWheel = (g: TreeNode[]) => g[0]!.ascendancy !== null
  const main =
    groups.find((g) => !isWheel(g) && g.some((n) => tree.classStarts.has(n.id))) ?? groups.find((g) => !isWheel(g))
  const ordered = main ? [main, ...groups.filter((g) => g !== main)] : groups
  return ordered.map((nodes) => {
    const ascendancy = nodes[0]!.ascendancy
    const kind: AllocationComponent['kind'] = ascendancy ? 'ascendancy' : nodes === main ? 'main-tree' : 'detached'
    return { kind, ascendancy, nodes }
  })
}

/**
 * Resolve a character's allocation against the tree.
 *
 * Respects the weapon-set rule: `live` is main plus the ACTIVE set only, never
 * all three summed.
 */
export function resolveAllocation(tree: PassiveTree, allocation: PassiveAllocation): ResolvedAllocation {
  const live = resolve(tree, allocation.live)
  const main = resolve(tree, allocation.main)
  const set1 = resolve(tree, allocation.set1)
  const set2 = resolve(tree, allocation.set2)

  const ascendancy = live.found.filter((n) => n.ascendancy !== null)
  const mainTree = live.found.filter((n) => n.ascendancy === null)

  return {
    live: live.found,
    main: main.found,
    set1: set1.found,
    set2: set2.found,
    ascendancy,
    mainTree,
    notables: live.found.filter((n) => n.kind === NODE_KIND.notable),
    keystones: live.found.filter((n) => n.kind === NODE_KIND.keystone),
    jewelSockets: live.found.filter((n) => n.kind === NODE_KIND.jewel),
    unresolvedIds: live.missing,
    unresolvedBySet: { main: main.missing, set1: set1.missing, set2: set2.missing },
    components: findComponents(tree, allocation.live),
  }
}

/**
 * Whether the shipped tree data matches the character's tree (HG1-9).
 *
 * poe.ninja reports allocated node ids, not a tree version, so the version is
 * checked by coverage: every allocated id (live and all three sets) must be in
 * the data. Any missing id means the data predates the character's tree, and
 * nothing that rests on the tree's word alone may be trusted.
 */
export interface TreeCheck {
  /** `unchecked`: no tree data was given. */
  status: 'current' | 'stale' | 'unchecked'
  treeName: string | null
  /** Allocated ids the data lacks, ascending. */
  missing: number[]
}

export const TREE_UNCHECKED: Readonly<TreeCheck> = Object.freeze({ status: 'unchecked', treeName: null, missing: [] as number[] })

export function checkTreeVersion(tree: PassiveTree, resolved: ResolvedAllocation): TreeCheck {
  const missing = [
    ...new Set([
      ...resolved.unresolvedIds,
      ...resolved.unresolvedBySet.main,
      ...resolved.unresolvedBySet.set1,
      ...resolved.unresolvedBySet.set2,
    ]),
  ].sort((a, b) => a - b)
  return { status: missing.length ? 'stale' : 'current', treeName: tree.treeName, missing }
}

/**
 * Shortest path from any allocated node to `target`, walking unallocated nodes.
 *
 * Returns the nodes that would need allocating, target last — so `length` is
 * the passive-point cost. Returns null when the target is unreachable or
 * already allocated (the caller must distinguish those, so `cost` is 0 only in
 * the already-allocated case).
 */
export function pathToNode(
  tree: PassiveTree,
  allocatedIds: Iterable<number>,
  target: number,
): { path: TreeNode[]; cost: number } | null {
  const allocated = new Set(allocatedIds)
  if (!tree.node(target)) return null
  if (allocated.has(target)) return { path: [], cost: 0 }

  // Breadth-first from the whole allocated frontier at once, so the result is
  // the cheapest route from anywhere on the current tree.
  const previous = new Map<number, number>()
  const visited = new Set<number>(allocated)
  let frontier = [...allocated]
  if (!frontier.length) return null

  while (frontier.length) {
    const next: number[] = []
    for (const current of frontier) {
      for (const neighbour of tree.neighbours(current)) {
        if (visited.has(neighbour)) continue
        visited.add(neighbour)
        previous.set(neighbour, current)
        if (neighbour === target) {
          const path: TreeNode[] = []
          let step: number | undefined = target
          while (step !== undefined && !allocated.has(step)) {
            const node = tree.node(step)
            if (node) path.unshift(node)
            step = previous.get(step)
          }
          return { path, cost: path.length }
        }
        next.push(neighbour)
      }
    }
    frontier = next
  }
  return null
}
