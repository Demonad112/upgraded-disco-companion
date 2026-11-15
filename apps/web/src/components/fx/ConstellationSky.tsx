'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Fixed, slowly rotating gold constellation sky behind the whole site. Dark
 * theme only. The dim behind blocks is CSS (globals.css, lib/skyDim), so the
 * sky reads at 35% behind them and at full strength in the gaps.
 */
export function ConstellationSky() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pathname = usePathname()
  // Set by the effect below; lets a route change or toggle repaint a still sky.
  const kickRef = useRef<() => void>(() => {})

  useEffect(() => {
    kickRef.current()
  }, [pathname])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let stop: (() => void) | null = null
    let dead = false
    // The painter is its own chunk: fetched at mount, so the first frame lands just after hydration.
    import('./sky/engine')
      .then(({ startSky }) => {
        if (!dead) stop = startSky(canvas, kickRef)
      })
      .catch(() => {})
    return () => {
      dead = true
      stop?.()
    }
  }, [])

  return (
    <>
      <canvas ref={canvasRef} aria-hidden className="sky-canvas" data-fx="sky" />
      <div aria-hidden className="sky-scrim" data-fx="sky-scrim" />
    </>
  )
}
