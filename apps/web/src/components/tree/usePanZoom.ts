'use client'

import { useEffect, useRef, type Dispatch, type RefObject, type SetStateAction } from 'react'
import { zoomAt, type Viewport } from './geometry'

type Size = { width: number; height: number }

/**
 * Sizes a canvas backing store for the device pixel ratio. Assigning
 * `width`/`height` reallocates the store even when the value is unchanged, so
 * it only assigns on a real change. Returns the ratio for `setTransform`.
 */
export function sizeCanvas(canvas: HTMLCanvasElement, size: Size, maxDpr = 2): number {
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr)
  const pw = Math.round(size.width * dpr)
  const ph = Math.round(size.height * dpr)
  if (canvas.width !== pw) canvas.width = pw
  if (canvas.height !== ph) canvas.height = ph
  return dpr
}

/**
 * Drag to pan, two-finger pinch and (non-passive) wheel to zoom, for the
 * passive tree and Atlas map canvases. `pick` gets canvas-relative coordinates:
 * on mouse hover, and on a touch tap that didn't pan.
 */
export function usePanZoom(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  size: Size,
  setViewport: Dispatch<SetStateAction<Viewport | null>>,
  pick: (sx: number, sy: number) => void,
) {
  const dragRef = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null)
  const pinchRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchDistance = useRef(0)

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    pinchRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pinchRef.current.size === 2) {
      const [a, b] = [...pinchRef.current.values()]
      pinchDistance.current = Math.hypot(a!.x - b!.x, a!.y - b!.y)
      dragRef.current = null
      return
    }
    dragRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    if (pinchRef.current.has(e.pointerId)) pinchRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    // Two fingers: pinch to zoom about the midpoint.
    if (pinchRef.current.size === 2) {
      const [a, b] = [...pinchRef.current.values()]
      const distance = Math.hypot(a!.x - b!.x, a!.y - b!.y)
      if (pinchDistance.current > 0 && distance > 0) {
        const midX = (a!.x + b!.x) / 2 - rect.left
        const midY = (a!.y + b!.y) / 2 - rect.top
        const factor = distance / pinchDistance.current
        setViewport((vp) => (vp ? zoomAt(vp, factor, midX, midY, size.width, size.height) : vp))
      }
      pinchDistance.current = distance
      return
    }

    const drag = dragRef.current
    if (drag && drag.id === e.pointerId) {
      const dx = e.clientX - drag.x
      const dy = e.clientY - drag.y
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) drag.moved = true
      drag.x = e.clientX
      drag.y = e.clientY
      setViewport((vp) => (vp ? { ...vp, cx: vp.cx - dx / vp.scale, cy: vp.cy - dy / vp.scale } : vp))
      return
    }

    // Hover: mouse only. On touch the tooltip follows a tap instead.
    if (e.pointerType === 'mouse') pick(e.clientX - rect.left, e.clientY - rect.top)
  }

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pinchRef.current.delete(e.pointerId)
    if (pinchRef.current.size < 2) pinchDistance.current = 0
    const drag = dragRef.current
    dragRef.current = null
    // A tap that didn't pan selects the node under the finger.
    if (drag && drag.id === e.pointerId && !drag.moved && e.pointerType !== 'mouse') {
      const rect = e.currentTarget.getBoundingClientRect()
      pick(e.clientX - rect.left, e.clientY - rect.top)
    }
  }

  // Wheel zoom. Registered natively so it can be non-passive and preventDefault
  // — React's synthetic onWheel is passive and cannot stop page scroll.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const factor = Math.exp(-e.deltaY * 0.0015)
      setViewport((vp) => (vp ? zoomAt(vp, factor, e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height) : vp))
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [canvasRef, setViewport])

  const zoomBy = (factor: number) =>
    setViewport((vp) => (vp ? zoomAt(vp, factor, size.width / 2, size.height / 2, size.width, size.height) : vp))

  return { onPointerDown, onPointerMove, onPointerUp, zoomBy }
}
