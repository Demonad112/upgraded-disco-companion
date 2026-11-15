'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { appliedTier, chooseFx, fxStore, useFx, type FxChoice, type Tier } from '@/lib/fxTier'

const NAME: Record<Tier, string> = { full: 'Full', lite: 'Lite', still: 'Still' }

/**
 * Footer "Visual effects": Auto (what detection picked, as it is on screen
 * now), Full, Lite, Still. Also starts the auto checks (lib/fxProbe, its own
 * chunk) once the browser is idle after first paint.
 */
export function FxTierControl() {
  const { choice } = useFx()
  const shown = useSyncExternalStore(fxStore.subscribe, appliedTier, () => 'full' as Tier)

  useEffect(() => {
    const go = () => void import('@/lib/fxProbe').then((m) => m.probe()).catch(() => {})
    const ric = typeof window.requestIdleCallback === 'function'
    const h = ric ? window.requestIdleCallback(go, { timeout: 4000 }) : window.setTimeout(go, 1500)
    return () => (ric ? window.cancelIdleCallback(h) : window.clearTimeout(h))
  }, [])

  return (
    <label className="flex items-center gap-2">
      Visual effects
      <select className="select" value={choice} onChange={(e) => chooseFx(e.target.value as FxChoice)}>
        <option value="auto">Auto: {NAME[choice === 'auto' ? shown : fxStore.get().auto]}</option>
        <option value="full">Full</option>
        <option value="lite">Lite</option>
        <option value="still">Still</option>
      </select>
    </label>
  )
}
