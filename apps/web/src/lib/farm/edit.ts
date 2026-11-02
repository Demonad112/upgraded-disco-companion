import { findMod } from '@/data/farm'
import { limitsOf, type Subject } from './rules'
import { withPick, type SwapTarget } from './swaps'
import type { FarmData, Loadout, MapContext, ModPick, Tablet, WaystoneBuild } from './types'

type Picked = { prefixes: ModPick[]; suffixes: ModPick[] }

/** Drop picks (suffixes first, then the last of each side) until the side caps and the total cap hold. */
function trim<T extends Picked>(x: T, lim: { prefix: number; suffix: number; total: number }): T {
  let prefixes = x.prefixes.slice(0, lim.prefix)
  let suffixes = x.suffixes.slice(0, lim.suffix)
  while (prefixes.length + suffixes.length > lim.total) {
    if (suffixes.length >= prefixes.length) suffixes = suffixes.slice(0, -1)
    else prefixes = prefixes.slice(0, -1)
  }
  return { ...x, prefixes, suffixes }
}

const mapTablet = (l: Loadout, i: number, fn: (t: Tablet) => Tablet): Loadout => ({ ...l, tablets: l.tablets.map((t, j) => (j === i ? fn(t) : t)) })

export function setTabletRarity(d: FarmData, l: Loadout, i: number, rarity: Tablet['rarity']): Loadout {
  return mapTablet(l, i, (t) => {
    const next = { ...t, rarity }
    return trim(next, limitsOf(d, { kind: 'tablet', tablet: next }, l.options.keystones))
  })
}

/** Changing the type keeps only the mods that also roll on the new type. */
export function setTabletType(l: Loadout, i: number, type: string): Loadout {
  const ok = (p: ModPick) => {
    const m = findMod(p.modId)
    return !!m && (m.tabletTypes.includes('any') || m.tabletTypes.includes(type))
  }
  return mapTablet(l, i, (t) => ({ ...t, type, prefixes: t.prefixes.filter(ok), suffixes: t.suffixes.filter(ok) }))
}

export function setWaystone(d: FarmData, l: Loadout, patch: Partial<Pick<WaystoneBuild, 'tier' | 'rarity' | 'corrupted'>>): Loadout {
  const next = { ...l.waystone, ...patch }
  const s: Subject = { kind: 'waystone', waystone: next }
  return { ...l, waystone: trim(next, limitsOf(d, s, l.options.keystones)) }
}

export function setMapContext(l: Loadout, mapContext: MapContext): Loadout {
  const effects = mapContext === 'city' ? l.options.effects : l.options.effects.filter((id) => id !== 'city-tablet-effect')
  return { ...l, options: { ...l.options, mapContext, effects } }
}

export function removePick(l: Loadout, t: SwapTarget): Loadout {
  const cut = <T extends Picked>(x: T): T => {
    const key = t.side === 'prefix' ? 'prefixes' : 'suffixes'
    return { ...x, [key]: x[key].filter((_, i) => i !== t.slot) }
  }
  if (t.index < l.tablets.length) return mapTablet(l, t.index, cut)
  return { ...l, waystone: cut(l.waystone) }
}

export { withPick }
