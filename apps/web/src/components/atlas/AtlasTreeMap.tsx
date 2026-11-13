'use client'

/**
 * The Atlas passive tree, drawn from the game's tree data (via poe2db — see
 * packages/data/PROVENANCE.md), with the guide's nodes marked:
 *
 *   gold ring  — a node the guide recommends
 *   red ring   — a trap node
 *   green      — a node you've ticked on this page (not read from the game)
 *
 * "Map" buttons elsewhere on the page frame and pulse a node here.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TreeNode } from '@poe2/core'
import { atlasClusters, memoryForks } from '@/data/atlasTree'
import { atlasTrapNodes } from '@/data/trapNodes'
import { useAtlasProgress } from '@/hooks/useAtlasProgress'
import { useAtlasTree, type AtlasTree } from '@/lib/useAtlasTree'
import { extentOf, fitExtent, treeToScreen, type Viewport } from '../tree/geometry'
import { sizeCanvas, usePanZoom } from '../tree/usePanZoom'
import { hitTestAtlas, renderAtlas, type AtlasPalette } from './atlasRender'
import { useAtlasMap } from './AtlasMapContext'
import { usePrefs } from '@/hooks/usePrefs'
import { Button, Input } from '@/components/shared/controls'

function readPalette(el: HTMLElement): AtlasPalette {
  const css = getComputedStyle(el)
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback
  return {
    edge: v('--line-strong', 'currentColor'),
    node: v('--ink-mute', 'currentColor'),
    notable: v('--ink-dim', 'currentColor'),
    guide: v('--accent', 'currentColor'),
    trap: v('--danger', 'currentColor'),
    allocated: v('--good', 'currentColor'),
    surface: v('--surface-sunken', 'currentColor'),
    text: v('--ink', 'currentColor'),
    focus: v('--accent', 'currentColor'),
    font: css.fontFamily || 'ui-sans-serif, system-ui, sans-serif',
  }
}

/** Every id carrying one of these names. */
function idsFor(atlas: AtlasTree, names: Iterable<string>): Set<number> {
  const out = new Set<number>()
  for (const name of names) for (const id of atlas.byName.get(name) ?? []) out.add(id)
  return out
}

/** One numbered step of the open tab: a cluster, or a Memory fork. A step with several tree nodes shares one number. */
interface RouteItem {
  num: number
  kind: 'cluster' | 'fork'
  id: string
  name: string
  nodes: number[]
}

const TAB_NOUN: Record<string, string> = { path: 'Path', forks: 'Fork', late: 'Late game' }

const SUBTREE_LABEL: Record<string, string> = { AzmeriSpirit: 'Azmeri Spirits', RogueExiles: 'Rogue Exiles', StoneCircle: 'Stone Circles' }
const subtreeLabel = (t: string | undefined) =>
  !t ? null : SUBTREE_LABEL[t] ?? t.replace(/^Biome/, 'Biome: ').replace(/([a-z])([A-Z])/g, '$1 $2')

export function AtlasTreeMap() {
  const state = useAtlasTree()
  if (state.status === 'loading') {
    return <div className="skeleton h-[22rem] sm:h-[29rem] lg:h-[calc(100dvh-12rem)] lg:min-h-[24rem]" role="status" aria-label="Loading the Atlas tree" />
  }
  if (state.status === 'error') {
    return (
      <p className="border border-line px-4 py-6 text-center text-sm text-ink-mute">
        The Atlas tree didn&apos;t load ({state.message}). The guide below still works.
      </p>
    )
  }
  return <AtlasMapCanvas atlas={state.atlas} />
}

