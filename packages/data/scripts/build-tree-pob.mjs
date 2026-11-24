/**
 * Build the slim passive-tree artifact shipped to the web app from Path of Building 2's own tree.
 *
 * Output: generated/passive-tree.json, the SAME shape build-tree.mjs writes (short node keys, undirected
 * edge list, kinds, ascendancy tags), so `PassiveTree` and the renderer do not change. Closes DATA-1: the tree is now
 * the one PoB loads for a new build (`main.tree[latestTreeVersion]`, pinned in vendor/pob2/PIN.json), so a PoB code's
 * allocated nodes always resolve and a PoB bump refreshes the tree with the rest of the data.
 *
 * ## How it reads PoB
 *
 * tools/pob2/export/tree.lua loads PoB headless and dumps its processed tree (positions, node types, stats,
 * ascendancy names, connections); scripts/pob2/run.mjs runs it. No POB2_DIR, no source file outside this repo.
 *
 * ## What this script decides
 *
 * - **Decorative nodes are dropped.** PoB types mastery art and background pieces `OnlyImage`; they have no stats,
 *   can't be allocated, and PoB itself draws no edge to them. The previous source listed them as ordinary nodes.
 * - **Edges are undirected and de-duplicated**, as before. PoB stores them directed. An edge to a dropped node, to an
 *   id PoB's own tree does not contain, or from a node to itself is not written; the counts are printed.
 * - **Kinds:** class start (PoB `ClassStart`), jewel socket (PoB `Socket`, so the Sinister sockets and Zarokh's Gift
 *   count), keystone, notable, otherwise normal. An ascendancy's own start node is `c: 1`, as before.
 * - **Ascendancy** is PoB's `ascendancyName`, not an icon-folder guess.
 * - **Class starts keep their display labels** (the table below, checked against PoB's `classesStart` so a new class
 *   fails the build instead of going unlabelled). Two classes share a start node in PoE2, so PoB lists both names
 *   there; the label is the one the site already uses.
 *
 * - **`characterBase`** (CP-5): PoB's character base values and quest rewards, from tools/pob2/export/constants.lua.
 *   They ride with the tree because a code's per-stat breakdown (core `pob/code-breakdowns.ts`) needs both at once:
 *   the tree's node lines and the base every character starts from. Read from the vendored PoB, never typed in.
 *
 * Usage: npm run build:tree:pob -w @poe2/data
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pin, pobCommitShort, pobExport, pobSource } from './lib/pob.mjs'
import { writeDataVersion } from './lib/version.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'generated')
const outPath = join(outDir, 'passive-tree.json')

/** Node kinds, ordered by visual weight. */
const KIND = { normal: 0, notable: 1, keystone: 2, jewel: 3, start: 4 }

/** Class start node id -> the label the site shows. Each label must be one of the names PoB lists on that node. */
const CLASS_STARTS = {
  47175: 'Warrior',
  50459: 'Ranger',
  54447: 'Sorceress',
  50986: 'Mercenary',
  61525: 'Druid',
  44683: 'Monk',
}

const tree = pobExport('tree')
const constants = pobExport('constants')

// --- class starts: PoB's set must equal ours ---------------------------------
const pobStarts = new Map(tree.nodes.filter((n) => n.type === 'ClassStart').map((n) => [n.id, n]))
const unlabelled = [...pobStarts.keys()].filter((id) => !(id in CLASS_STARTS))
const unknown = Object.keys(CLASS_STARTS).filter((id) => !pobStarts.has(Number(id)))
const mislabelled = Object.entries(CLASS_STARTS).filter(([id, label]) => !pobStarts.get(Number(id))?.classesStart?.includes(label))
if (unlabelled.length || unknown.length || mislabelled.length) {
  console.error('CLASS_STARTS in build-tree-pob.mjs no longer matches the class start nodes in PoB\'s tree:')
  for (const id of unlabelled) console.error(`  node ${id} (${pobStarts.get(id).classesStart?.join(' / ')}) has no label`)
  for (const id of unknown) console.error(`  node ${id} (${CLASS_STARTS[id]}) is not a class start in PoB`)
  for (const [id, label] of mislabelled) console.error(`  node ${id}: "${label}" is not among ${pobStarts.get(Number(id))?.classesStart?.join(' / ')}`)
  process.exit(1)
}

// --- nodes -------------------------------------------------------------------
const kept = tree.nodes.filter((n) => !n.isOnlyImage && n.x !== undefined && n.y !== undefined)
const decorative = tree.nodes.length - kept.length
const keptIds = new Set(kept.map((n) => n.id))

function kindOf(n) {
  if (n.type === 'ClassStart') return KIND.start
  if (n.type === 'Socket') return KIND.jewel
  if (n.type === 'Keystone') return KIND.keystone
  if (n.type === 'Notable') return KIND.notable
  return KIND.normal
}

