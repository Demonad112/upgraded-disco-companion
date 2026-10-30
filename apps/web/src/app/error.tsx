'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { LostLinks } from '@/components/shared/LostLinks'
import { Button } from '@/components/shared/controls'
import { CURRENT_PATCH } from '@/lib/constants'

/**
 * A page that throws while rendering lands here instead of the framework's
 * blank screen. "Copy details" gives a bug report what it needs (route, patch,
 * data version, message) and nothing about the character.
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    console.error(error)
  }, [error])

  const copy = async () => {
    const details = [
      `route: ${window.location.pathname}`,
      `patch: ${CURRENT_PATCH}`,
      `data: ${process.env.NEXT_PUBLIC_DATA_VERSION ?? 'unknown'}`,
      `error: ${error.name}: ${error.message}`,
      error.digest ? `digest: ${error.digest}` : null,
      `agent: ${navigator.userAgent}`,
    ]
      .filter(Boolean)
      .join('\n')
    try {
      await navigator.clipboard.writeText(details)
      setCopied('Copied')
    } catch {
      setCopied('Could not copy')
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Something broke"
        title="This page"
        accent="fell over"
        description="Part of the page threw an error while drawing. Your saved progress and characters are kept in this browser and are not affected."
      />
      <div data-surface="data" className="card mt-8">
        <p className="label-metric">Error</p>
        <p className="mt-1 font-mono text-sm break-words text-danger">{error.message || error.name}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="primary" onClick={reset}>
            Try again
          </Button>
          <Button onClick={() => void copy()}>Copy details</Button>
          <span role="status" aria-live="polite" className="text-xs text-ink-mute">
            {copied}
          </span>
        </div>
      </div>
      <LostLinks />
    </>
  )
}