function AtlasMapCanvas({ atlas }: { atlas: AtlasTree }) {
  const { tree } = atlas
  const { request, focus, clear, tab } = useAtlasMap()
  const { isClusterAllocated, isForkAllocated, toggleCluster, toggleFork } = useAtlasProgress()
  const { proDetail } = usePrefs()

  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [viewport, setViewport] = useState<Viewport | null>(null)
  const [hovered, setHovered] = useState<TreeNode | null>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')

  // --- what to mark ---------------------------------------------------------
  const guide = useMemo(
    () => idsFor(atlas, [...atlasClusters.flatMap((c) => c.treeNodes ?? []), ...memoryForks.flatMap((f) => f.treeNodes ?? [])]),
    [atlas],
  )
  // Only the open tab is numbered: Path = early-progression clusters by order, Late game = general clusters,
  // Memory forks = file order. Mechanics and Traps have no sequence, so no numbers.
  const route = useMemo<RouteItem[]>(() => {
    if (tab === 'path' || tab === 'late') {
      const group = tab === 'path' ? 'early-progression' : 'general'
      return atlasClusters
        .filter((c) => c.group === group)
        .sort((a, b) => a.order - b.order)
        .map((c) => ({ num: c.order, kind: 'cluster' as const, id: c.id, name: c.name, nodes: [...idsFor(atlas, c.treeNodes ?? [])] }))
    }
    if (tab === 'forks') {
      return memoryForks.map((f, i) => ({ num: i + 1, kind: 'fork' as const, id: f.id, name: f.title, nodes: [...idsFor(atlas, f.treeNodes ?? [])] }))
    }
    return []
  }, [atlas, tab])
  const numbers = useMemo(() => {
    const m = new globalThis.Map<number, number>()
    for (const r of route) for (const id of r.nodes) if (!m.has(id)) m.set(id, r.num)
    return m
  }, [route])
  const itemOf = useMemo(() => {
    const m = new globalThis.Map<number, RouteItem>()
    for (const r of route) for (const id of r.nodes) if (!m.has(id)) m.set(id, r)
    return m
  }, [route])
  const trap = useMemo(() => idsFor(atlas, atlasTrapNodes.flatMap((t) => t.treeNodes ?? [])), [atlas])
  const allocated = useMemo(
    () =>
      idsFor(atlas, [
        ...atlasClusters.filter((c) => isClusterAllocated(c.id)).flatMap((c) => c.treeNodes ?? []),
        ...memoryForks.filter((f) => isForkAllocated(f.id)).flatMap((f) => f.treeNodes ?? []),
      ]),
    [atlas, isClusterAllocated, isForkAllocated],
  )
  const focused = useMemo(() => (request ? idsFor(atlas, request.names) : new Set<number>()), [atlas, request])

  // --- sizing and framing ---------------------------------------------------
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const r = entry!.contentRect
      setSize({ width: Math.round(r.width), height: Math.round(r.height) })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const fitAll = useCallback(() => {
    if (size.width && size.height) setViewport(fitExtent(tree.extent, size.width, size.height, 0.06))
  }, [tree, size.width, size.height])

  // The nodes the open tab is about: its sequence, the mechanic clusters, or the traps.
  const tabIds = useMemo(() => {
    if (route.length) return new Set(route.flatMap((r) => r.nodes))
    if (tab === 'traps') return trap
    return idsFor(
      atlas,
      atlasClusters.filter((c) => c.group !== 'early-progression' && c.group !== 'general').flatMap((c) => c.treeNodes ?? []),
    )
  }, [atlas, route, tab, trap])

  const fitRoute = useCallback(() => {
    if (!size.width || !size.height) return
    const points = [...tabIds].map((id) => tree.node(id)).filter((n): n is TreeNode => !!n)
    const extent = extentOf(points, 500)
    if (extent) setViewport(fitExtent(extent, size.width, size.height, 0.1))
    else fitAll()
  }, [tabIds, tree, size.width, size.height, fitAll])

  // Open framed to the active tab, and reframe when the tab changes.
  const framedTab = useRef<string | null>(null)
  useEffect(() => {
    if (!size.width || !size.height || framedTab.current === tab) return
    const first = framedTab.current === null
    framedTab.current = tab
    if (first && request) return // a Map button got here first; let it frame its node
    clear()
    setHovered(null)
    fitRoute()
  }, [tab, size.width, size.height, request, clear, fitRoute])

  // The canvas paint, kept in a ref so the focus pulse can repaint without a render.
  const pulseRef = useRef<number | null>(null)
  const paintRef = useRef<() => void>(() => {})

  // Frame a requested node, then pulse it for a moment.
  useEffect(() => {
    if (!request || !size.width || !size.height) return
    const points = [...focused].map((id) => tree.node(id)).filter((n): n is TreeNode => !!n)
    const extent = extentOf(points, 700)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- framing waits on the size a ResizeObserver reports
    if (extent) setViewport(fitExtent(extent, size.width, size.height, 0.1))
    setHovered(points[0] ?? null)
    // Reduced motion: frame and ring the node, but don't pulse.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // The pulse repaints the canvas directly through a ref: driving it through
    // state would re-render the whole map every frame for ~2.7 s.
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = (now - start) / 900
      pulseRef.current = t >= 3 ? null : t % 1
      paintRef.current()
      if (t < 3) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      pulseRef.current = null
    }
    // Re-run per request (nonce), not when the size settles mid-animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.nonce])

  // --- painting -------------------------------------------------------------
  // CSS colours change only with the size (breakpoint) or a reload; reading them
  // on every hover or pan step was a getComputedStyle per frame.
  const paletteRef = useRef<{ width: number; palette: AtlasPalette } | null>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap || !viewport || !size.width || !size.height) return
    paintRef.current = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const dpr = sizeCanvas(canvas, size)
      if (paletteRef.current?.width !== size.width) paletteRef.current = { width: size.width, palette: readPalette(wrap) }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, size.width, size.height)
      renderAtlas(ctx, {
        tree,
        viewport,
        width: size.width,
        height: size.height,
        palette: paletteRef.current.palette,
        guide,
        trap,
        allocated,
        focused,
        hovered: hovered?.id ?? null,
        numbers,
        pulse: pulseRef.current,
      })
    }
    paintRef.current()
  }, [tree, viewport, size, guide, trap, allocated, focused, hovered, numbers])

  // --- interaction ----------------------------------------------------------
  const pick = (sx: number, sy: number) => {
    if (!viewport) return
    setHovered(hitTestAtlas(tree, sx, sy, viewport, size.width, size.height))
  }
  const { onPointerDown, onPointerMove, onPointerUp, zoomBy } = usePanZoom(canvasRef, size, setViewport, pick)

  const showRoute = () => {
    clear()
    setHovered(null)
    fitRoute()
  }
  const showWhole = () => {
    clear()
    setHovered(null)
    fitAll()
  }

  // Tooltip actions, for nodes on the open tab's route.
  const item = hovered ? itemOf.get(hovered.id) : undefined
  const itemDone = item ? (item.kind === 'cluster' ? isClusterAllocated(item.id) : isForkAllocated(item.id)) : false
  const nextStep = () => {
    if (!item) return
    const target = route[(route.indexOf(item) + 1) % route.length]
    const node = target?.nodes.map((id) => tree.node(id)).find((n): n is TreeNode => !!n)
    if (!node) return
    clear()
    setViewport((vp) => (vp ? { ...vp, cx: node.x, cy: node.y } : vp)) // a jump, never an animated pan
    setHovered(node)
  }
  const tipAt = hovered && viewport ? treeToScreen(hovered.x, hovered.y, viewport, size.width, size.height) : null


  // --- search ---------------------------------------------------------------
  const { results, total } = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return { results: [] as TreeNode[], total: 0 }
    const seen = new globalThis.Map<string, TreeNode>()
    for (const node of tree.allNodes()) {
      if (!node.name || seen.has(node.name)) continue
      const hit = node.name.toLowerCase().includes(q) || node.stats.some((s) => s.toLowerCase().includes(q))
      if (hit) seen.set(node.name, node)
    }
    const sorted = [...seen.values()].sort(
      (a, b) => Number(b.name.toLowerCase().includes(q)) - Number(a.name.toLowerCase().includes(q)) || b.kind - a.kind,
    )
    return { results: sorted.slice(0, 8), total: sorted.length }
  }, [tree, query])
  const searching = query.trim().length >= 2

  const onMapKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (e.key === '+' || e.key === '=') zoomBy(1.4)
    else if (e.key === '-' || e.key === '_') zoomBy(1 / 1.4)
    else if (e.key === '0') showRoute()
    else return
    e.preventDefault()
  }

  const subtitle = hovered ? subtreeLabel(atlas.subtree.get(hovered.id)) : null
  const stats = hovered ? hovered.stats.filter((x) => x !== hovered.name) : []
  const tags = hovered
    ? [
        guide.has(hovered.id) ? { label: 'In the guide', tone: 'text-accent border-accent/40' } : null,
        trap.has(hovered.id) ? { label: 'Trap node', tone: 'text-danger border-danger/40' } : null,
        allocated.has(hovered.id) ? { label: 'You ticked this', tone: 'text-good border-good/40' } : null,
      ].filter((t): t is { label: string; tone: string } => !!t)
    : []

  return (
    <div className="space-y-2.5">
      <div className="atlas-head">
        <ul className="atlas-legend" aria-label="Map legend">
          <li>
            <span className="atlas-swatch" data-kind="guide" aria-hidden="true" />
            Guide <span className="tabular">{guide.size}</span>
          </li>
          <li>
            <span className="atlas-swatch" data-kind="trap" aria-hidden="true" />
            Trap <span className="tabular">{trap.size}</span>
          </li>
          <li>
            <span className="atlas-swatch" data-kind="ticked" aria-hidden="true" />
            Ticked <span className="tabular">{allocated.size}</span>
          </li>
        </ul>
        <div className="atlas-search">
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && query) {
                e.preventDefault()
                setQuery('')
              }
            }}
            placeholder="Find a node — name or effect"
            aria-label="Find an Atlas node"
            aria-describedby="atlas-search-count"
          />
          {query ? (
            <button type="button" className="atlas-search-clear" onClick={() => setQuery('')} aria-label="Clear search">
              ✕
            </button>
          ) : null}
          <p id="atlas-search-count" className="atlas-search-count" role="status">
            {searching ? (total ? `${total} ${total === 1 ? 'match' : 'matches'}${total > results.length ? `, showing ${results.length}` : ''}` : 'No matches') : ''}
          </p>
          {results.length ? (
            <ul className="absolute inset-x-0 top-[calc(var(--tap-min)+4px)] z-20 overflow-hidden border border-line bg-surface-raised shadow-[var(--lift-raised)]">
              {results.map((n) => (
                <li key={n.name}>
                  <button
                    type="button"
                    onClick={() => {
                      focus([n.name], n.name)
                      setQuery('')
                    }}
                    className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-surface-overlay"
                  >
                    <span className="truncate text-ink">{n.name}</span>
                    <span className="shrink-0 text-[11px] text-ink-mute">{subtreeLabel(atlas.subtree.get(n.id))}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div
        id="atlas-map"
        ref={wrapRef}
        role="group"
        tabIndex={0}
        aria-label="Atlas map. Keys: plus to zoom in, minus to zoom out, 0 to fit the route."
        onKeyDown={onMapKey}
        className="atlas-map relative h-[22rem] w-full scroll-mt-32 touch-none overflow-hidden border border-line bg-surface-sunken select-none sm:h-[29rem] lg:h-[calc(100dvh-12rem)] lg:min-h-[24rem]"
      >
        <canvas
          ref={canvasRef}
          className="block h-full w-full cursor-grab active:cursor-grabbing"
          style={{ width: size.width || undefined, height: size.height || undefined }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={(e) =>
            e.pointerType === 'mouse' && !request && !tipRef.current?.contains(e.relatedTarget as Node | null) && setHovered(null)
          }
          role="img"
          aria-label={`Atlas passive tree: ${guide.size} guide nodes, ${trap.size} trap nodes, ${allocated.size} ticked. Drag to pan, scroll or pinch to zoom.`}
        />

        <div className="map-ctl" role="group" aria-label="Map zoom">
          {[
            { label: 'Zoom in', key: '+', text: '+', on: () => zoomBy(1.4) },
            { label: 'Zoom out', key: '-', text: '−', on: () => zoomBy(1 / 1.4) },
            { label: 'Fit route', key: '0', text: 'fit', on: showRoute },
          ].map((b) => (
            <button key={b.label} type="button" onClick={b.on} aria-label={b.label} aria-keyshortcuts={b.key}>
              <span className={b.text === 'fit' ? 'map-fit-text' : undefined} aria-hidden="true">
                {b.text}
              </span>
              <span className="map-tip" aria-hidden="true">
                {b.label} <kbd>{b.key}</kbd>
              </span>
            </button>
          ))}
        </div>

        {request ? (
          <div className="absolute top-2 left-2 flex max-w-[70%] items-center gap-2 border border-accent-line bg-surface-raised/90 px-2.5 py-1 text-xs text-ink">
            <span className="truncate">Showing {request.label}</span>
            <button type="button" onClick={clear} aria-label="Clear" className="hit-area text-ink-mute hover:text-ink">
              ✕
            </button>
          </div>
        ) : null}

        {hovered && tipAt ? (
          <div
            ref={tipRef}
            className="atlas-tip absolute z-10 w-60 max-w-[80%] border border-line bg-surface-raised/95 p-2.5 shadow-[var(--lift-raised)]"
            style={
              {
                '--tip-left': `${Math.min(Math.max(8, tipAt.x + 14), Math.max(8, size.width - 248))}px`,
                '--tip-top': `${Math.min(Math.max(8, tipAt.y + 14), Math.max(8, size.height - 150))}px`,
              } as React.CSSProperties
            }
            onPointerLeave={(e) => e.pointerType === 'mouse' && !request && e.relatedTarget !== canvasRef.current && setHovered(null)}
          >
            {item ? (
              <div className="text-[11px] font-semibold tracking-wide text-accent uppercase">
                {TAB_NOUN[tab]} {item.num}
                {item.name !== hovered.name ? ` · ${item.name}` : ''}
              </div>
            ) : null}
            <div className="text-xs font-semibold text-ink">{hovered.name || 'Atlas'}</div>
            {subtitle && subtitle !== hovered.name ? <div className="mt-0.5 text-[11px] text-ink-mute">{subtitle}</div> : null}
            {stats.length ? (
              <ul className="mt-1.5 space-y-0.5 text-[11px] leading-snug text-ink-dim">
                {stats.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            ) : null}
            {tags.length ? (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {tags.map((t) => (
                  <span key={t.label} className={`border px-1.5 py-px text-[11px] ${t.tone}`}>
                    {t.label}
                  </span>
                ))}
              </div>
            ) : null}
            {item ? (
              <div className="mt-2 flex gap-1.5">
                <Button size="sm" variant={itemDone ? 'secondary' : 'primary'} aria-pressed={itemDone} onClick={() => (item.kind === 'cluster' ? toggleCluster(item.id) : toggleFork(item.id))}>
                  {itemDone ? '✓ Ticked' : 'Tick'}
                </Button>
                {route.length > 1 ? (
                  <Button size="sm" onClick={nextStep}>
                    Next →
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <p className="text-[11px] leading-relaxed text-ink-mute">
        {proDetail ? (
          <Button size="sm" onClick={showWhole} className="mr-2">
            Whole tree
          </Button>
        ) : null}
        Node positions and effects come from the game&apos;s data, via poe2db. Green marks what you&apos;ve ticked here, not what&apos;s on your account.
      </p>
    </div>
  )
}
