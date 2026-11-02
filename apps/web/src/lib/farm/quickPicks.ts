import { findMod } from '@/data/farm'
import { subjectAt, allSwaps, type Swap, type SwapTarget } from './swaps'
import { changeSign, type Change, type ScoreOptions } from './score'
import type { FarmData, Loadout, ModPick, QuickPick, Side, Totals } from './types'

/** Quick picks (QP1). Pure helpers over the FP1 engine; every number comes from the data or the engine. */

export { QP_KEY_PREFIX, QUICK_HASH_PREFIX, keyOf, pickById, pickByKey, dangerLevel } from './quickPickIds'

/** A fresh copy of the recommended loadout, so edits never touch the data. */
export const recommendedLoadout = (p: QuickPick): Loadout => structuredClone(p.recommended)

/** "Abyss" from "Abyss Tablet". */
export const typeName = (d: FarmData, type: string) => (d.tabletTypes.find((t) => t.id === type)?.name ?? type).replace(/ Tablet$/, '')

/** Chip text: the mod's short label with this value (a roll, or a range for the shopping list). */
export function modLabel(d: FarmData, modId: string, value: number | string): string {
  const tpl = d.quickPicks.labels[modId]
  if (tpl) return tpl.replace('{v}', String(value))
  return (findMod(modId)?.text ?? modId).replace(/\(\d+–\d+\)/, String(value))
}

/** The tier's range as "min-max" (or one number), for the shopping list. */
export function rangeOf(p: ModPick): string {
  const t = findMod(p.modId)?.tiers.find((x) => x.tier === p.tier)
  if (!t) return String(p.value)
  return t.min === t.max ? String(t.min) : `${t.min}-${t.max}`
}

export interface ChipSlot { target: SwapTarget; pick: ModPick }

/**
 * The picks on a tablet or the Waystone, reward first: a tablet's mechanic suffixes before its prefixes; the Waystone's
 * reward prefixes before its danger suffixes.
 */
export function chipsOf(l: Loadout, index: number): ChipSlot[] {
  const s = subjectAt(l, index)
  const x = s.kind === 'tablet' ? s.tablet : s.waystone
  const order: Side[] = s.kind === 'tablet' ? ['suffix', 'prefix'] : ['prefix', 'suffix']
  return order.flatMap((side) => (side === 'prefix' ? x.prefixes : x.suffixes).map((pick, slot) => ({ target: { index, side, slot }, pick })))
}

export const targetId = (t: SwapTarget) => `${t.index}-${t.side}-${t.slot}`

/** Plain text, one line per tablet and the Waystone, ready to paste into notes or a message. */
export function shoppingList(d: FarmData, l: Loadout, title: string): string {
  const lines = [`${title}${l.options.mapContext === 'city' ? ' (City map)' : ''}`]
  l.tablets.forEach((t, i) => {
    const mods = chipsOf(l, i).map((c) => modLabel(d, c.pick.modId, rangeOf(c.pick)))
    lines.push(`Tablet ${i + 1} ${typeName(d, t.type)} ${t.rarity}: ${mods.join(', ') || 'no mods'}`)
  })
  const w = l.waystone
  const wm = chipsOf(l, l.tablets.length).map((c) => modLabel(d, c.pick.modId, rangeOf(c.pick)))
  lines.push(`Waystone T${w.tier} ${w.rarity}${w.corrupted ? ' corrupted' : ''}: ${wm.join(', ') || 'no mods'}`)
  return lines.join('\n')
}

/** The best n alternatives for one slot: allSwaps() filtered to that slot, so the order and tie-break are swaps.ts's. */
export function alternatives(d: FarmData, l: Loadout, o: ScoreOptions, t: SwapTarget, n = 3): Swap[] {
  return allSwaps(d, l, o)
    .filter((s) => s.from !== null && s.target.index === t.index && s.target.side === t.side && s.target.slot === t.slot)
    .slice(0, n)
}

export interface NetWords { sign: 1 | 0 | -1; marker: '▲' | '▼' | ''; text: string }

/** "Better by 6%" / "Worse by 4%" in words, rounded exactly as formatChange() rounds. */
export function netWords(c: Change): NetWords {
  if (c.kind === 'none') return { sign: 0, marker: '', text: 'Same Net' }
  if (c.kind === 'new') return { sign: 1, marker: '▲', text: 'Adds to Net' }
  const r = Math.abs(Number(c.pct.toFixed(0)))
  if (r === 0) return { sign: 0, marker: '', text: 'About the same' }
  return changeSign(c) > 0 ? { sign: 1, marker: '▲', text: `Better by ${r}%` } : { sign: -1, marker: '▼', text: `Worse by ${r}%` }
}

export interface StatLine { id: string; name: string; danger: boolean; text: string }

/** A stat total as "+18%", "+3" or "12 s". */
export function formatTotal(d: FarmData, statId: string, total: number): string {
  const st = d.stats.find((s) => s.id === statId)
  const n = Number(total.toFixed(2))
  if (!st) return String(n)
  if (st.combine === 'flag') return String(n)
  return `${n >= 0 ? '+' : '−'}${Math.abs(n)}${st.unit}`
}

/** "What the map has": danger lines first, then what counts most toward this preset's reward, then the rest by name. */
export function statLines(d: FarmData, totals: Totals, presetId: string): StatLine[] {
  const weights = d.weights.presets[presetId]?.weights ?? {}
  return Object.entries(totals)
    .map(([id, t]) => {
      const st = d.stats.find((s) => s.id === id)
      return { id, st, t, weight: (weights[id]?.value ?? 0) * t.total }
    })
    .filter((x) => !!x.st)
    .sort(
      (a, b) =>
        Number(b.st!.danger) - Number(a.st!.danger) ||
        b.weight - a.weight ||
        a.st!.name.localeCompare(b.st!.name),
    )
    .map(({ id, st, t }) => ({ id, name: st!.name, danger: st!.danger, text: formatTotal(d, id, t.total) }))
}

/** True when every alternative leaves Net where it is (the preset does not count this mod). */
export const allSame = (alts: { net: Change }[]) => alts.length > 0 && alts.every((s) => netWords(s.net).sign === 0)

/** Disagreement notes that apply to this loadout (Waystone always; a tablet type when present). */
export function disagreementsFor(d: FarmData, l: Loadout) {
  const types = new Set(l.tablets.map((t) => t.type))
  return d.quickPicks.disagreements.filter((x) => x.appliesTo === 'waystone' || types.has(x.appliesTo))
}
