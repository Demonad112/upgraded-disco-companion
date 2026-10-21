'use client'

import { useEffect, useRef, useState } from 'react'
import { CURRENT_PATCH } from '@/lib/constants'
import { CHANGELOG } from '@/data/changelog'
import { applyCompact, compactMode } from '@/lib/compactMode'
import { useLocalStore } from '@/lib/localStore'

const KIND_LABEL = { data: 'Data', app: 'App', caveat: 'Unverified' } as const

/**
 * The patch badge, always visible, opening a short what-changed list and the
 * compact-mode switch. One control instead of several keeps the bar usable at
 * narrow widths.
 */
export function NavMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { on } = useLocalStore(compactMode)

  // Keep <html data-compact> in step with the stored choice.
  useEffect(() => applyCompact(on), [on])

  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  return (
    <div ref={ref} className="relative shrink-0" data-patch-badge>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="changelog-panel"
        aria-label={`Patch ${CURRENT_PATCH}: what changed and display options`}
        onClick={() => setOpen((v) => !v)}
        className="flex min-w-[var(--tap-min)] items-center justify-center gap-1 border border-accent-line bg-surface-sunken px-2 font-mono text-xs text-accent hover:border-accent"
      >
        <span className="hidden sm:inline">Patch</span>
        {CURRENT_PATCH}
      </button>
      {open ? (
        <div
          id="changelog-panel"
          role="region"
          aria-label="What changed"
          className="card absolute top-[calc(100%+0.5rem)] right-0 z-30 w-[min(22rem,calc(100vw-1.5rem))] bg-[var(--surface)] p-4 text-sm"
          data-no-lift
          style={{ background: 'var(--surface)' }}
        >
          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={on}
              onChange={(e) => compactMode.set(() => ({ on: e.target.checked }))}
            />
            <span>
              <span className="font-medium text-ink">Compact mode</span>
              <span className="block text-xs text-ink-mute">Narrow second-monitor layout on the home page.</span>
            </span>
          </label>
          <h2 className="eyebrow mt-3 border-t border-line pt-3">What changed</h2>
          <ol className="mt-2 max-h-72 space-y-3 overflow-y-auto">
            {CHANGELOG.map((entry) => (
              <li key={`${entry.patch}-${entry.date}`}>
                <div className="font-mono text-xs text-ink-dim">
                  Patch {entry.patch} · {entry.date}
                </div>
                <ul className="mt-1 space-y-1 text-xs">
                  {entry.items.map((item) => (
                    <li key={item.text} className={item.kind === 'caveat' ? 'text-warn' : 'text-ink-dim'}>
                      <span className="eyebrow mr-1.5">{KIND_LABEL[item.kind]}</span>
                      {item.text}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  )
}
