'use client'

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react'
import { Button } from '@/components/shared/controls'
import { useAtlasMap } from './AtlasMapContext'

const PHONE = '(max-width: 720px)'
const subscribePhone = (cb: () => void) => {
  const mq = window.matchMedia(PHONE)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
const isPhone = () => window.matchMedia(PHONE).matches

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'

/**
 * The map's frame. From 721px up it is the plain card it always was (inline, or the sticky right column). On phones
 * (styles/atlas.css) it is a full-screen dialog that a row's Map button opens: focus stays inside while it is open,
 * Escape and Close shut it, and so does the back gesture (opening pushes one history entry).
 */
export function AtlasMapSheet({ children }: { children: ReactNode }) {
  const { open, setOpen } = useAtlasMap()
  const phone = useSyncExternalStore(subscribePhone, isPhone, () => false)
  const modal = open && phone
  const closeRef = useRef<HTMLButtonElement>(null)
  const sheetRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!modal) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeRef.current?.focus({ preventScroll: true })
    // One history entry per opening, so back closes the sheet instead of leaving /atlas.
    let pushed = true
    window.history.pushState({ atlasMap: true }, '')
    const onPop = () => {
      pushed = false
      setOpen(false)
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      if (pushed) window.history.back()
      opener?.focus({ preventScroll: true })
    }
  }, [modal, setOpen])

  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (!modal) return
    if (e.key === 'Escape') {
      e.stopPropagation()
      setOpen(false)
      return
    }
    if (e.key !== 'Tab') return
    const items = [...(sheetRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].filter((el) => el.offsetParent !== null)
    const first = items[0]
    const last = items[items.length - 1]
    if (!first || !last) return
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <>
      <div className="atlas-backdrop" data-open={open || undefined} onClick={() => setOpen(false)} aria-hidden="true" />
      <section
        ref={sheetRef}
        data-surface="data"
        data-open={open || undefined}
        className="atlas-sheet card p-3 sm:p-4 lg:sticky lg:top-18 lg:col-start-2 lg:row-start-1"
        aria-label="Atlas tree map"
        {...(modal ? { role: 'dialog', 'aria-modal': true } : {})}
        onKeyDown={onKeyDown}
      >
        <button ref={closeRef} type="button" className="atlas-sheet-close btn btn-secondary" onClick={() => setOpen(false)}>
          Close map
        </button>
        {children}
      </section>
    </>
  )
}

/** Phones only (styles/atlas.css): opens the map sheet without picking a node. */
export function OpenMapButton() {
  const { setOpen } = useAtlasMap()
  return (
    <Button size="sm" className="atlas-open-map" onClick={() => setOpen(true)}>
      Open map
    </Button>
  )
}
