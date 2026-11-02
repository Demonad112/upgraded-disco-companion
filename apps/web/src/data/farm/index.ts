import raw from './tablets-0.5.5.json'
import type { Confidence, FarmData, FarmSource, TabletMod, WaystoneMod } from '@/lib/farm/types'

/** The fact-check output for patch 0.5.5, typed. Converting the JSON import is one cast; `validateFarmData` checks the shape. */
export const farmData = raw as unknown as FarmData

const modsById = new Map<string, TabletMod | WaystoneMod>()
for (const m of [...farmData.tabletMods, ...farmData.waystoneMods]) modsById.set(m.id, m)
export const findMod = (id: string) => modsById.get(id)

export const sourceById = (id: string): FarmSource | undefined => farmData.sources.find((s) => s.id === id)

/** Every confidence label in the file, counted for the footnote. */
export function countByConfidence(data: FarmData = farmData): Record<Confidence, number> {
  const c: Record<Confidence, number> = { confirmed: 0, single: 0, unverified: 0 }
  const add = (x: Confidence) => { c[x]++ }
  for (const m of data.tabletMods) add(m.confidence)
  for (const m of data.waystoneMods) add(m.confidence)
  for (const n of data.rules.notes) add(n.confidence)
  for (const p of Object.values(data.weights.presets)) for (const w of Object.values(p.weights)) add(w.confidence)
  for (const d of Object.values(data.weights.danger.per_stat)) add(d.confidence)
  return c
}
/** Entries labelled unverified. Zero would mean every value carries a source; the seed file would report all of them. */
export const unverifiedCount = countByConfidence().unverified

export const dataSourcesLabel = (): string =>
  [...new Set(farmData.sources.filter((s) => s.url).map((s) => s.title.split(' — ').pop()!.trim()))].slice(0, 3).join(', ')

/** Structural and referential checks; returns readable errors (empty = valid). Used by tests. */
export function validateFarmData(d: FarmData = farmData): string[] {
  const errs: string[] = []
  const srcIds = new Set(d.sources.map((s) => s.id))
  const statIds = new Set(d.stats.map((s) => s.id))
  const typeIds = new Set(d.tabletTypes.map((t) => t.id))
  const seen = new Set<string>()
  const checkSources = (what: string, ids: string[], conf: Confidence) => {
    if (ids.length === 0 && conf !== 'unverified') errs.push(`${what}: no source and not marked unverified`)
    for (const s of ids) if (!srcIds.has(s)) errs.push(`${what}: unknown source ${s}`)
  }
  if (d.sources.length !== srcIds.size) errs.push('duplicate source ids')
  if (statIds.size !== d.stats.length) errs.push('duplicate stat ids')
  for (const [kind, mods] of [['tablet', d.tabletMods], ['waystone', d.waystoneMods]] as const) {
    for (const m of mods) {
      const w = `${kind} mod ${m.id}`
      if (seen.has(m.id)) errs.push(`${w}: duplicate id`)
      seen.add(m.id)
      if (!statIds.has(m.stat)) errs.push(`${w}: unknown stat ${m.stat}`)
      if (m.tiers.length === 0) errs.push(`${w}: no tiers`)
      for (const t of m.tiers) if (!(t.min <= t.max)) errs.push(`${w}: tier ${t.tier} min > max`)
      if (kind === 'tablet') for (const t of m.tabletTypes) if (t !== 'any' && !typeIds.has(t)) errs.push(`${w}: unknown tablet type ${t}`)
      checkSources(w, m.sources, m.confidence)
    }
  }
  for (const e of d.effectModifiers) checkSources(`effect ${e.id}`, e.sources, 'confirmed')
  for (const [pid, p] of Object.entries(d.weights.presets))
    for (const [stat, w] of Object.entries(p.weights)) {
      if (!statIds.has(stat)) errs.push(`preset ${pid}: unknown stat ${stat}`)
      checkSources(`preset ${pid}/${stat}`, w.sources, w.confidence)
    }
  for (const [stat, r] of Object.entries(d.weights.danger.per_stat)) {
    if (!statIds.has(stat)) errs.push(`danger ${stat}: unknown stat`)
    checkSources(`danger ${stat}`, r.sources, r.confidence)
  }
  for (const [sid, pid] of Object.entries(d.weights.strategyPreset)) if (!d.weights.presets[pid]) errs.push(`strategy ${sid}: unknown preset ${pid}`)
  for (const n of d.rules.notes) checkSources('rule note', n.sources, n.confidence)
  return errs
}
