import { farmData } from '@/data/farm'
import { scoreLoadout } from './score'
import type { FarmData, Layer, Loadout } from './types'

export type FitVerdict = 'fits' | 'harder' | 'even'

export interface BuildFit {
  /** Build-aware danger / generic danger of the loadout; null when the loadout carries no danger mods. */
  ratio: number | null
  verdict: FitVerdict | null
}

/**
 * R36 "Fits your build". The farm's saved loadout is scored twice: generic danger, then danger rated for the build's
 * layers. Below `fitsBuild.maxRatio` it fits (its hazards hit this build's layers less than the average build); above
 * 1 / maxRatio it is harder. Null when the loadout carries no danger mods: there is nothing to compare, and the data
 * holds no farm-specific hazards, so an unsaved farm gets no badge rather than a guessed one.
 */
export function buildFit(d: FarmData = farmData, loadout: Loadout, presetId: string, layers: Layer[]): BuildFit {
  const generic = { presetId, risk: 'balanced' as const, layers: null }
  const g = scoreLoadout(d, loadout, generic).danger
  if (g <= 1e-9) return { ratio: null, verdict: null }
  const ratio = scoreLoadout(d, loadout, { ...generic, layers }).danger / g
  const max = d.weights.danger.fitsBuild.maxRatio
  const eps = 1e-9
  return { ratio, verdict: ratio < max - eps ? 'fits' : ratio > 1 / max + eps ? 'harder' : 'even' }
}
