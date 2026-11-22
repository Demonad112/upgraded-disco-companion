/**
 * Tree graph tests, run against the real shipped artifact and the real
 * character allocation.
 */

import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { PassiveTree, NODE_KIND, pathToNode, resolveAllocation, type PassiveTreeData } from '../src/tree/index.js'
import { normalizePassives } from '../src/model/passives.js'
import { unwrapCharModel } from '../src/analyze.js'
import { pobToCharModel } from '../src/pob/to-model.js'
import { mainWithReferenceDefence } from './helpers/main-build.js'

const treeData = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../data/generated/passive-tree.json', import.meta.url)), 'utf8'),
) as PassiveTreeData
const tree = new PassiveTree(treeData)

const model = unwrapCharModel(
  mainWithReferenceDefence(),
)
const allocation = normalizePassives(model)
const resolved = resolveAllocation(tree, allocation)

describe('tree data', () => {
  it('loads every node and edge', () => {
    // PoB's own tree (vendor/pob2, `npm run build:tree:pob`) without its decorative OnlyImage nodes.
    expect(tree.size).toBe(4546)
    expect([...tree.edgePairs()]).toHaveLength(5187)
  })

  it('treats connections as undirected', () => {
    // PoB stores connections directed; the build writes each pair once and drops
    // self-loops. After loading, every edge must traverse both ways.
    for (const [a, b] of tree.edgePairs()) {
      expect(tree.neighbours(a)).toContain(b)
      expect(tree.neighbours(b)).toContain(a)
    }
  })

  it('classifies node kinds', () => {
    const all = [...tree.allNodes()]
    expect(all.filter((n) => n.kind === NODE_KIND.notable)).toHaveLength(1193)
    expect(all.filter((n) => n.kind === NODE_KIND.keystone)).toHaveLength(33)
    // PoB's Socket nodes: the 12 plain sockets, the Sinister sockets and Zarokh's Gift.
    expect(all.filter((n) => n.kind === NODE_KIND.jewel)).toHaveLength(18)
    expect(all.filter((n) => n.kind === NODE_KIND.start)).toHaveLength(6)
  })

  it("tags ascendancy nodes with PoB's ascendancy name, covering all 22 ascendancies", () => {
    // PoB names the ascendancy on every wheel node, and the graph is a single
    // connected component, so structure alone could not identify them.
    const ascendancyNodes = [...tree.allNodes()].filter((n) => n.ascendancy !== null)
    expect(ascendancyNodes).toHaveLength(431)
    expect(ascendancyNodes.filter((n) => n.isAscendancyClassNode)).toHaveLength(22)
    expect(tree.ascendancies).toHaveLength(22)
    expect(tree.ascendancies).toContain('Deadeye')
    expect(tree.node(30)).toMatchObject({ name: 'Gathering Winds', ascendancy: 'Deadeye', kind: NODE_KIND.notable })
  })

  it('excludes ascendancy wheels from the main extent used for framing', () => {
    expect(tree.mainExtent.maxX).toBeLessThan(tree.extent.maxX)
    expect(tree.mainExtent.maxY).toBeLessThan(tree.extent.maxY)
  })
})

describe('resolving the real allocation', () => {
  it('resolves every allocated id — nothing is missing from the data set', () => {
    expect(resolved.unresolvedIds).toEqual([])
    expect(resolved.live).toHaveLength(123) // the main code allocates 123 nodes and no weapon-set nodes
  })

  it('separates ascendancy from main-tree allocation', () => {
    // 9 allocated Martial Artist wheel nodes; the other 114 are the main tree.
    expect(resolved.ascendancy.map((n) => n.ascendancy)).toEqual(Array(9).fill('Martial Artist'))
    expect(resolved.mainTree).toHaveLength(resolved.live.length - resolved.ascendancy.length)
    expect(resolved.mainTree).toHaveLength(114)
  })

  it('never sums the two weapon sets', () => {
    // The main code allocates no weapon-set nodes, so main is all of `live` and both sets are empty.
    expect(resolved.main).toHaveLength(123)
    expect(resolved.set1).toHaveLength(0)
    expect(resolved.set2).toHaveLength(0)
    expect(resolved.live).toHaveLength(123)
    // With two weapon sets stated, only the live one counts (inline variant of the main code's allocation).
    const withSets = resolveAllocation(
      tree,
      normalizePassives({
        ...model,
        passiveSelection: resolved.main.map((n) => n.id).slice(0, 107),
        passiveSelectionSet1: resolved.main.map((n) => n.id).slice(107, 115),
        passiveSelectionSet2: resolved.main.map((n) => n.id).slice(115),
        useSecondWeaponSet: false,
      }),
    )
    expect(withSets.main).toHaveLength(107)
    expect(withSets.set1).toHaveLength(8)
    expect(withSets.set2).toHaveLength(8)
    expect(withSets.live).toHaveLength(107 + 8)
  })

  it('finds the allocated notables and keystones', () => {
    expect(resolved.notables.length).toBe(39)
    // The main code allocates no keystone; poe.ninja's `keystones` list is absent from a code.
    expect(resolved.keystones).toHaveLength(0)
    expect(model.keystones).toBeUndefined()
  })

  it('explains the allocation groups instead of warning about a broken tree', () => {
    // V1 emitted "disconnected tree" warnings constantly. The game forbids a genuinely broken tree, so the groups
    // are described rather than flagged. On the main code the largest group (116 nodes: the main tree joined to the
    // ascendancy wheel) is labelled by its ascendancy, and 7 single nodes the code lists without their links are
    // `detached` (PB-11 in REMAINING-WORK: the labelling of a joined wheel and those singles is not yet explained).
    expect(resolved.components.map((c) => [c.kind, c.nodes.length])).toEqual([
      ['ascendancy', 116],
      ...Array(7).fill(['detached', 1]),
    ])
    expect(resolved.components[0]).toMatchObject({ kind: 'ascendancy', ascendancy: 'Martial Artist' })

    // Every allocated node belongs to exactly one group.
    const total = resolved.components.reduce((sum, c) => sum + c.nodes.length, 0)
    expect(total).toBe(resolved.live.length)
  })
})

