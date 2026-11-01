'use client'

import { useEffect, useState } from 'react'

/** True once a page that scrolls can't scroll further down (2px slack for fractional scroll positions). */
export function atPageBottom(scrollY: number, viewportH: number, pageH: number): boolean {
  return pageH > viewportH && scrollY + viewportH >= pageH - 2
}

/**
 * The id of the section currently being read: the last one whose top has
 * scrolled past a line just under the sticky header. Null until one has.
 * At the bottom of the page it is the last section, which may be too short to
 * ever reach that line (U13b-3).
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
    const last = els[els.length - 1]
    const pick = () => {
      if (atPageBottom(window.scrollY, window.innerHeight, document.documentElement.scrollHeight)) {
        setActive(last.id)
        return
      }
      // Of the sections on screen, the first in document order wins.
      const first = els.find((el) => visible.has(el.id))
      if (first) setActive(first.id)
    }
    // The band's entries stop changing near the end of the page, so the bottom is checked on scroll too.
    let frame = 0
    const onScroll = () => {
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0
          pick()
        })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
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
    return () => {
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [key])

  return [active, setActive]
}
