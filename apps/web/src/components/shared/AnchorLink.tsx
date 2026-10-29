'use client'

import { useState } from 'react'

/**
 * Copies a link to one section of the current page (`…/methodology/#grade`).
 * Built from the live location, so `basePath` and the trailing slash come along.
 */
export function AnchorLink({ id, label }: { id: string; label: string }) {
  const [status, setStatus] = useState<string | null>(null)

  const copy = async () => {
    const { origin, pathname } = window.location
    try {
      await navigator.clipboard.writeText(`${origin}${pathname}#${id}`)
      setStatus('Link copied')
    } catch {
      setStatus('Could not copy — use the address bar')
    }
    window.setTimeout(() => setStatus(null), 2500)
  }

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        aria-label={`Copy link to ${label}`}
        onClick={() => void copy()}
        className="min-h-[var(--tap-min)] border border-line px-2.5 font-mono text-xs text-ink-dim transition-colors hover:border-accent-line hover:text-ink"
      >
        Copy link
      </button>
      <span role="status" aria-live="polite" className="text-[11px] text-ink-mute">
        {status}
      </span>
    </span>
  )
}
