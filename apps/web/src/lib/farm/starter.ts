import { farmData } from '@/data/farm'
import { allSwaps, applySwap } from './swaps'
import type { ScoreOptions } from './score'
import type { FarmData, Loadout } from './types'

/** Tablet type the farm's preset points at (its mechanic), else the generic Irradiated tablet. */
export function typeForPreset(d: FarmData, presetId: string): string {
  const t = d.tabletTypes.find((x) => x.mechanic === presetId)
  return t ? t.id : 'irradiated'
}

/**
 * A first loadout: empty rare tablets of the farm's type and an empty rare Waystone, filled by taking the best Net addition
 * until each is full. Deterministic, and built from the same swap search the page uses.
 */
export function starterLoadout(d: FarmData = farmData, strategyId: string, presetId: string, o: ScoreOptions, tablets = 2): Loadout {
  const type = typeForPreset(d, presetId)
  let l: Loadout = {
    strategyId,
    tablets: Array.from({ length: tablets }, () => ({ type, rarity: 'rare' as const, prefixes: [], suffixes: [] })),
    waystone: { tier: d.rules.waystoneMaxNaturalTier, rarity: 'rare', corrupted: false, prefixes: [], suffixes: [] },
    options: { mapContext: 'standard', keystones: false, effects: [] },
  }
  for (let guard = 0; guard < 64; guard++) {
    const adds = allSwaps(d, l, o).filter((s) => s.from === null && s.netDelta > 1e-9)
    if (adds.length === 0) break
    l = applySwap(l, adds[0]!)
  }
  return l
}
