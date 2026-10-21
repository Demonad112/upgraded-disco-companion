'use client'

import { setSkyDim, useSkyDim } from '@/lib/skyDim'

/** Footer toggle for the dimming drawn behind blocks on the constellation sky. */
export function SkyDimToggle() {
  const on = useSkyDim()
  return (
    <label className="hit-area flex cursor-pointer items-center gap-2">
      <input type="checkbox" checked={on} onChange={(e) => setSkyDim(e.target.checked)} />
      Dim sky behind blocks
    </label>
  )
}
