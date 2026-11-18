'use client'

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react'
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
 * The guide list's frame. From 721px up it is the "list" area of the stage (inline, or the left drawer in full
 * screen). On phones (styles/atlas.css) it is a bottom sheet that the peek bar's List button opens: focus stays inside
 * while it is open, Escape and Close shut it, and so does the back gesture (opening pushes one history entry).
 */
export function AtlasMapSheet({ children }: { children: ReactNode }) {
  const { listOpen, setListOpen } = useAtlasMap()
  const phone = useSyncExternalStore(subscribePhone, isPhone, () => false)
  const modal = listOpen && phone
  // The open flag must not outlive the phone layout: on a wider viewport it would hide the wraith (companion.css).
  useEffect(() => {
    if (!phone && listOpen) setListOpen(false)
  }, [phone, listOpen, setListOpen])
  const closeRef = useRef<HTMLButtonElement>(null)
  const sheetRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!modal) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeRef.current?.focus({ preventScroll: true })
    // One history entry per opening, so back closes the sheet instead of leaving /atlas.
    let pushed = true
    window.history.pushState({ atlasList: true }, '')
    const onPop = () => {
      pushed = false
      setListOpen(false)
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      if (pushed) window.history.back()
      opener?.focus({ preventScroll: true })
    }
  }, [modal, setListOpen])

  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (!modal) return
    if (e.key === 'Escape') {
      e.stopPropagation()
      setListOpen(false)
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
      <div className="atlas-backdrop" data-open={listOpen || undefined} onClick={() => setListOpen(false)} aria-hidden="true" />
      <section
        ref={sheetRef}
        data-surface="data"
        data-open={listOpen || undefined}
        className="atlas-list"
        aria-label="Atlas guide list"
        {...(modal ? { role: 'dialog', 'aria-modal': true } : {})}
        onKeyDown={onKeyDown}
      >
        <button ref={closeRef} type="button" className="atlas-sheet-close btn btn-secondary" onClick={() => setListOpen(false)}>
          Close list
        </button>
        {children}
      </section>
    </>
  )
}
