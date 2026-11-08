'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PassiveAllocation, PassiveTree, TreeNode } from '@poe2/core'
import { resolveAllocation } from '@poe2/core'
import { Tag } from '../ui'
import { extentOf, fitExtent, type Viewport } from './geometry'
import { sizeCanvas, usePanZoom } from './usePanZoom'
import { hitTest, renderTree, type TreePalette } from './render'

function readPalette(el: HTMLElement): TreePalette {
  const s = getComputedStyle(el)
  const v = (name: string, fallback: string) => s.getPropertyValue(name).trim() || fallback
  return {
    dimEdge: v('--line', 'currentColor'),
    dimNode: v('--ink-mute', 'currentColor'),
    edge: v('--accent', 'currentColor'),
    node: v('--ink-dim', 'currentColor'),
    notable: v('--accent', 'currentColor'),
    keystone: v('--dmg-chaos', 'currentColor'),
    jewel: v('--dmg-cold', 'currentColor'),
    start: v('--good', 'currentColor'),
    ascendancy: v('--dmg-fire', 'currentColor'),
    surface: v('--surface-raised', 'currentColor'),
    text: v('--ink', 'currentColor'),
  }
}

interface PassiveTreeViewProps {
  tree: PassiveTree
  allocation: PassiveAllocation
  className?: string
}

