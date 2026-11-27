'use client'

import { acceptsMax, isTarget, type Target, type TargetStat } from '@poe2/core'
import { createLocalStore } from './localStore'

/**
 * The player's own stat targets (GF1-8), checked by `checkTargets` against the analysed numbers. Kept under its
 * own key, so the saved-progress blob never changes shape for it.
 */
export const TARGETS_KEY = 'poe2-targets'

/** The benchmark the defaults come from; only the numbers its label states are used. */
export const DEFAULT_TARGETS_SOURCE = 'b-pinnacle-readiness'

/** "Have 5,000+ life and 80%+ resistances before pinnacle bosses." */
export const DEFAULT_TARGETS: readonly Target[] = Object.freeze([
  { id: 'd-life', stat: 'life', op: '>=', want: 5000 },
  { id: 'd-fire', stat: 'fireRes', op: '>=', want: 80 },
  { id: 'd-cold', stat: 'coldRes', op: '>=', want: 80 },
  { id: 'd-lightning', stat: 'lightningRes', op: '>=', want: 80 },
])

export const acceptTargets = (v: unknown): boolean => Array.isArray(v) && v.length <= 50 && v.every(isTarget)

export const targetsStore = createLocalStore<readonly Target[]>(TARGETS_KEY, DEFAULT_TARGETS, acceptTargets)

let seq = 0
export function newTarget(stat: TargetStat = 'chaosRes'): Target {
  seq += 1
  return { id: `t-${Date.now().toString(36)}-${seq}`, stat, op: '>=', want: acceptsMax(stat) ? 'max' : 0 }
}

/** Change one target. Switching to a stat that can't take "max" turns a "max" into 0. */
export function patchTarget(list: readonly Target[], id: string, patch: Partial<Omit<Target, 'id'>>): readonly Target[] {
  return list.map((t) => {
    if (t.id !== id) return t
    const next = { ...t, ...patch }
    if (next.want === 'max' && !acceptsMax(next.stat)) next.want = 0
    return next
  })
}

export function removeTarget(list: readonly Target[], id: string): readonly Target[] {
  return list.filter((t) => t.id !== id)
}
