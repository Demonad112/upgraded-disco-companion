'use client'

import { useOnline } from '@/lib/online'

/**
 * Small mono chip shown only while the browser reports no network.
 * Not mounted yet: NavBar.tsx (owned by A6 in wave 6) mounts it in U6.
 */
export function OfflineChip() {
  const online = useOnline()
  if (online) return null
  return (
    <span className="offline-chip" role="status">
      Offline · saved data only
    </span>
  )
}
