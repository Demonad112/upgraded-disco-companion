/**
 * Charm overkill: a charm or flask line that raises a value already at its cap (plan
 * the V1 plan (deleted; `git show 2e9c146:docs/plans/simple-code-analysis.md`), Batch 2.3). "+25% to Fire Resistance" on a charm does nothing while fire
 * resistance is capped. This is the only analysis of charms and flasks; everything else about them is listed.
 *
 * Read from the item text and the code's own resistance totals. A resistance whose value or cap the code does not
 * carry is never flagged: unknown is not capped. A line raising the cap itself ("Maximum Fire Resistance") is
 * never overkill.
 */

import type { ResistanceState } from '../defense/index.js'

export interface UtilityItemLines {
  slot: string
  name: string
  lines: readonly string[]
}

export interface OverkillFlag {
  slot: string
  name: string
  line: string
  types: ResistanceState['type'][]
  reason: string
}

const RES_LINE = /^[+-]?(\d+(?:\.\d+)?)% to (fire|cold|lightning|chaos|all elemental) resistances?$/i
const ELEMENTAL: ResistanceState['type'][] = ['fire', 'cold', 'lightning']

export function findCharmOverkill(items: readonly UtilityItemLines[], resistances: readonly ResistanceState[]): OverkillFlag[] {
  const state = new Map(resistances.map((r) => [r.type, r]))
  const out: OverkillFlag[] = []
  for (const item of items) {
    for (const line of item.lines) {
      const m = RES_LINE.exec(line.trim())
      if (!m || Number(m[1]) <= 0) continue
      const which = m[2]!.toLowerCase()
      const types = which === 'all elemental' ? ELEMENTAL : [which as ResistanceState['type']]
      const rs = types.map((t) => state.get(t))
      if (!rs.every((r) => r && r.value !== null && r.max !== null && r.value >= r.max)) continue
      const caps = rs.map((r) => r!.max!)
      const label = types.length > 1 ? 'All elemental resistances are' : `${types[0]![0]!.toUpperCase()}${types[0]!.slice(1)} resistance is`
      const capText = new Set(caps).size === 1 ? `its cap of ${caps[0]}%` : `their caps (${caps.map((c) => `${c}%`).join(', ')})`
      out.push({
        slot: item.slot,
        name: item.name,
        line,
        types,
        reason: `${label} already at ${types.length > 1 ? capText.replace('its', 'their') : capText}, so this line adds nothing. Another modifier on that slot would do more.`,
      })
    }
  }
  return out
}