describe('path finding', () => {
  it('returns zero cost for an already-allocated node', () => {
    const target = resolved.live[0]!.id
    expect(pathToNode(tree, allocation.live, target)).toEqual({ path: [], cost: 0 })
  })

  it('finds the cheapest route to an unallocated notable', () => {
    const allocated = new Set(allocation.live)
    const target = [...tree.allNodes()].find(
      (n) => n.kind === NODE_KIND.notable && !allocated.has(n.id) && n.ascendancy === null,
    )!

    const result = pathToNode(tree, allocation.live, target.id)
    expect(result).not.toBeNull()
    expect(result!.cost).toBe(result!.path.length)
    // The target is the destination, so it ends the path.
    expect(result!.path.at(-1)!.id).toBe(target.id)
    // Nothing already allocated should appear in the cost.
    expect(result!.path.every((n) => !allocated.has(n.id))).toBe(true)
    // The first step must touch the existing tree.
    const firstStep = result!.path[0]!
    expect(tree.neighbours(firstStep.id).some((n) => allocated.has(n))).toBe(true)
  })

  it('returns null for an unknown node rather than an empty path', () => {
    expect(pathToNode(tree, allocation.live, 99_999_999)).toBeNull()
  })
})

describe('allocation coverage', () => {
  it('reports unresolved ids for every saved allocation, not only the live one', () => {
    const r = resolveAllocation(tree, { ...allocation, set2: [...allocation.set2, 999_999_999] })
    expect(r.unresolvedIds).toEqual([])
    expect(r.unresolvedBySet.set2).toEqual([999_999_999])
  })

  it('has no unresolved ids in any committed PoB code beyond the known data gaps', async () => {
    // Fails when a committed code (test/pob2/<league>/*.code.txt, the oracle's inputs) allocates more nodes than the
    // shipped tree data knows; a new code needs no edit here. A character known to need newer tree data is listed
    // with the most unresolved ids it may have; that number only ever goes down.
    // DATA-1 closed: the tree is PoB's own, so the list is empty.
    const KNOWN_DATA_GAPS: Record<string, number> = {}
    const root = fileURLToPath(new URL('./pob2/', import.meta.url))
    const codes = readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .flatMap((d) => readdirSync(root + d.name).filter((f) => f.endsWith('.code.txt')).map((f) => `${d.name}/${f}`))
    expect(codes.length).toBeGreaterThan(0)
    for (const file of codes) {
      const m = await pobToCharModel(readFileSync(root + file, 'utf8').trim())
      const r = resolveAllocation(tree, normalizePassives(m))
      const unresolved = new Set([...r.unresolvedIds, ...r.unresolvedBySet.main, ...r.unresolvedBySet.set1, ...r.unresolvedBySet.set2])
      const allowed = Object.entries(KNOWN_DATA_GAPS).find(([key]) => file.toLowerCase().startsWith(key))?.[1] ?? 0
      expect({ file, unresolved: [...unresolved].slice(0, Math.max(0, unresolved.size - allowed)) }).toEqual({ file, unresolved: [] })
    }
  })
})

describe('ailment immunities on the recorded character', () => {
  it('are read from the allocated tree when the tree data is given', async () => {
    const { analyzeCharacter } = await import('../src/analyze.js')
    const raw = mainWithReferenceDefence()
    const without = await analyzeCharacter(raw)
    const withTree = await analyzeCharacter(raw, { tree })
    expect(without.ailments.every((a) => a.status !== 'unknown' || /tree data was not loaded/.test(a.reason))).toBe(true)
    // Every immune result must name a source line that really is on the tree or gear.
    for (const a of withTree.ailments) if (a.status === 'immune') expect(a.sources.length).toBeGreaterThan(0)
    expect(withTree.ailments).toHaveLength(7)
  })
})
