'use client'

import { useEffect, useState, type ComponentType } from 'react'
import { useCompanionOn } from '@/lib/companionSetting'

type CompanionComponent = ComponentType

/**
 * Always-loaded shell for the wraith: nothing renders until the browser is
 * idle, then the companion chunk is imported, so first-load JS grows only by
 * this file. Off (footer toggle) renders nothing and loads nothing. The import
 * runs once per page load: the host sits in the root layout, so a client-side
 * navigation (a Reopen included) keeps `Loaded`.
 */
export function CompanionHost() {
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

  return on && Loaded ? <Loaded /> : null
}
