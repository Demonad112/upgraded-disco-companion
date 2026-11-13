'use client'

/**
 * Lets any row on the Atlas page ask the map to show a node: "Show on tree"
 * buttons call `focus(names)`, the map frames and pulses them.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { Button } from '@/components/shared/controls'

interface FocusRequest {
  names: string[]
  /** Label shown on the map while focused ("Man Trap"). */
  label: string
  /** Changes on every request, so asking for the same node twice re-frames it. */
  nonce: number
}

interface AtlasMapContextValue {
  /** Phones: the map is a sheet that opens from a row's Map button. Ignored from 721px up, where the map is on the page. */
  open: boolean
  setOpen: (open: boolean) => void
  request: FocusRequest | null
  focus: (names: string[], label?: string) => void
  clear: () => void
}

/** True when at least 60% of the element's height is on screen (the sticky desktop map). */
function mostlyInView(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect()
  const visible = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0)
  return r.height > 0 && visible / r.height >= 0.6
}

const Ctx = createContext<AtlasMapContextValue | null>(null)

export function AtlasMapProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<FocusRequest | null>(null)
  const [open, setOpen] = useState(false)
  const focus = useCallback((names: string[], label?: string) => {
    setRequest({ names, label: label ?? names.join(', '), nonce: Date.now() })
    setOpen(true)
    // On a phone the sheet is the map: nothing to scroll to.
    if (window.matchMedia('(max-width: 720px)').matches) return
    const map = document.getElementById('atlas-map')
    if (map && !mostlyInView(map)) map.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])
  const clear = useCallback(() => setRequest(null), [])
  const value = useMemo(() => ({ open, setOpen, request, focus, clear }), [open, request, focus, clear])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAtlasMap(): AtlasMapContextValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAtlasMap must be used inside AtlasMapProvider')
  return ctx
}

/** The pin button every guide row carries when it names real tree nodes. */
/** `ariaLabel` overrides the accessible name where the same node has a second Map button (the Up next card). */
export function ShowOnTreeButton({ names, label, ariaLabel }: { names?: string[]; label: string; ariaLabel?: string }) {
  const { focus } = useAtlasMap()
  if (!names?.length) return null
  return (
    <Button
      size="sm"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        focus(names, label)
      }}
      title="Show on the Atlas tree"
      aria-label={ariaLabel ?? `Show ${label} on the Atlas tree`}
      className="shrink-0"
    >
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="size-3.5">
        <path
          d="M10 17.5s5.5-5 5.5-9.5a5.5 5.5 0 1 0-11 0c0 4.5 5.5 9.5 5.5 9.5Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <circle cx="10" cy="8" r="2" fill="currentColor" />
      </svg>
      Map
    </Button>
  )
}
