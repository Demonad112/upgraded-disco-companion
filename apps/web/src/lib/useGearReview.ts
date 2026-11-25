'use client'

import { useMemo } from 'react'
import { gearReview, type Analysis, type GearReview } from '@poe2/core'
import type { ModTiersState } from './useModTiers'
import type { SupportCatalogState } from './useSupportCatalog'

/**
 * The Batch 2 gear review (per-slot score, swaps, shared over-cap), once the mod tiers are in. The main skill's tags
 * come from the support catalogue; until it loads the profile has no offence side, so `ready` is false and the
 * gear axis is not shown as final.
 */
export function useGearReview(
  analysis: Analysis,
  tiersState: ModTiersState,
  catalogState: SupportCatalogState,
): { review: GearReview | null; ready: boolean } {
  const tiers = tiersState.status === 'ready' ? tiersState.base : null
  const catalog = catalogState.status === 'ready' ? catalogState.catalog : null
  const skill = analysis.dps.primary?.name ?? null
  return useMemo(() => {
    if (!tiers) return { review: null, ready: false }
    const skillTypes = catalog && skill ? catalog.activeTypes(skill) : null
    return { review: gearReview({ analysis, tiers, skillTypes }), ready: catalog !== null || catalogState.status === 'error' }
  }, [analysis, tiers, catalog, skill, catalogState.status])
}
