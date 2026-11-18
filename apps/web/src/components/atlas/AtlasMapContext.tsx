'use client'

/**
 * State shared by the Atlas command bar, the map, the guide list and every row's "Map" button.
 *
 * One current step: the selected step (Prev / Next / a map tooltip), else the first one not ticked yet. Any tick
 * clears the selection, so the current step becomes the next unticked one and the map pans to it.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { NODE_KIND } from '@poe2/core'
import { Button } from '@/components/shared/controls'
import { useAtlasProgress } from '@/hooks/useAtlasProgress'
import { routeLegs, type RouteLeg } from '@/lib/atlasLegs'
import { routeSteps, type AtlasTab, type RouteStep } from '@/lib/atlasRoute'
import { useAtlasTree, type AtlasTree } from '@/lib/useAtlasTree'

export type { AtlasTab }

interface FocusRequest {
  names: string[]
  /** Label shown on the map while focused ("Man Trap"). */
  label: string
  /** Changes on every request, so asking for the same node twice re-frames it. */
  nonce: number
}

type AtlasTreeState = ReturnType<typeof useAtlasTree>

/** A route step with its tree node ids resolved. */
export interface RouteItem extends RouteStep {
  nodes: number[]
}

interface AtlasMapContextValue {
  tab: AtlasTab
  setTab: (tab: AtlasTab) => void
  /** The loaded tree, shared so the bar and the map read one copy. */
  atlasState: AtlasTreeState
  /** The open tab's numbered steps, with node ids. Empty on Mechanics and Traps. */
  route: RouteItem[]
  /** Legs for `route`, in step order (empty until the tree loads). */
  legs: RouteLeg[]
  isTaken: (step: RouteStep) => boolean
  current: RouteItem | null
  /** Index of `current` in `route`, -1 when there is none. */
  currentIdx: number
  takenCount: number
  selectStep: (id: string | null) => void
  prev: () => void
  next: () => void
  /** Toggles the current step. */
  tick: () => void
  request: FocusRequest | null
  focus: (names: string[], label?: string) => void
  clear: () => void
  /** Full screen (desktop): the stage covers the viewport. */
  full: boolean
  setFull: (full: boolean) => void
  /** Full screen: the list drawer is shown. */
  drawer: boolean
  setDrawer: (open: boolean) => void
  /** Phones: the list is a sheet opened from the bottom bar. */
  listOpen: boolean
  setListOpen: (open: boolean) => void
}

/** True when at least 60% of the element's height is on screen. */
function mostlyInView(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect()
  const visible = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0)
  return r.height > 0 && visible / r.height >= 0.6
}

const Ctx = createContext<AtlasMapContextValue | null>(null)

function idsFor(atlas: AtlasTree, names: string[]): number[] {
  const out = new Set<number>()
  for (const name of names) for (const id of atlas.byName.get(name) ?? []) out.add(id)
  return [...out]
}

export function AtlasMapProvider({ children }: { children: ReactNode }) {
  const atlasState = useAtlasTree()
  const { isClusterAllocated, isForkAllocated, toggleCluster, toggleFork, allocatedCount } = useAtlasProgress()
  const [request, setRequest] = useState<FocusRequest | null>(null)
  const [tab, setTabRaw] = useState<AtlasTab>('path')
  const [selected, setSelected] = useState<string | null>(null)
  const [full, setFull] = useState(false)
  const [drawer, setDrawer] = useState(true)
  const [listOpen, setListOpen] = useState(false)

  const setTab = useCallback((next: AtlasTab) => {
    setTabRaw(next)
    setSelected(null)
  }, [])

  const atlas = atlasState.status === 'ready' ? atlasState.atlas : null
  const route = useMemo<RouteItem[]>(
    () => routeSteps(tab).map((s) => ({ ...s, nodes: atlas ? idsFor(atlas, s.treeNodes) : [] })),
    [atlas, tab],
  )
  const isTaken = useCallback(
    (s: RouteStep) => (s.kind === 'cluster' ? isClusterAllocated(s.id) : isForkAllocated(s.id)),
    [isClusterAllocated, isForkAllocated],
  )

  // Any tick (or untick) drops the selection: current falls back to the first step still to take.
  const lastCount = useRef(allocatedCount)
  useEffect(() => {
    if (lastCount.current === allocatedCount) return
    lastCount.current = allocatedCount
    setSelected(null)
  }, [allocatedCount])

  const selectedIdx = selected ? route.findIndex((r) => r.id === selected) : -1
  const firstOpen = route.findIndex((r) => !isTaken(r))
  const currentIdx = route.length === 0 ? -1 : selectedIdx >= 0 ? selectedIdx : firstOpen >= 0 ? firstOpen : route.length - 1
  const current = currentIdx >= 0 ? route[currentIdx]! : null
  const takenCount = route.filter(isTaken).length

  const legs = useMemo<RouteLeg[]>(() => {
    if (!atlas) return []
    let start: number | undefined
    for (const n of atlas.tree.allNodes()) {
      if (n.kind === NODE_KIND.start) {
        start = n.id
        break
      }
    }
    start ??= route.find((r) => r.nodes.length)?.nodes[0]
    return start === undefined ? [] : routeLegs(atlas.tree, start, route)
  }, [atlas, route])

  // A step change (tick, Prev / Next, a tooltip's "next") ends a Map-button focus, so the map follows the new step.
  const clear = useCallback(() => setRequest(null), [])
  const selectStep = useCallback(
    (id: string | null) => {
      setRequest(null)
      setSelected(id)
    },
    [],
  )
  const prev = useCallback(() => {
    const r = route[currentIdx - 1]
    if (r) selectStep(r.id)
  }, [route, currentIdx, selectStep])
  const next = useCallback(() => {
    const r = route[currentIdx + 1]
    if (r) selectStep(r.id)
  }, [route, currentIdx, selectStep])
  const tick = useCallback(() => {
    if (!current) return
    setRequest(null)
    if (current.kind === 'cluster') toggleCluster(current.id)
    else toggleFork(current.id)
  }, [current, toggleCluster, toggleFork])

  const focus = useCallback((names: string[], label?: string) => {
    setRequest({ names, label: label ?? names.join(', '), nonce: Date.now() })
    setListOpen(false)
    // The map sits above the list, so a row's Map button scrolls it back under the sticky bar when it is mostly off screen.
    const map = document.getElementById('atlas-map')
    const stage = document.getElementById('atlas-stage')
    if (stage && map && !mostlyInView(map)) stage.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const value = useMemo<AtlasMapContextValue>(
    () => ({
      tab, setTab, atlasState, route, legs, isTaken, current, currentIdx, takenCount, selectStep, prev, next, tick,
      request, focus, clear, full, setFull, drawer, setDrawer, listOpen, setListOpen,
    }),
    [tab, setTab, atlasState, route, legs, isTaken, current, currentIdx, takenCount, selectStep, prev, next, tick, request, focus, clear, full, drawer, listOpen],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAtlasMap(): AtlasMapContextValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAtlasMap must be used inside AtlasMapProvider')
  return ctx
}

/** The pin button every guide row carries when it names real tree nodes. */
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
      aria-label={ariaLabel ?? `Map, show ${label} on the Atlas tree`}
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
