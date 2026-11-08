'use client'

import { usePathname } from 'next/navigation'
import { CardLinksCanvas } from './CardLinksCanvas'

/**
 * The card-links canvas, behind the page content and inert to input. Only
 * /checklist has a [data-links] sequence, so other routes skip the canvas and
 * its ResizeObserver/MutationObserver on #main entirely.
 */
export function FxLayer() {
  const pathname = usePathname()
  if (pathname?.replace(/\/$/, '') !== '/checklist') return null
  return <CardLinksCanvas />
}
