'use client'

import { AtlasWebCanvas } from './AtlasWebCanvas'
import { CardLinksCanvas } from './CardLinksCanvas'

/** The two decorative canvases, behind the page content and inert to input. */
export function FxLayer() {
  return (
    <>
      <AtlasWebCanvas />
      <CardLinksCanvas />
    </>
  )
}
