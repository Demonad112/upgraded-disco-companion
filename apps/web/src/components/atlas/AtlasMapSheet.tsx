'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from '@/components/shared/controls'
import { useAtlasMap } from './AtlasMapContext'

/**
 * The map's frame. From 721px up it is the plain card it always was (inline, or the sticky right column). On phones
 * (styles/atlas.css) it is a bottom sheet that a row's Map button opens; Close, Escape and the backdrop shut it.
 */
export function AtlasMapSheet({ children }: { children: ReactNode }) {
  const { open, setOpen } = useAtlasMap()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open || !window.matchMedia('(max-width: 720px)').matches) return
    closeRef.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  return (
    <>
      <div className="atlas-backdrop" data-open={open || undefined} onClick={() => setOpen(false)} aria-hidden="true" />
      <section
        data-surface="data"
        data-open={open || undefined}
        className="atlas-sheet card p-3 sm:p-4 lg:sticky lg:top-18 lg:col-start-2 lg:row-start-1"
        aria-label="Atlas tree map"
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
