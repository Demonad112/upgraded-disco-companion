'use client'

import { useMemo } from 'react'
import { damageAxis, headlineDps, type Analysis, type DamageAxis } from '@poe2/core'
import { useDataFile } from './useDataFile'

/** The damage axis (Batch 3.3): the code's own main-skill TotalDPS (the same figure the hero shows) against base rare life from monster-stats.json. */
export function useDamageAxis(analysis: Analysis): { axis: DamageAxis | null; ready: boolean } {
  const stats = useDataFile<{ life?: Record<string, number> }>('monster-stats.json')
  const dps = headlineDps(analysis.dps.primary)?.value
  return useMemo(() => ({ axis: stats?.life ? damageAxis({ dps, life: stats.life }) : null, ready: stats !== null }), [stats, dps])
}
