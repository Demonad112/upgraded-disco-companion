'use client'

import { useEffect, useState, type ComponentType } from 'react'
import type { CompanionSeed } from '@/lib/companion'
import { useCompanionOn } from '@/lib/companionSetting'

type CompanionComponent = ComponentType<{ seed: CompanionSeed }>

/**
 * Always-loaded shell for the mock companion: nothing renders until the browser is idle, then the launcher chunk is
 * imported, so it adds no first-load JavaScript beyond this file. Off (footer toggle or "Turn off") renders nothing.
 */
export function CompanionHost({ seed }: { seed: CompanionSeed }) {
  const on = useCompanionOn()
  const [Loaded, setLoaded] = useState<CompanionComponent | null>(null)

  useEffect(() => {
    if (!on || Loaded) return
    let cancelled = false
    const go = () => {
      void import('./Companion').then((m) => {
        if (!cancelled) setLoaded(() => m.default)
      })
    }
    // Safari has no requestIdleCallback.
    const ric = typeof window.requestIdleCallback === 'function'
    const h = ric ? window.requestIdleCallback(go, { timeout: 4000 }) : window.setTimeout(go, 1500)
    return () => {
      cancelled = true
      if (ric) window.cancelIdleCallback(h)
      else window.clearTimeout(h)
    }
  }, [on, Loaded])

  return on && Loaded ? <Loaded seed={seed} /> : null
}
