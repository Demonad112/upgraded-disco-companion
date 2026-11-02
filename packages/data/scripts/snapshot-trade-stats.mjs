/**
 * Snapshot the trade2 stats listing into packages/data/trade2-stats.json.
 *
 * Run by the owner, not in CI:
 *   TRADE_SNAPSHOT_CONTACT=<contact> npm run snapshot:trade-stats -w @poe2/data
 *
 * One GET, no retries, no mirrors. Entries keep `id`, `text` and `type` exactly
 * as the site returned them; `group` is the label of the group they came in.
 * `patch` is the game version of generated/bases.json, i.e. the data patch this
 * app ships, not something the trade site states.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SOURCE = 'https://www.pathofexile.com/api/trade2/data/stats'
const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

const contact = process.env.TRADE_SNAPSHOT_CONTACT
if (!contact || !contact.trim()) {
  console.error('TRADE_SNAPSHOT_CONTACT is not set. Set it to a contact the site operator can reach (it goes in the User-Agent), then run again.')
  process.exit(1)
}

const version = JSON.parse(readFileSync(join(root, '..', '..', 'package.json'), 'utf8')).version ?? '0.0.0'
const bases = JSON.parse(readFileSync(join(root, 'generated', 'bases.json'), 'utf8'))
const patch = bases.gameVersion
if (typeof patch !== 'string' || !patch) {
  console.error('generated/bases.json has no gameVersion; cannot stamp the snapshot.')
  process.exit(1)
}

const res = await fetch(SOURCE, { headers: { 'User-Agent': `poe2-endgame-companion/${version} (contact: ${contact.trim()})` } })
if (!res.ok) {
  console.error(`GET ${SOURCE} failed: ${res.status} ${res.statusText}`)
  process.exit(1)
}
const body = await res.json()
if (!Array.isArray(body?.result)) {
  console.error('Unexpected response: no result array.')
  process.exit(1)
}

const entries = []
for (const group of body.result) {
  for (const e of group.entries ?? []) {
    entries.push({ id: e.id, text: e.text, type: e.type, group: group.label })
  }
}

writeFileSync(join(root, 'trade2-stats.json'), JSON.stringify({ patch, fetchedAt: new Date().toISOString(), source: SOURCE, entries }, null, 2) + '\n')
console.log(`Wrote ${entries.length} entries (patch ${patch}).`)