export function PassiveTreeView({ tree, allocation, className = '' }: PassiveTreeViewProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [viewport, setViewport] = useState<Viewport | null>(null)
  const [hovered, setHovered] = useState<TreeNode | null>(null)
  const [pointer, setPointer] = useState({ x: 0, y: 0 })
  const [showSwapSet, setShowSwapSet] = useState(false)
  const [showAllAscendancies, setShowAllAscendancies] = useState(false)

  const resolved = useMemo(() => resolveAllocation(tree, allocation), [tree, allocation])

  const activeIds = useMemo(() => new Set(allocation.live), [allocation])
  const swapIds = useMemo(() => {
    const inactive = allocation.activeSet === 2 ? allocation.set1 : allocation.set2
    return new Set(inactive.filter((id) => !activeIds.has(id)))
  }, [allocation, activeIds])
  /** The character's own ascendancy, so other classes' wheels stay hidden. */
  const ownAscendancy = resolved.ascendancy[0]?.ascendancy ?? null

  // --- sizing ---------------------------------------------------------------
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

  const fitToAllocation = useCallback(() => {
    if (!size.width || !size.height) return
    // Frame the allocated nodes, not the whole tree: the full extent is mostly
    // empty space and other classes' wheels.
    const extent = extentOf(resolved.mainTree.length ? resolved.mainTree : [...tree.allNodes()])
    if (extent) setViewport(fitExtent(extent, size.width, size.height))
  }, [resolved.mainTree, size.width, size.height, tree])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- framing depends on size measured via ResizeObserver, an external system
    if (viewport === null) fitToAllocation()
  }, [viewport, fitToAllocation])

  // --- painting -------------------------------------------------------------
  // CSS colours change only with the size (breakpoint) or a reload, so read them once per width.
  const paletteRef = useRef<{ width: number; palette: TreePalette } | null>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap || !viewport || !size.width || !size.height) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = sizeCanvas(canvas, size)
    canvas.style.width = `${size.width}px`
    canvas.style.height = `${size.height}px`
    if (paletteRef.current?.width !== size.width) paletteRef.current = { width: size.width, palette: readPalette(wrap) }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size.width, size.height)

    renderTree(ctx, {
      tree,
      viewport,
      width: size.width,
      height: size.height,
      palette: paletteRef.current.palette,
      allocated: activeIds,
      inactive: showSwapSet ? swapIds : new Set(),
      hovered: hovered?.id ?? null,
      visibleAscendancy: ownAscendancy,
      showAllAscendancies,
    })
  }, [
    tree,
    viewport,
    size,
    activeIds,
    swapIds,
    showSwapSet,
    hovered,
    ownAscendancy,
    showAllAscendancies,
  ])

  // --- interaction ----------------------------------------------------------
  const pick = (sx: number, sy: number) => {
    if (!viewport) return
    setPointer({ x: sx, y: sy })
    setHovered(
      hitTest(tree, sx, sy, viewport, size.width, size.height, {
        visibleAscendancy: ownAscendancy,
        showAllAscendancies,
      }),
    )
  }
  const { onPointerDown, onPointerMove, onPointerUp, zoomBy } = usePanZoom(canvasRef, size, setViewport, pick)

  const stats = {
    allocated: resolved.live.length,
    notables: resolved.notables.length,
    keystones: resolved.keystones.length,
    jewels: resolved.jewelSockets.length,
  }

  return (
    <div className={className}>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <Tag tone="accent">{stats.allocated} allocated</Tag>
        <Tag>{stats.notables} notables</Tag>
        {stats.keystones ? <Tag>{stats.keystones} keystones</Tag> : null}
        {stats.jewels ? <Tag>{stats.jewels} jewel sockets</Tag> : null}
        {ownAscendancy ? <Tag tone="warn">{ownAscendancy}</Tag> : null}
      </div>

      <div
        ref={wrapRef}
        className="relative h-[26rem] w-full touch-none overflow-hidden border border-line bg-surface-sunken select-none sm:h-[34rem]"
      >
        <canvas
          ref={canvasRef}
          className="block h-full w-full cursor-grab active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={() => setHovered(null)}
          role="img"
          aria-label={`Passive tree: ${stats.allocated} allocated nodes including ${stats.notables} notables. Drag to pan, scroll or pinch to zoom.`}
        />

        {/* Controls */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => zoomBy(1.35)}
            aria-label="Zoom in"
            className="size-8 border border-line bg-surface-raised/90 text-sm text-ink-dim transition-colors hover:text-ink"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => zoomBy(1 / 1.35)}
            aria-label="Zoom out"
            className="size-8 border border-line bg-surface-raised/90 text-sm text-ink-dim transition-colors hover:text-ink"
          >
            −
          </button>
          <button
            type="button"
            onClick={fitToAllocation}
            aria-label="Fit to allocated nodes"
            title="Fit to allocated nodes"
            className="size-8 border border-line bg-surface-raised/90 text-[10px] text-ink-dim transition-colors hover:text-ink"
          >
            fit
          </button>
        </div>

        {/* Tooltip */}
        {hovered ? (
          <div
            className="pointer-events-none absolute z-10 max-w-[15rem] border border-line bg-surface-raised/95 p-2.5 shadow-lg"
            style={{
              left: Math.min(Math.max(8, pointer.x + 14), Math.max(8, size.width - 250)),
              top: Math.min(Math.max(8, pointer.y + 14), Math.max(8, size.height - 130)),
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-semibold text-ink">{hovered.name || `Node ${hovered.id}`}</span>
              {activeIds.has(hovered.id) ? <Tag tone="good">taken</Tag> : null}
            </div>
            {hovered.ascendancy ? (
              <div className="mt-0.5 text-[10px] text-warn">{hovered.ascendancy}</div>
            ) : null}
            {hovered.stats.length ? (
              <ul className="mt-1.5 space-y-0.5">
                {hovered.stats.map((s, i) => (
                  <li key={i} className="text-[11px] leading-snug text-ink-dim">
                    {s}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-[11px] text-ink-mute">No stats recorded for this node.</p>
            )}
          </div>
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-1.5 text-[11px] text-ink-dim">
          <input
            type="checkbox"
            checked={showSwapSet}
            onChange={(e) => setShowSwapSet(e.target.checked)}
            className="accent-[var(--accent)]"
          />
          Show weapon set {allocation.activeSet === 1 ? 2 : 1} (inactive)
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-ink-dim">
          <input
            type="checkbox"
            checked={showAllAscendancies}
            onChange={(e) => setShowAllAscendancies(e.target.checked)}
            className="accent-[var(--accent)]"
          />
          Show all ascendancy wheels
        </label>
      </div>

      <Legend />

      {resolved.unresolvedIds.length ? (
        <p className="mt-2 text-[11px] leading-relaxed text-warn">
          {resolved.unresolvedIds.length} allocated node
          {resolved.unresolvedIds.length === 1 ? '' : 's'} are missing from this tree data, so they can&apos;t be drawn. The gap is in the data, not your build.
        </p>
      ) : null}

      {resolved.components.length > 1 ? (
        <p className="mt-2 text-[11px] leading-relaxed text-ink-mute">
          The allocation forms {resolved.components.length} groups:{' '}
          {resolved.components
            .map((c) => `${c.nodes.length} ${c.kind === 'ascendancy' ? `on the ${c.ascendancy} wheel` : c.kind === 'main-tree' ? 'on the main tree' : 'in a cluster this data set does not link'}`)
            .join(', ')}
          . Separate groups are normal and do not mean the tree is broken.
        </p>
      ) : null}
    </div>
  )
}

function Legend() {
  const items = [
    { label: 'Notable', className: 'bg-accent', size: 'size-2.5' },
    { label: 'Keystone', className: 'bg-[var(--dmg-chaos)]', size: 'size-3' },
    { label: 'Jewel socket', className: 'bg-[var(--dmg-cold)]', size: 'size-2.5' },
    { label: 'Ascendancy', className: 'bg-[var(--dmg-fire)]', size: 'size-2.5' },
    { label: 'Class start', className: 'bg-good', size: 'size-2.5' },
  ]
  return (
    <ul className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5 text-[11px] text-ink-mute">
          <span aria-hidden className={`inline-block ${i.size} ${i.className}`} />
          {i.label}
        </li>
      ))}
    </ul>
  )
}
