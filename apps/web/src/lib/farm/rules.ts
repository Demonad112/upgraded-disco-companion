import { farmData, findMod } from '@/data/farm'
import type { FarmData, Loadout, MapContext, ModPick, Side, Tablet, TabletMod, WaystoneBuild, WaystoneMod } from './types'

export interface Limits { prefix: number; suffix: number; total: number }
export type Subject = { kind: 'tablet'; tablet: Tablet } | { kind: 'waystone'; waystone: WaystoneBuild }

export const maxTablets = (d: FarmData, ctx: MapContext) => (ctx === 'standard' ? d.rules.maxTabletsPerMap : d.rules.maxTabletsPerCityMap)

export function tabletLimits(d: FarmData, t: Pick<Tablet, 'rarity'>, keystones: boolean): Limits {
  const r = d.rules.rarity
  if (t.rarity === 'magic') return { prefix: r.magic.prefix, suffix: r.magic.suffix, total: r.magic.prefix + r.magic.suffix }
  return { prefix: r.rare.prefix, suffix: r.rare.suffix, total: keystones ? r.rare.totalWithKeystones : r.rare.totalBase }
}

/** A tier-16 Waystone is always corrupted (only the Vaal Orb makes one). */
export const isCorrupted = (d: FarmData, w: WaystoneBuild) => w.corrupted || w.tier >= d.rules.waystoneMaxTier

export function waystoneLimits(d: FarmData, w: WaystoneBuild): Limits {
  const r = d.rules
  if (isCorrupted(d, w)) return { ...r.waystoneSides.corrupted, total: r.waystoneMaxModsCorrupted }
  if (w.rarity === 'magic') return { prefix: r.waystoneMagicMaxMods, suffix: r.waystoneMagicMaxMods, total: r.waystoneMagicMaxMods }
  return { ...r.waystoneSides.normal, total: r.waystoneMaxMods }
}

export function limitsOf(d: FarmData, s: Subject, keystones: boolean): Limits {
  return s.kind === 'tablet' ? tabletLimits(d, s.tablet, keystones) : waystoneLimits(d, s.waystone)
}

const picksOf = (s: Subject): ModPick[] => {
  const x = s.kind === 'tablet' ? s.tablet : s.waystone
  return [...x.prefixes, ...x.suffixes]
}

/** Room left on a side, honouring both the side cap and the total cap. */
export function roomOn(d: FarmData, s: Subject, side: Side, keystones: boolean): number {
  const lim = limitsOf(d, s, keystones)
  const x = s.kind === 'tablet' ? s.tablet : s.waystone
  const used = side === 'prefix' ? x.prefixes.length : x.suffixes.length
  return Math.max(0, Math.min(lim[side] - used, lim.total - x.prefixes.length - x.suffixes.length))
}

/**
 * Mods that may sit on this side of this tablet or Waystone: right pool, right type, and no modGroup already on it
 * (a mod being replaced does not count against itself).
 */
export function legalMods(d: FarmData, s: Subject, side: Side, replacing?: ModPick | null): (TabletMod | WaystoneMod)[] {
  const pool: (TabletMod | WaystoneMod)[] = s.kind === 'tablet' ? d.tabletMods : d.waystoneMods
  const taken = new Set<string>()
  for (const p of picksOf(s)) {
    if (replacing && p === replacing) continue
    const m = findMod(p.modId)
    if (m) taken.add(m.modGroup)
  }
  return pool.filter(
    (m) =>
      m.affix === side &&
      !taken.has(m.modGroup) &&
      (s.kind === 'waystone' || m.tabletTypes.includes('any') || m.tabletTypes.includes(s.tablet.type)),
  )
}

const side2 = (n: number, one: string, many: string) => (n === 1 ? `${n} ${one}` : `${n} ${many}`)

function validateSubject(d: FarmData, label: string, s: Subject, keystones: boolean, errs: string[]) {
  const x = s.kind === 'tablet' ? s.tablet : s.waystone
  const lim = limitsOf(d, s, keystones)
  const noun = s.kind === 'tablet' ? `${x.rarity === 'magic' ? 'Magic' : 'Rare'} tablets` : isCorrupted(d, s.waystone) ? 'Corrupted Waystones' : `${x.rarity === 'magic' ? 'Magic' : 'Rare'} Waystones`
  if (x.prefixes.length > lim.prefix) errs.push(`${label}: ${noun} have ${side2(lim.prefix, 'prefix', 'prefixes')}`)
  if (x.suffixes.length > lim.suffix) errs.push(`${label}: ${noun} have ${side2(lim.suffix, 'suffix', 'suffixes')}`)
  if (x.prefixes.length <= lim.prefix && x.suffixes.length <= lim.suffix && x.prefixes.length + x.suffixes.length > lim.total)
    errs.push(`${label}: ${noun} have ${lim.total} modifiers at most`)
  const groups = new Set<string>()
  for (const [side, list] of [['prefix', x.prefixes], ['suffix', x.suffixes]] as const) {
    for (const p of list) {
      const m = findMod(p.modId)
      if (!m) { errs.push(`${label}: unknown modifier ${p.modId}`); continue }
      const isTabletMod = d.tabletMods.some((t) => t.id === m.id)
      if (isTabletMod !== (s.kind === 'tablet')) errs.push(`${label}: ${m.id} is not a ${s.kind} modifier`)
      if (m.affix !== side) errs.push(`${label}: ${m.id} is a ${m.affix}, not a ${side}`)
      if (s.kind === 'tablet' && !m.tabletTypes.includes('any') && !m.tabletTypes.includes(s.tablet.type)) errs.push(`${label}: ${m.id} does not roll on ${s.tablet.type} tablets`)
      if (groups.has(m.modGroup)) errs.push(`${label}: two modifiers of group ${m.modGroup}`)
      groups.add(m.modGroup)
      const tier = m.tiers.find((t) => t.tier === p.tier)
      if (!tier) errs.push(`${label}: ${m.id} has no tier ${p.tier}`)
      else if (p.value < tier.min || p.value > tier.max) errs.push(`${label}: ${m.id} value ${p.value} is outside ${tier.min}–${tier.max}`)
    }
  }
}

/** Readable errors for a loadout; empty when legal. */
export function validate(d: FarmData, l: Loadout): string[] {
  const errs: string[] = []
  const cap = maxTablets(d, l.options.mapContext)
  if (l.tablets.length > cap) errs.push(`At most ${cap} tablets can affect this map`)
  l.tablets.forEach((t, i) => validateSubject(d, `Tablet ${i + 1}`, { kind: 'tablet', tablet: t }, l.options.keystones, errs))
  validateSubject(d, 'Waystone', { kind: 'waystone', waystone: l.waystone }, l.options.keystones, errs)
  if (l.waystone.tier < 1 || l.waystone.tier > d.rules.waystoneMaxTier) errs.push(`Waystone tier must be 1–${d.rules.waystoneMaxTier}`)
  for (const id of l.options.effects) {
    const e = d.effectModifiers.find((x) => x.id === id)
    if (!e) errs.push(`Unknown Atlas passive ${id}`)
    else if (e.requires === 'city' && l.options.mapContext !== 'city') errs.push(`${e.id} applies on City maps only`)
  }
  return errs
}

export const defaultRules = () => farmData.rules
