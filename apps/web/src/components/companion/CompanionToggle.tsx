'use client'

import { setCompanionOn, useCompanionOn } from '@/lib/companionSetting'

/** Footer toggle for the wraith companion. */
export function CompanionToggle() {
  const on = useCompanionOn()
  return (
    <label className="hit-area flex cursor-pointer items-center gap-2">
      <input type="checkbox" checked={on} onChange={(e) => setCompanionOn(e.target.checked)} />
      Show companion
    </label>
  )
}
