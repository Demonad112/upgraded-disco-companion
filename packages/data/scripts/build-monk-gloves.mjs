/**
 * Build the Martial Artist glove-transform table.
 *
 * Martial Artist rewrites the stats on gloves/hand wraps. poe.ninja ships the
 * transformed mod (id "HandWraps<SourceId>", e.g. HandWrapsAddedColdDamage7), so
 * the craftable ladder has to be looked up by the SOURCE mod id.
 *
 * Source: vaisest/PathOfBuilding-PoE2, branch monk-export,
 *         python-stuff/monk_gloves.txt (MIT, via Path of Building).
 * Shape of the input:
 *   === <SourceModId> ===
 *   <source line(s)> => <transformed line>
 *                    => <further transformed line>
 *
 * Output: generated/monk-gloves.json  [{ modId, source, transformed }]
 *   modId        source mod id (the craftable mod the transform starts from)
 *   source       the untransformed line(s)
 *   transformed  what the Martial Artist gets instead, one entry per line
 *
 * Usage: node packages/data/scripts/build-monk-gloves.mjs [url-or-path]
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const source =
  process.argv[2] ??
  'https://raw.githubusercontent.com/vaisest/PathOfBuilding-PoE2/monk-export/python-stuff/monk_gloves.txt'
const outDir = join(here, '..', 'generated')
const outPath = join(outDir, 'monk-gloves.json')

const text = /^https?:/.test(source)
  ? await fetch(source).then((r) => {
      if (!r.ok) throw new Error(`${source} returned ${r.status}`)
      return r.text()
    })
  : readFileSync(source, 'utf8')

const entries = []
let current = null
for (const raw of text.split(/\r?\n/)) {
  const head = /^=== (\S+) ===$/.exec(raw)
  if (head) {
    current = { modId: head[1], source: [], transformed: [] }
    entries.push(current)
    continue
  }
  if (!current || !raw.trim()) continue
  const arrow = raw.indexOf('=>')
  if (arrow === -1) continue
  const left = raw.slice(0, arrow).trim()
  const right = raw.slice(arrow + 2).trim()
  if (left) current.source.push(left)
  if (right) current.transformed.push(right)
}

const out = entries
  .filter((e) => e.transformed.length)
  .map((e) => ({ modId: e.modId, source: e.source.join(' / '), transformed: e.transformed }))

mkdirSync(outDir, { recursive: true })
writeFileSync(outPath, JSON.stringify(out) + '\n')
process.stdout.write(`monk-gloves.json: ${out.length} entries from ${entries.length} blocks\n`)
