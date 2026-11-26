/**
 * Stat swaps: a line the gear score lists as wasted becomes "this line could be X instead" (plan
 * the V1 plan (deleted; `git show 2e9c146:docs/plans/simple-code-analysis.md`), Batch 2.2).
 *
 * - The wasted lines come from `scoreGear`: resistance above the cap (each type's over-cap already spent once
 *   across items, so two lines never both claim the same points) and stats outside the build's profile.
 * - X is an affix of the same kind (prefix for a prefix, suffix for a suffix) that can spawn on the item's base
 *   by the spawn rules, from a group the item does not already carry, and that grants either a resistance still
 *   under its cap or a stat the profile values. Short resistances come first, biggest gap first; then the
 *   highest-weighted valued stat.
 * - The tier offered is the best the item's own level allows; a better tier that needs a new base is named
 *   beside it. A partly wasted resistance line says how far below the cap removing it would leave you, and is
 *   offered only when at least `GEAR_SCORE.swapMinWasteShare` of it is waste.
 *
 * Pure. Nothing is simulated: every figure is the code's own resistance totals and the affix data.
 */

import { GEAR_SCORE } from '../thresholds.js'
import type { ResistanceState } from '../defense/index.js'
import type { ItemAnalysis } from '../gear/analyze.js'
import { resistanceTypesOf, scoreWeight, type GearScoreReport, type WastedStat } from '../gear/score.js'
import type { AffixKind, LadderEntry, ModTiers } from '../gear/tiers.js'

export interface SwapCandidate {
  modId: string
  affix: string | null
  /** The affix's line with its roll range, as the game shows it. */
  text: string | null
  tier: number
  ilvl: number
  statIds: string[]
  /** False when no tier of this affix fits the item's level: it needs a new base. */
  reachableOnThisItem: boolean
  /** The best tier on this base when it needs a higher item level than the item has. */
  betterOnNewBase: { modId: string; tier: number; ilvl: number; text: string | null } | null
  /** The under-cap resistance this would close, with the points sure to close (its lowest roll, up to the gap). */
  closes: { type: ResistanceState['type']; points: number } | null
  /** Why it is offered, in plain words. */
  reason: string
}

export interface StatSwap {
  slotId: number
  slotLabel: string
  itemName: string
  kind: WastedStat['kind']
  line: { modId: string; text: string; statId: string; value: number; wasted: number | null; affixKind: AffixKind }
  /** Resistances that would fall below the cap if the line were removed, by how much. Empty when it is all waste. */
  belowCapAfter: { type: ResistanceState['type']; points: number }[]
  candidates: SwapCandidate[]
  cost: string
  /** One or two sentences for the reader (`docs/COPY.md`). */
  sentence: string
  /** The same advice without the affix name and tier, for the Overview (those sit behind Pro detail there). */
  plain: string
}

export interface StatSwapInput {
  report: GearScoreReport
  /** The same analysed items the report was made from. */
  items: readonly ItemAnalysis[]
  tiers: ModTiers
  resistances: readonly ResistanceState[]
}

