'use client'

/**
 * The character page's tabs (PX4): a sticky tab strip and one panel at a time. Roving tabindex, Left/Right move and
 * activate, Home/End jump. A horizontal swipe on the panel changes tab, unless the gesture starts inside something that
 * scrolls sideways or is a slider, or the movement is mostly vertical.
 */

import { useEffect, useRef, type KeyboardEvent, type ReactNode, type TouchEvent } from 'react'
import type { TabId } from '@/lib/characterTab'
import '@/styles/character-tabs.css'

export interface TabDef {
  id: TabId
  label: string
  /** A small figure after the label, only where there is an honest count. */
  count?: number
}

/** Horizontal travel that counts as a swipe: about a seventh of a 390 px screen. */
export const SWIPE_PX = 56

/** Whether a touch that began on `el` should be left to that element: sideways scrollers, sliders, charts. */
export function ownsHorizontalGesture(el: Element | null, stop: Element): boolean {
  for (let n: Element | null = el; n && n !== stop; n = n.parentElement) {
    if (n.closest('input[type="range"], [data-no-swipe]') === n) return true
    if (n instanceof HTMLElement) {
      const ox = getComputedStyle(n).overflowX
      if ((ox === 'auto' || ox === 'scroll') && n.scrollWidth > n.clientWidth + 1) return true
    }
  }
  return false
}

export function CharacterTabs({
  tabs,
  active,
  onSelect,
  children,
}: {
  tabs: TabDef[]
  active: TabId
  onSelect: (id: TabId) => void
  children: ReactNode
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const start = useRef<{ x: number; y: number; own: boolean } | null>(null)
  const index = tabs.findIndex((t) => t.id === active)

  // Keep the active tab in view in the strip, and the strip in view when a link far down the page changes tab.
  useEffect(() => {
    const list = listRef.current
    const current = list?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (!list || !current) return
    list.scrollTo?.({ left: current.offsetLeft - (list.clientWidth - current.offsetWidth) / 2, behavior: 'auto' })
    if (list.getBoundingClientRect().top < 0) list.scrollIntoView({ block: 'start' })
  }, [active])

  const go = (to: number, focus: boolean) => {
    const next = tabs[(to + tabs.length) % tabs.length]
    if (!next) return
    onSelect(next.id)
    if (focus) listRef.current?.querySelector<HTMLElement>(`#tab-${next.id}`)?.focus()
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') go(index + 1, true)
    else if (e.key === 'ArrowLeft') go(index - 1, true)
    else if (e.key === 'Home') go(0, true)
    else if (e.key === 'End') go(tabs.length - 1, true)
    else return
    e.preventDefault()
  }

  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    const t = e.touches[0]
    if (!t || e.touches.length > 1) return void (start.current = null)
    start.current = { x: t.clientX, y: t.clientY, own: ownsHorizontalGesture(e.target as Element, e.currentTarget) }
  }
  const onTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    const s = start.current
    start.current = null
    const t = e.changedTouches[0]
    if (!s || s.own || !t) return
    const dx = t.clientX - s.x
    const dy = t.clientY - s.y
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return
    const to = index + (dx < 0 ? 1 : -1)
    if (to >= 0 && to < tabs.length) go(to, false)
  }

  return (
    <>
      <div ref={listRef} role="tablist" aria-label="Character sections" className="ct-bar">
        {tabs.map((t) => {
          const selected = t.id === active
          return (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              className="ct-tab"
              onClick={() => onSelect(t.id)}
              onKeyDown={onKey}
            >
              {t.label}
              {t.count !== undefined ? <span className="ct-count tabular">{t.count}</span> : null}
            </button>
          )
        })}
      </div>
      <div
        key={active}
        id={`panel-${active}`}
        role="tabpanel"
        aria-labelledby={`tab-${active}`}
        tabIndex={0}
        className="ct-panel"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </>
  )
}
