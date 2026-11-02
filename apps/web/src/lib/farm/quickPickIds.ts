import { farmData } from '@/data/farm'
import type { FarmData, QuickPick } from './types'

/**
 * Quick picks (QP1) ids, kept apart from the engine so Step 1 can import them without pulling swaps/totals into the
 * first-load bundle. Quick-pick loadouts share FP1's `farm.loadouts`, under keys of their own, so a strategy's FP1
 * loadout is never overwritten.
 */
export const QP_KEY_PREFIX = 'qp-'
export const QUICK_HASH_PREFIX = 'quick-'
export const keyOf = (p: Pick<QuickPick, 'id'>) => `${QP_KEY_PREFIX}${p.id}`
export const pickById = (id: string, d: FarmData = farmData) => d.quickPicks.picks.find((p) => p.id === id)
export const pickByKey = (key: string | null | undefined, d: FarmData = farmData) =>
  key && key.startsWith(QP_KEY_PREFIX) ? pickById(key.slice(QP_KEY_PREFIX.length), d) : undefined

/** Danger level 1–3 from the strategy's risk word. */
export const dangerLevel = (risk: string): 1 | 2 | 3 => (risk === 'high' ? 3 : risk === 'medium' ? 2 : 1)