/** Every wasted line that has at least one concrete replacement, biggest waste first (off-profile lines last). */
export function findStatSwaps(input: StatSwapInput): StatSwap[] {
  const { report, tiers } = input
  const importance = new Map(report.weights.map((w) => [w.statId, w.importance]))
  const short = new Map<ResistanceState['type'], number>()
  for (const r of input.resistances) if (typeof r.underCap === 'number' && r.underCap > 0) short.set(r.type, r.underCap)
  const capped = new Set(input.resistances.filter((r) => r.underCap === 0).map((r) => r.type))

  // Biggest waste first (off-profile lines last), so the largest line claims a short resistance first; once a
  // swap's first choice is sure to close a gap, later swaps no longer offer that resistance for it.
  const size = (w: WastedStat) => (w.kind === 'over-cap' ? (w.amount ?? 0) : -1)
  const queue = report.slots
    .flatMap((slot) => slot.wasted.map((w) => ({ slot, w })))
    .sort((a, b) => size(b.w) - size(a.w) || a.slot.slotId - b.slot.slotId)

  const out: StatSwap[] = []
  const seen = new Set<string>()
  for (const { slot, w } of queue) {
    const item = input.items.find((i) => i.slotId === slot.slotId && i.active)
    const tags = item ? tiers.tagsForBase(item.baseType) : null
    const key = `${slot.slotId}|${w.modId}`
    if (!item || !tags || seen.has(key)) continue
    // A resistance line that is mostly holding the cap is not worth recrafting: removing it costs more than it frees.
    if (w.kind === 'over-cap' && (w.amount ?? 0) < GEAR_SCORE.swapMinWasteShare * w.value) continue
    const mod = item.mods.find((m) => m.id === w.modId)
    if (!mod?.kind) continue
    seen.add(key)
    const groupsOnItem = new Set(item.mods.map((m) => (m.id ? tiers.raw(m.id)?.g : undefined)).filter((g): g is string => !!g))

    const reachable = tiers.available(mod.kind, tags, item.itemLevel !== null ? { maxIlvl: item.itemLevel } : {})
    const reachableByGroup = new Map(reachable.map((e) => [groupOf(tiers, e), e]))
    const candidates: (SwapCandidate & { rank: number })[] = []
    for (const best of tiers.available(mod.kind, tags)) {
      const group = groupOf(tiers, best)
      if (groupsOnItem.has(group)) continue
      const offer = reachableByGroup.get(group) ?? best
      const pick = rankEntry(offer, report, importance, short, capped)
      if (!pick) continue
      candidates.push({
        modId: offer.id,
        affix: offer.affix,
        text: offer.text,
        tier: offer.tier,
        ilvl: offer.ilvl,
        statIds: offer.stats.map((x) => x.id),
        reachableOnThisItem: reachableByGroup.has(group),
        betterOnNewBase: offer.id !== best.id ? { modId: best.id, tier: best.tier, ilvl: best.ilvl, text: best.text } : null,
        closes: pick.closes,
        reason: pick.reason,
        rank: pick.rank,
      })
    }
    candidates.sort((a, b) => b.rank - a.rank || Number(b.reachableOnThisItem) - Number(a.reachableOnThisItem) || a.tier - b.tier || a.modId.localeCompare(b.modId))
    const top = candidates.slice(0, GEAR_SCORE.swapCandidates).map(({ rank: _rank, ...c }) => c)
    if (!top.length) continue
    const first = top[0]!
    if (first.closes) {
      const left = (short.get(first.closes.type) ?? 0) - first.closes.points
      if (left > 0) short.set(first.closes.type, left)
      else short.delete(first.closes.type)
    }

    const belowCapAfter =
      w.kind === 'over-cap' && w.amount !== null && w.amount < w.value
        ? resistanceTypesOf(w.statId).map((type) => ({ type, points: w.value - w.amount! }))
        : []
    out.push({
      slotId: slot.slotId,
      slotLabel: slot.slotLabel,
      itemName: slot.name,
      kind: w.kind,
      line: { modId: w.modId, text: w.text, statId: w.statId, value: w.value, wasted: w.amount, affixKind: mod.kind },
      belowCapAfter,
      candidates: top,
      cost: item.corrupted
        ? 'This item is corrupted, so its lines cannot be changed. The swap needs a replacement item.'
        : `Recraft one ${mod.kind} on ${slot.name}; the rest of the item stays.`,
      sentence: sentenceFor(slot.slotLabel, w, first, belowCapAfter),
      plain: sentenceFor(slot.slotLabel, w, first, belowCapAfter, false),
    })
  }
  return out
}

function groupOf(tiers: ModTiers, e: LadderEntry): string {
  return tiers.raw(e.id)?.g ?? e.id
}

/**
 * Why an affix is worth offering, and how strongly. Null when it is not: it grants nothing the build values, or
 * only a resistance that is already capped.
 */
function rankEntry(
  e: LadderEntry,
  report: GearScoreReport,
  importance: ReadonlyMap<string, number>,
  short: ReadonlyMap<ResistanceState['type'], number>,
  capped: ReadonlySet<ResistanceState['type']>,
): { rank: number; closes: SwapCandidate['closes']; reason: string } | null {
  let best: { rank: number; closes: SwapCandidate['closes']; reason: string } | null = null
  for (const s of e.stats) {
    const types = resistanceTypesOf(s.id)
    if (types.length) {
      const gaps = types.filter((t) => short.has(t))
      if (!gaps.length || types.some((t) => capped.has(t) && !short.has(t))) continue
      const type = gaps.sort((a, b) => short.get(b)! - short.get(a)!)[0]!
      const gap = short.get(type)!
      const cand = { rank: 10 + gap, closes: { type, points: Math.min(gap, s.min) }, reason: `Your ${type} resistance is ${gap}% under the cap.` }
      if (!best || cand.rank > best.rank) best = cand
      continue
    }
    const w = scoreWeight(report.profile, importance, s.id)
    if (w.factor < 1) continue
    const cand = { rank: w.weight, closes: null, reason: `Your build uses ${w.families.join(' and ').replace(/-/g, ' ')} stats.` }
    if (!best || cand.rank > best.rank) best = cand
  }
  return best
}

function sentenceFor(slot: string, w: WastedStat, c: SwapCandidate, below: StatSwap['belowCapAfter'], detail = true): string {
  const what =
    w.kind === 'over-cap'
      ? `${slot}: ${w.amount}% ${resLabel(w.statId)} on this line is over the cap.`
      : `${slot}: ${w.text} does nothing for your build.`
  const tierNote = c.reachableOnThisItem ? `${c.affix ?? c.modId}, tier ${c.tier}` : `${c.affix ?? c.modId}, tier ${c.tier}, needs item level ${c.ilvl}`
  const drop = below.length ? ` Swapping it drops ${below.map((b) => `${b.type} resistance ${b.points}%`).join(' and ')} below the cap, so make that up elsewhere.` : ''
  return `${what} It could be ${c.text ?? c.modId}${detail ? ` (${tierNote})` : ''} instead.${drop}`
}

function resLabel(statId: string): string {
  const types = resistanceTypesOf(statId)
  return types.length > 1 ? 'all elemental resistance' : `${types[0] ?? 'this'} resistance`
}
