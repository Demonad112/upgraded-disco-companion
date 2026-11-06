import type { CharacterSnapshot } from '@poe2/core'
import type { FarmData, Layer } from './types'

/**
 * Defence layers a character relies on, from its latest snapshot: ES, armour and evasion count when at least the data's
 * share of the largest of the three; mana counts when Mind Over Matter is allocated; recovery counts when gear leeches
 * as life or ES (passive and gem leech are not read). Snapshots older than those flags give the first three only.
 * Null when there is nothing to read.
 */
export function layersFromSnapshot(
  d: FarmData,
  snap: Pick<CharacterSnapshot, 'energyShield' | 'armour' | 'evasion' | 'manaBeforeLife' | 'gearLeech'> | null | undefined,
): Layer[] | null {
  if (!snap) return null
  const vals: [Layer, number][] = [['es', snap.energyShield ?? 0], ['armour', snap.armour ?? 0], ['evasion', snap.evasion ?? 0]]
  const max = Math.max(...vals.map(([, v]) => v))
  const share = d.weights.danger.layerDetect.relativeToLargest
  const out: Layer[] = max > 0 ? vals.filter(([, v]) => v >= max * share).map(([k]) => k) : []
  if (snap.manaBeforeLife) out.push('mana')
  if (snap.gearLeech) out.push('recovery')
  return out.length ? out : null
}

/** Plain names for the defence layers, as the planner shows them. */
export const LAYER_LABEL: Readonly<Record<Layer, string>> = Object.freeze({
  es: 'ES',
  armour: 'armour',
  evasion: 'evasion',
  mana: 'mana (Mind Over Matter)',
  recovery: 'leech',
})
