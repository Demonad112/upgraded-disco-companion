/**
 * Copy the generated data artifacts into public/ so the static export ships them.
 *
 * A script rather than an inline `node -e`: that one-liner grew to three files
 * and template literals, and backticks inside an npm script inside a shell get
 * eaten before node ever sees them.
 *
 * The copies in public/ are generated and gitignored.
 */

import { copyFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveTradeStatMapFromSnapshot } from '@poe2/core'

const here = dirname(fileURLToPath(import.meta.url))
const from = join(here, '..', '..', '..', 'packages', 'data', 'generated')
const to = join(here, '..', 'public')

const FILES = ['passive-tree.json', 'monster-stats.json', 'pob-skills.json', 'bases.json', 'atlas-tree.json']

// Trade stat snapshot: lives beside generated/ because the owner records it by hand.
const TRADE_STATS = join(here, '..', '..', '..', 'packages', 'data', 'trade2-stats.json')

mkdirSync(to, { recursive: true })
copyFileSync(TRADE_STATS, join(to, 'trade2-stats.json'))
process.stdout.write('  trade2-stats.json\n')

// Trimmed map for Top fixes / Gear targets: internal stat id -> trade id, resolved from the snapshot at build time so
// the browser needn't fetch the 1.4 MB listing for a handful of ids. Same resolver the client used; empty without a snapshot.
const snapshot = JSON.parse(readFileSync(TRADE_STATS, 'utf8'))
const tradeMap = {}
for (const s of resolveTradeStatMapFromSnapshot(snapshot)) if (s.tradeId) tradeMap[s.internalId] = s.tradeId
writeFileSync(join(to, 'trade-map.json'), JSON.stringify({ patch: snapshot.patch, fetchedAt: snapshot.fetchedAt, map: tradeMap }) + '\n')
process.stdout.write(`  trade-map.json (${Object.keys(tradeMap).length} ids)\n`)
// mod-tiers.json: the browser copy drops `displayOnly` (implicit/corrupted/unique text, half the bytes) into
// mod-display.json, fetched only when a mod has no craftable ladder. The MCP server keeps the full file.
const tiersFull = JSON.parse(readFileSync(join(from, 'mod-tiers.json'), 'utf8'))
const { displayOnly, ...tiersTrim } = tiersFull
writeFileSync(join(to, 'mod-tiers.json'), JSON.stringify(tiersTrim) + '\n')
writeFileSync(join(to, 'mod-display.json'), JSON.stringify({ displayOnly: displayOnly ?? {} }) + '\n')
process.stdout.write('  mod-tiers.json + mod-display.json (split)\n')
for (const file of FILES) {
  const source = join(from, file)
  copyFileSync(source, join(to, file))
  process.stdout.write(`  ${file} (${(statSync(source).size / 1024 / 1024).toFixed(2)} MB)\n`)
}
