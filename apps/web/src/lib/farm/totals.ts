import { findMod, farmData } from '@/data/farm'
import type { FarmData, Loadout, Totals } from './types'

const round = (n: number) => Math.round(n * 1e4) / 1e4

/** Tablet and Waystone effect scalars from the ticked Atlas passives (off unless ticked). */
export function effectScalars(d: FarmData, l: Loadout): { tablet: number; waystone: number } {
  let tablet = 0
  let waystone = 0
  const n = l.tablets.length
  for (const id of l.options.effects) {
    const e = d.effectModifiers.find((x) => x.id === id)
    if (!e || (e.requires === 'city' && l.options.mapContext !== 'city')) continue
    if (e.applies === 'tablet_mods') tablet += e.value
    else if (e.applies === 'tablet_mods_per_tablet') tablet += e.value * n
    else waystone += e.value * n
  }
  return { tablet: 1 + tablet / 100, waystone: 1 + waystone / 100 }
}

/**
 * Per-stat totals with where each part came from. add: sum; multiply: Π(1 + v/100) − 1 (as a %); flag: occurrences.
 * Values are the picked rolls scaled by the effect scalar; `scalesWithEffect: false` stats stay as rolled.
 */
export function computeTotals(d: FarmData = farmData, l: Loadout): Totals {
  const sc = effectScalars(d, l)
  const statById = new Map(d.stats.map((s) => [s.id, s]))
  const parts = new Map<string, { from: string; value: number }[]>()
  const push = (statId: string, from: string, value: number) => {
    const arr = parts.get(statId)
    if (arr) arr.push({ from, value })
    else parts.set(statId, [{ from, value }])
  }
  const take = (from: string, list: { modId: string; value: number }[], scalar: number) => {
    for (const p of list) {
      const m = findMod(p.modId)
      const st = m && statById.get(m.stat)
      if (!m || !st) continue
      push(m.stat, from, st.combine === 'flag' ? 1 : round(p.value * (st.scalesWithEffect ? scalar : 1)))
    }
  }
  l.tablets.forEach((t, i) => {
    take(`Tablet ${i + 1}`, t.prefixes, sc.tablet)
    take(`Tablet ${i + 1}`, t.suffixes, sc.tablet)
  })
  take('Waystone', l.waystone.prefixes, sc.waystone)
  take('Waystone', l.waystone.suffixes, sc.waystone)
  const out: Totals = {}
  for (const [id, sources] of parts) {
    const st = statById.get(id)!
    let total: number
    if (st.combine === 'multiply') total = (sources.reduce((acc, s) => acc * (1 + s.value / 100), 1) - 1) * 100
    else total = sources.reduce((acc, s) => acc + s.value, 0)
    out[id] = { total: round(total), sources }
  }
  return out
}
