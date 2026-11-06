'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useScrollSpy } from '@/hooks/useScrollSpy'
import { sectionAngles } from '@/lib/astrolabe'

interface SpyItem {
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
/** One square per section on the astrolabe's outer ring (components/fx/Astrolabe), the current one solid gold. */
function AstrolabeTicks({ ids, active }: { ids: string[]; active: string | null }) {
  const [target, setTarget] = useState<SVGGElement | null>(null)
  const [angles, setAngles] = useState<number[]>([])
  const key = ids.join('|')

  useEffect(() => {
    const g = document.querySelector<SVGGElement>('[data-astro-sections]')
    if (!g) return
    const root = document.documentElement
    const place = () => {
      const sweep = parseFloat(getComputedStyle(root).getPropertyValue('--astro-sweep')) || 330
      const line = parseFloat(getComputedStyle(root).fontSize) * 4 + 56
      const tops = key.split('|').map((id) => (document.getElementById(id)?.getBoundingClientRect().top ?? 0) + scrollY)
      setAngles(sectionAngles(tops, root.scrollHeight - innerHeight, sweep, line))
      setTarget(g)
    }
    // The observer's first call comes right after observe(), so it also places the ticks the first time.
    const ro = new ResizeObserver(place)
    ro.observe(document.body)
    return () => ro.disconnect()
  }, [key])

  if (!target) return null
  return createPortal(
    ids.map((id, i) => (
      <rect
        key={id}
        className="astro-section"
        data-current={id === active ? '' : undefined}
        x="-3"
        y="-98"
        width="6"
        height="6"
        transform={`rotate(${(angles[i] ?? 0).toFixed(1)})`}
      />
    )),
    target,
  )
}

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
      <AstrolabeTicks ids={items.map((i) => i.id)} active={active} />
    </nav>
  )
}
