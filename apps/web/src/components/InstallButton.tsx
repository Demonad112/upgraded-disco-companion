'use client'

import { useState } from 'react'
import { promptInstall, useInstallMode } from '@/lib/installPrompt'

/**
 * Install entry point. Renders nothing when the app is already installed or the
 * browser can't install it. Not mounted yet: U7 puts it in the footer Settings column.
 */
export function InstallButton({ className = '' }: { className?: string }) {
  const mode = useInstallMode()
  const [hint, setHint] = useState(false)
  if (mode === 'none') return null

  if (mode === 'prompt') {
    return (
      <button type="button" className={`install-button ${className}`} onClick={() => void promptInstall()}>
        Install app
      </button>
    )
  }
  return (
    <span className={className}>
      <button
        type="button"
        className="install-button"
        aria-expanded={hint}
        aria-controls="install-ios-hint"
        onClick={() => setHint((v) => !v)}
      >
        Install app
      </button>
      {hint ? (
        <span id="install-ios-hint" className="install-hint">
          Tap Share, then “Add to Home Screen”.
        </span>
      ) : null}
    </span>
  )
}
