'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { CURRENT_PATCH } from '@/lib/constants'

/**
 * A page that throws while rendering lands here instead of the framework's
 * blank screen. "Copy details" gives a bug report what it needs (route, patch,
 * data version, message) and nothing about the character. Kept deliberately
 * small: this chunk loads on every route (H1-1).
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  const copy = (b: HTMLButtonElement) =>
    navigator.clipboard
      .writeText(
        `route: ${location.pathname}\npatch: ${CURRENT_PATCH}\ndata: ${process.env.NEXT_PUBLIC_DATA_VERSION ?? 'unknown'}\nerror: ${error.name}: ${error.message}\ndigest: ${error.digest ?? '-'}\nagent: ${navigator.userAgent}`
      )
      .then(
        () => (b.textContent = 'Copied'),
        () => (b.textContent = 'Could not copy')
      )

  return (
    <div data-surface="data" className="card mt-8">
      <p className="eyebrow">Something broke</p>
      <h1 className="h3 mt-1">This page fell over</h1>
      <p className="mt-2 text-sm text-ink-dim">
        Part of the page failed to draw. Your saved progress and characters are safe.
      </p>
      <p className="mt-3 font-mono text-sm break-words text-danger">{error.message || error.name}</p>
      <div className="mt-4 flex flex-wrap gap-3" aria-live="polite">
        <button type="button" className="btn btn-primary" onClick={reset}>
          Try again
        </button>
        <button type="button" className="btn btn-secondary" onClick={(e) => void copy(e.currentTarget)}>
          Copy details
        </button>
        <Link href="/" className="btn btn-secondary">
          Home
        </Link>
      </div>
    </div>
  )
}
