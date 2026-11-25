'use client'

import { useState } from 'react'
import type { OutlineBox, OutlineConfigMode } from '@poe2/core'
import { importUrl } from '@/lib/recentCharacters'
import { pobShareUrl } from '@/lib/pobLink'
import { Button } from '@/components/shared/controls'

/**
 * Shares a link that opens this character again: the share sheet on phones, the clipboard elsewhere. A poe.ninja
 * import gives its `?import=` link; a PoB code gives `#pob=<code>`, which carries the code itself, plus the PoB2 box's
 * config toggle when it was pasted there (lib/pobLink.ts).
 */
export function CopyLink({
  url,
  code,
  box,
  config,
  name,
}: {
  url: string | null
  code?: string | null
  /** The box the code was pasted into and its config toggle; the link carries them so it re-opens the same way. */
  box?: OutlineBox | undefined
  config?: OutlineConfigMode | undefined
  name: string
}) {
  const [status, setStatus] = useState<string | null>(null)

  const share = async () => {
    const link = url ? importUrl(url, window.location.origin) : code ? pobShareUrl(window.location.href, code, { box, config }) : null
    if (!link) return
    try {
      if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title: `${name} — PoE2 Endgame Companion`, url: link })
        return
      }
      await navigator.clipboard.writeText(link)
      setStatus('Link copied')
    } catch (err) {
      // Closing the share sheet is not a failure worth reporting.
      if ((err as Error).name !== 'AbortError') setStatus('Could not copy — use the address bar')
    }
    window.setTimeout(() => setStatus(null), 2500)
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={() => void share()}>
        Copy link
      </Button>
      <span role="status" aria-live="polite" className="text-[length:var(--fs-11)] text-ink-mute">
        {status}
      </span>
    </div>
  )
}
