'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { useScrollSpy } from '@/hooks/useScrollSpy'

export interface SpyItem {
  id: string
  label: string
  /** A small figure after the label (Findings 7). Left out where there is no cheap, honest count. */
  count?: number
}

/**
 * The section tab bar (X1): a sticky strip under the header, solid so nothing
 * shows through, scrolling sideways on narrow screens. A scroll spy marks the
 * section being read. Links are plain fragment links, so hash handling
 * elsewhere is unaffected.
 *
 * The gold underline is one bar that slides to the current link (U10). Until it
 * has been measured, and without JavaScript, each link draws its own.
 */
export function ScrollSpyNav({ items, label }: { items: SpyItem[]; label: string }) {
  const [active, setActive] = useScrollSpy(items.map((i) => i.id))
  const navRef = useRef<HTMLElement>(null)
  const [ink, setInk] = useState<{ x: number; w: number } | null>(null)

  useLayoutEffect(() => {
    const nav = navRef.current
    if (!nav) return
    // Offsets are within the nav (sticky, so the links' offset parent), and the bar scrolls with the links.
    const place = () => {
      const current = nav.querySelector<HTMLElement>('a[aria-current="true"]')
      setInk(current ? { x: current.offsetLeft, w: current.offsetWidth } : null)
    }
    place()
    const ro = new ResizeObserver(place)
    ro.observe(nav)
    return () => ro.disconnect()
  }, [active])

  return (
    <nav
      ref={navRef}
      aria-label={label}
      data-compact-hide
      data-ink={ink ? '' : undefined}
      className="bar idx tabbar"
    >
      {items.map((item) => {
        const current = item.id === active
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={() => setActive(item.id)}
            aria-current={current ? 'true' : undefined}
          >
            {item.label}
            {item.count !== undefined ? <span className="idx-count tabular">{item.count}</span> : null}
          </a>
        )
      })}
      {ink ? (
        <span aria-hidden className="idx-ink" style={{ width: ink.w, transform: `translateX(${ink.x}px)` }} />
      ) : null}
    </nav>
  )
}
