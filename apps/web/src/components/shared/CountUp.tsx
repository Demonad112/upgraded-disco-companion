'use client'

import { useLayoutEffect, useRef } from 'react'

const DURATION_MS = 220
const easeOut = (t: number) => 1 - (1 - t) ** 3

/**
 * A figure that runs from its last value to the new one instead of jumping, like an instrument needle.
 *
 * React renders the final text; the animation only rewrites that same text node between frames, so a new value
 * mid-run simply takes over. Screen readers get the final value once (the moving copy is aria-hidden). Reduced
 * motion, a missing value or a non-finite one skips straight to the end.
 */
export function CountUp({
  value,
  from,
  format,
  className,
}: {
  value: number | null
  /** Run from this on first render (a figure that appears already changed); otherwise the first value shows as is. */
  from?: number | null
  format: (n: number | null) => string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const shown = useRef<number | null>(from === undefined ? value : from)

  // Layout effect: the cleanup runs in the same commit as React's new text, so no stale frame can land after it.
  useLayoutEffect(() => {
    const node = ref.current?.firstChild
    const start = shown.current
    shown.current = value
    if (!(node instanceof Text)) return
    const still =
      start === null || value === null || start === value || !Number.isFinite(start) || !Number.isFinite(value) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (still) {
      node.nodeValue = format(value)
      return
    }

    const integer = Number.isInteger(start) && Number.isInteger(value)
    const t0 = performance.now()
    let raf = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / DURATION_MS)
      const v = t < 1 ? start + (value - start) * easeOut(t) : value
      // A new value mid-run starts from wherever the figure is now.
      shown.current = v
      node.nodeValue = format(integer ? Math.round(v) : v)
      if (t < 1) raf = requestAnimationFrame(step)
    }
    node.nodeValue = format(start)
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, format])

  const text = format(value)
  return (
    <span className={className}>
      <span ref={ref} aria-hidden>
        {text}
      </span>
      <span className="sr-only">{text}</span>
    </span>
  )
}
