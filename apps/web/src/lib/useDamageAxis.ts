'use client'

import { useMemo } from 'react'
import { damageAxis, type Analysis, type DamageAxis } from '@poe2/core'
import { useDataFile } from './useDataFile'

/** The damage axis (Batch 3.3): the code's own main-skill TotalDPS + TotalDotDPS against base rare life from monster-stats.json. */
export function useDamageAxis(analysis: Analysis): { axis: DamageAxis | null; ready: boolean } {
  const stats = useDataFile<{ life?: Record<string, number> }>('monster-stats.json')
  const dps = analysis.dps.primary?.totalDps
  return useMemo(() => ({ axis: stats?.life ? damageAxis({ dps, life: stats.life }) : null, ready: stats !== null }), [stats, dps])
}
