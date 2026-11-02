import type { CharacterSnapshot } from '@poe2/core'
import type { FarmData, Layer } from './types'

/**
 * Defence layers a character relies on, from its latest snapshot: ES, armour and evasion count when at least the data's
 * share of the largest of the three. Mana and leech are not in a snapshot, so build-aware danger covers the first three.
 * Null when there is nothing to read.
 */
export function layersFromSnapshot(d: FarmData, snap: Pick<CharacterSnapshot, 'energyShield' | 'armour' | 'evasion'> | null | undefined): Layer[] | null {
  if (!snap) return null
  const vals: [Layer, number][] = [['es', snap.energyShield ?? 0], ['armour', snap.armour ?? 0], ['evasion', snap.evasion ?? 0]]
  const max = Math.max(...vals.map(([, v]) => v))
  if (max <= 0) return null
  const share = d.weights.danger.layerDetect.relativeToLargest
  return vals.filter(([, v]) => v >= max * share).map(([k]) => k)
}
