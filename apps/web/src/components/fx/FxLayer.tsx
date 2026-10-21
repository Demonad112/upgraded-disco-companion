'use client'

import { StarChartCanvas } from './StarChartCanvas'
import { CardLinksCanvas } from './CardLinksCanvas'

/** The two decorative canvases, behind the page content and inert to input. */
export function FxLayer() {
  return (
    <>
      <StarChartCanvas />
      <CardLinksCanvas />
    </>
  )
}