const nodes = {}
const ascendancies = new Set()
let minX = Infinity
let maxX = -Infinity
let minY = Infinity
let maxY = -Infinity
// The main tree's own extent, excluding the peripheral ascendancy wheels: the renderer frames against this.
let mainMinX = Infinity
let mainMaxX = -Infinity
let mainMinY = Infinity
let mainMaxY = -Infinity

for (const n of kept) {
  const x = Math.round(n.x)
  const y = Math.round(n.y)
  const entry = { x, y, n: n.name ?? '', k: kindOf(n), g: n.group ?? 0 }
  const stats = (n.stats ?? []).filter((s) => typeof s === 'string' && s.length)
  if (stats.length) entry.s = stats
  if (n.ascendancyName) {
    entry.a = n.ascendancyName
    ascendancies.add(n.ascendancyName)
  }
  // The ascendancy's own start node, e.g. "Deadeye".
  if (n.isAscendancyStart) entry.c = 1
  nodes[n.id] = entry

  if (x < minX) minX = x
  if (x > maxX) maxX = x
  if (y < minY) minY = y
  if (y > maxY) maxY = y
  if (!n.ascendancyName) {
    if (x < mainMinX) mainMinX = x
    if (x > mainMaxX) mainMaxX = x
    if (y < mainMinY) mainMinY = y
    if (y > mainMaxY) mainMaxY = y
  }
}

// --- undirected edge set -----------------------------------------------------
const adjacency = new Map(kept.map((n) => [n.id, new Set()]))
const dropped = { selfLoop: 0, toDecorative: 0, unknownId: 0 }
const allIds = new Set(tree.nodes.map((n) => n.id))
for (const n of kept) {
  for (const other of n.connections) {
    if (other === n.id) dropped.selfLoop++
    else if (!keptIds.has(other)) dropped[allIds.has(other) ? 'toDecorative' : 'unknownId']++
    else {
      adjacency.get(n.id).add(other)
      adjacency.get(other).add(n.id)
    }
  }
}

const edges = []
for (const a of [...adjacency.keys()].sort((p, q) => p - q)) {
  for (const b of [...adjacency.get(a)].sort((p, q) => p - q)) {
    if (a < b) edges.push(a, b)
  }
}

const artifact = {
  version: 1,
  treeName: `PassiveTree-${pin.latestTreeVersion.replace('_', '.')}@${pobCommitShort}`,
  generatedFrom: `${pobSource} passive tree ${pin.latestTreeVersion} (main.tree[latestTreeVersion]), via tools/pob2/export/tree.lua`,
  nodeCount: Object.keys(nodes).length,
  edgeCount: edges.length / 2,
  extent: { minX, maxX, minY, maxY },
  /** Excludes the peripheral ascendancy wheels. Frame against this. */
  mainExtent: { minX: mainMinX, maxX: mainMaxX, minY: mainMinY, maxY: mainMaxY },
  classStarts: CLASS_STARTS,
  ascendancies: [...ascendancies].sort(),
  kinds: KIND,
  /** Flat pairs: [a0, b0, a1, b1, ...]. Undirected, de-duplicated. */
  edges,
  nodes,
  /** PoB's character base values and quest rewards (tools/pob2/export/constants.lua). */
  characterBase: {
    life: constants.life,
    mana: constants.mana,
    spirit: constants.spirit,
    evasion: constants.evasion,
    resistance: constants.resistance,
    questRewards: constants.questRewards,
  },
}

mkdirSync(outDir, { recursive: true })
const json = JSON.stringify(artifact)
writeFileSync(outPath, json)
writeDataVersion(outDir)

const kinds = (k) => Object.values(nodes).filter((n) => n.k === k).length
console.log(`source       ${artifact.generatedFrom}`)
console.log(`tree         ${artifact.treeName}`)
console.log(`nodes        ${artifact.nodeCount} (${decorative} decorative OnlyImage nodes dropped)`)
console.log(`edges        ${artifact.edgeCount} undirected; dropped ${dropped.selfLoop} self-loop, ${dropped.toDecorative} to decorative nodes, ${dropped.unknownId} to ids PoB's tree lacks`)
console.log(`ascendancy   ${Object.values(nodes).filter((n) => n.a).length} nodes across ${artifact.ascendancies.length} ascendancies`)
console.log(`notables     ${kinds(KIND.notable)}`)
console.log(`keystones    ${kinds(KIND.keystone)}`)
console.log(`jewels       ${kinds(KIND.jewel)}`)
console.log(`base         ${artifact.characterBase.questRewards.length} quest rewards; life ${constants.life.perLevel}/level + ${constants.life.base}`)
console.log(`extent       x ${minX}..${maxX}  y ${minY}..${maxY}`)
console.log(`size         ${(json.length / 1024).toFixed(0)} KB raw · ${(gzipSync(json, { level: 9 }).length / 1024).toFixed(0)} KB gzipped`)
console.log(`written      ${outPath}`)
