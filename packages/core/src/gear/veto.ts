/**
 * Swap veto notes: what a swap could break beyond resistance caps.
 *
 * Only what poe.ninja ships is checked: the sheet's movement speed, spirit and
 * attribute totals, and the attribute requirements printed on the other
 * equipped items. What the item holds up is read from its own rolled stats.
 * Base-bound implicit lines are left out, because the replacement may share
 * the base. A figure that is not on the sheet, or an input poe.ninja does not
 * carry (spirit reserved by skills, gem attribute requirements), prints
 * "Can't check: <input>" and never reads as clear.
 *
 * Notes only. They do not simulate the swap and never feed ordering or grade.
 */

import type { NinjaDefensiveStats } from '../model/types.js'
import type { EquippedItem } from '../model/slots.js'
import type { ItemAnalysis } from './analyze.js'
import type { SpecLine } from './replace.js'

export type VetoCheck = 'movement-speed' | 'spirit' | 'attributes'

export interface VetoNote {
  check: VetoCheck
  /** `risk`: the sheet figures show a loss. `cant-check`: an input is missing. */
  status: 'risk' | 'cant-check'
  text: string
}

export type VetoSheet = Pick<NinjaDefensiveStats, 'spirit' | 'movementSpeed' | 'strength' | 'dexterity' | 'intelligence'>

export interface VetoInput {
  target: ItemAnalysis
  /** The replacement spec; lines it carries are credited at their minimum roll. */
  spec: readonly Pick<SpecLine, 'statId' | 'min'>[]
  /** The other equipped items, for their attribute requirements. */
  others: readonly EquippedItem[]
  /** poe.ninja's `defensiveStats`. Null or undefined when the payload has none. */
  sheet: VetoSheet | null | undefined
}

const MOVE = 'base_movement_velocity_+%'
const SPIRIT = 'base_spirit_from_equipment'
const ATTRIBUTES = [
  { key: 'strength', label: 'Strength', stat: 'additional_strength', req: /\b(Strength|Str)\b/ },
  { key: 'dexterity', label: 'Dexterity', stat: 'additional_dexterity', req: /\b(Dexterity|Dex)\b/ },
  { key: 'intelligence', label: 'Intelligence', stat: 'additional_intelligence', req: /\b(Intelligence|Int)\b/ },
] as const

const num = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)

/** What the item holds up for a stat, excluding base-bound implicit lines. */
function granted(target: ItemAnalysis, statId: string): number {
  let sum = 0
  for (const m of target.mods) {
    if (m.source === 'implicit') continue
    for (const r of m.rolled) if (r.id === statId) sum += r.value
  }
  return sum
}

/** What the replacement spec carries at its minimum rolls, the conservative case. */
function carried(spec: VetoInput['spec'], statId: string): number {
  return spec.filter((l) => l.statId === statId).reduce((a, l) => a + l.min, 0)
}

/** The highest value an item's printed requirement list asks of an attribute, or null. */
function requirementOf(item: EquippedItem, pattern: RegExp): number | null {
  const reqs = item.raw.itemData?.requirements
  if (!Array.isArray(reqs)) return null
  let best: number | null = null
  for (const r of reqs as { name?: unknown; values?: unknown }[]) {
    if (typeof r?.name !== 'string' || !pattern.test(r.name) || !Array.isArray(r.values)) continue
    const v = Number((r.values[0] as unknown[] | undefined)?.[0])
    if (Number.isFinite(v)) best = Math.max(best ?? 0, v)
  }
  return best
}

export function swapVetoes({ target, spec, others, sheet }: VetoInput): VetoNote[] {
  const notes: VetoNote[] = []

  // Movement speed.
  const moveLoss = granted(target, MOVE) - carried(spec, MOVE)
  if (granted(target, MOVE) > 0 && moveLoss > 0) {
    if (num(sheet?.movementSpeed)) {
      notes.push({
        check: 'movement-speed',
        status: 'risk',
        text: `Movement speed would drop from ${sheet.movementSpeed}% to ${sheet.movementSpeed - moveLoss}% unless the replacement carries it (${target.name} gives ${granted(target, MOVE)}%).`,
      })
    } else {
      notes.push({ check: 'movement-speed', status: 'cant-check', text: `Can't check: movement speed, poe.ninja did not send the sheet figure (${target.name} gives ${granted(target, MOVE)}%).` })
    }
  }

  // Spirit. Reserved spirit is not in the payload, so a non-negative total is never called safe.
  const spiritLoss = granted(target, SPIRIT) - carried(spec, SPIRIT)
  if (granted(target, SPIRIT) > 0 && spiritLoss > 0) {
    if (num(sheet?.spirit)) {
      const after = sheet.spirit - spiritLoss
      const move = `Spirit would drop from ${sheet.spirit} to ${after}`
      if (after < 0) notes.push({ check: 'spirit', status: 'risk', text: `${move}, below zero before any reservation (${target.name} gives ${granted(target, SPIRIT)}).` })
      notes.push({ check: 'spirit', status: 'cant-check', text: `Can't check: spirit reserved by your skills, poe.ninja does not send it. ${move}.` })
    } else {
      notes.push({ check: 'spirit', status: 'cant-check', text: `Can't check: spirit, poe.ninja did not send the sheet figure (${target.name} gives ${granted(target, SPIRIT)}).` })
    }
  }

  // Attributes against the requirements printed on the other equipped items.
  let attributeHeld = false
  for (const a of ATTRIBUTES) {
    const loss = granted(target, a.stat) - carried(spec, a.stat)
    if (granted(target, a.stat) <= 0 || loss <= 0) continue
    attributeHeld = true
    const total = sheet?.[a.key]
    if (!num(total)) {
      notes.push({ check: 'attributes', status: 'cant-check', text: `Can't check: ${a.label.toLowerCase()}, poe.ninja did not send the sheet figure (${target.name} gives ${granted(target, a.stat)}).` })
      continue
    }
    const after = total - loss
    for (const o of others) {
      const need = requirementOf(o, a.req)
      if (need !== null && after < need) {
        notes.push({ check: 'attributes', status: 'risk', text: `${a.label} would fall from ${total} to ${after}, below the ${need} that ${o.name} requires.` })
      }
    }
  }
  if (attributeHeld) {
    notes.push({ check: 'attributes', status: 'cant-check', text: "Can't check: gem attribute requirements, they are not compared here." })
  }

  return notes
}
