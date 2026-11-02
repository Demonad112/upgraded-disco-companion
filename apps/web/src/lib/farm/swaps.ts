import { farmData, findMod } from '@/data/farm'
import { legalMods, roomOn, type Subject } from './rules'
import { changeSign, pctChange, scoreLoadout, type Change, type ScoreOptions } from './score'
import type { FarmData, Loadout, ModPick, Score, Side } from './types'

/** Where a swap lands: tablet index, or the Waystone (index = tablets.length). */
export interface SwapTarget { index: number; side: Side; slot: number }

export interface Swap {
  target: SwapTarget
  from: ModPick | null
  to: ModPick
  after: Score
  reward: Change
  danger: Change
  net: Change
  netDelta: number
}

const SIDES: Side[] = ['prefix', 'suffix']

export function subjectAt(l: Loadout, index: number): Subject {
  return index < l.tablets.length ? { kind: 'tablet', tablet: l.tablets[index]! } : { kind: 'waystone', waystone: l.waystone }
}

/** A roll at the same relative position in the new range (an empty slot takes the middle), on the nearest tier. */
export function rollFor(modId: string, from: ModPick | null): ModPick {
  const m = findMod(modId)!
  const oldMod = from && findMod(from.modId)
  const oldTier = oldMod?.tiers.find((t) => t.tier === from!.tier)
  const pos = from && oldTier ? (oldTier.max > oldTier.min ? (from.value - oldTier.min) / (oldTier.max - oldTier.min) : 1) : 0.5
  const want = from?.tier ?? 1
  const tier = m.tiers.reduce((best, t) => (Math.abs(t.tier - want) < Math.abs(best.tier - want) ? t : best), m.tiers[0]!)
  return { modId, tier: tier.tier, value: Math.round(tier.min + pos * (tier.max - tier.min)) }
}

export function withPick(l: Loadout, t: SwapTarget, pick: ModPick): Loadout {
  const key = t.side === 'prefix' ? 'prefixes' : 'suffixes'
  const patch = <T extends { prefixes: ModPick[]; suffixes: ModPick[] }>(x: T): T => {
    const list = [...x[key]]
    list[t.slot] = pick
    return { ...x, [key]: list }
  }
  if (t.index < l.tablets.length) return { ...l, tablets: l.tablets.map((x, i) => (i === t.index ? patch(x) : x)) }
  return { ...l, waystone: patch(l.waystone) }
}

export const applySwap = (l: Loadout, s: Swap): Loadout => withPick(l, s.target, s.to)

/** Every legal single-mod replacement or addition, scored, best Net first. Ties break by tablet, side, slot, mod id. */
export function allSwaps(d: FarmData = farmData, l: Loadout, o: ScoreOptions): Swap[] {
  const base = scoreLoadout(d, l, o)
  const out: Swap[] = []
  const count = l.tablets.length + 1
  for (let index = 0; index < count; index++) {
    const subject = subjectAt(l, index)
    const x = subject.kind === 'tablet' ? subject.tablet : subject.waystone
    for (const side of SIDES) {
      const list = side === 'prefix' ? x.prefixes : x.suffixes
      const slots: (ModPick | null)[] = [...list]
      if (roomOn(d, subject, side, l.options.keystones) > 0) slots.push(null)
      slots.forEach((from, slot) => {
        for (const m of legalMods(d, subject, side, from)) {
          if (from && from.modId === m.id) continue
          const to = rollFor(m.id, from)
          const after = scoreLoadout(d, withPick(l, { index, side, slot }, to), o)
          out.push({
            target: { index, side, slot }, from, to, after,
            reward: pctChange(base.reward, after.reward),
            danger: pctChange(base.danger, after.danger),
            net: pctChange(base.net, after.net),
            netDelta: after.net - base.net,
          })
        }
      })
    }
  }
  return out.sort(
    (a, b) =>
      b.netDelta - a.netDelta ||
      a.target.index - b.target.index ||
      (a.target.side === b.target.side ? 0 : a.target.side === 'prefix' ? -1 : 1) ||
      a.target.slot - b.target.slot ||
      (a.to.modId < b.to.modId ? -1 : a.to.modId > b.to.modId ? 1 : 0),
  )
}

/** The n best swaps that raise Net. */
export function bestSwaps(d: FarmData = farmData, l: Loadout, o: ScoreOptions, n = 3): Swap[] {
  return allSwaps(d, l, o).filter((s) => s.netDelta > 1e-9).slice(0, n)
}

/** Net change if each candidate mod were chosen for one slot, for the picker labels. */
export function netLabels(d: FarmData, l: Loadout, o: ScoreOptions, t: SwapTarget): Map<string, Change> {
  const subject = subjectAt(l, t.index)
  const x = subject.kind === 'tablet' ? subject.tablet : subject.waystone
  const from = (t.side === 'prefix' ? x.prefixes : x.suffixes)[t.slot] ?? null
  const base = scoreLoadout(d, l, o)
  const out = new Map<string, Change>()
  for (const m of legalMods(d, subject, t.side, from)) {
    const after = scoreLoadout(d, withPick(l, t, rollFor(m.id, from)), o)
    out.set(m.id, pctChange(base.net, after.net))
  }
  return out
}

export { changeSign }
