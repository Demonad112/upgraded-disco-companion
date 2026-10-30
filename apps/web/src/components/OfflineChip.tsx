'use client'

import { useOnline } from '@/lib/online'

/**
 * Small mono chip shown only while the browser reports no network. Mounted in
 * the header (NavBar). Below 1280px it shows "Offline" alone, so the tool links keep
 * one line; the rest stays for screen readers and in the tooltip.
 */
export function OfflineChip() {
  const online = useOnline()
  if (online) return null
  return (
    <span className="offline-chip" role="status" title="Offline · saved data only">
      Offline<span className="max-xl:sr-only">{'\u00a0'}· saved data only</span>
    </span>
  )
}
