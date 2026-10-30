'use client'

import { useState } from 'react'
import { importUrl } from '@/lib/recentCharacters'
import { Button } from '@/components/shared/controls'

/**
 * Shares the page's `?import=` link: the share sheet on phones, the clipboard
 * elsewhere. Opening the link re-imports the character from poe.ninja.
 */
export function CopyLink({ url, name }: { url: string; name: string }) {
  const [status, setStatus] = useState<string | null>(null)

  const share = async () => {
    const link = importUrl(url, window.location.origin)
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
      <span role="status" aria-live="polite" className="text-[11px] text-ink-mute">
        {status}
      </span>
    </div>
  )
}
