'use client'

import { useEffect, useState } from 'react'

/**
 * The id of the section currently being read: the last one whose top has
 * scrolled past a line just under the sticky header. Null until one has.
 */
export function useScrollSpy(ids: readonly string[]): [string | null, (id: string) => void] {
  const [active, setActive] = useState<string | null>(null)
  const key = ids.join('|')

  useEffect(() => {
    const els = key
      .split('|')
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)
    if (!els.length || typeof IntersectionObserver === 'undefined') return
    const navH = parseFloat(getComputedStyle(document.documentElement).fontSize) * 4
    const visible = new Set<string>()
    const pick = () => {
      // Of the sections on screen, the first in document order wins.
      const first = els.find((el) => visible.has(el.id))
      if (first) setActive(first.id)
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add((e.target as HTMLElement).id)
          else visible.delete((e.target as HTMLElement).id)
        }
        pick()
      },
      // A band from just under the header to ~40% down the viewport.
      { rootMargin: `-${Math.round(navH + 56)}px 0px -60% 0px` },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [key])

  return [active, setActive]
}
