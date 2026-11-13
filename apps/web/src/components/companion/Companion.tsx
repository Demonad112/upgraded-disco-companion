'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'
import { usePersistedState } from '@/hooks/usePersistedState'
import { companionLines, restingPose, type CompanionPose, type CompanionSeed } from '@/lib/companion'
import { setCompanionOn } from '@/lib/companionSetting'
import { useLocalStore } from '@/lib/localStore'
import { importPath, recentCharacters } from '@/lib/recentCharacters'
import { CompanionHead } from './CompanionHead'

/**
 * Launcher and panel, loaded after idle by CompanionHost. Summon-only: nothing opens by itself. Esc, the close button
 * or a click outside closes it and focus returns to the launcher; "Turn off" persists until the footer toggle.
 */
export default function Companion({ seed }: { seed: CompanionSeed }) {
  const [open, setOpen] = useState(false)
  const [pose, setPose] = useState<CompanionPose | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const launcher = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const pathname = usePathname() ?? '/'
  const completed = usePersistedState().state.checklist.completedStepIds
  const last = useLocalStore(recentCharacters)[0]
  const recent = last ? { name: last.name, href: importPath(last.url) } : null
  const lines = companionLines(seed, completed, recent, pathname)
  const resting = restingPose(seed, completed, recent !== null)

  const close = () => {
    setOpen(false)
    launcher.current?.focus()
  }

  // On open: focus moves into the panel and the head talks briefly, then rests.
  useEffect(() => {
    if (!open) return
    panel.current?.focus()
    const t = window.setTimeout(() => setPose(null), 1200)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  const point = () => setPose((p) => (p === 'talking' ? p : 'pointing'))
  const unpoint = () => setPose((p) => (p === 'pointing' ? null : p))

  return (
    <div ref={root} className="companion" data-testid="companion">
      {open && (
        <div
          ref={panel}
          role="dialog"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="companion-panel"
          data-testid="companion-panel"
        >
          <div className="companion-top">
            <CompanionHead pose={pose ?? resting} size={48} />
            <h2 id={titleId} className="companion-title">
              Companion
            </h2>
            <button type="button" className="companion-x" onClick={close} aria-label="Close the companion">
              ×
            </button>
          </div>
          <ul className="companion-lines">
            {lines.map((l) => (
              <li key={l.tool}>
                <Link
                  href={l.href}
                  className="companion-line"
                  onClick={() => setOpen(false)}
                  onMouseEnter={point}
                  onMouseLeave={unpoint}
                  onFocus={point}
                  onBlur={unpoint}
                >
                  {l.text}
                </Link>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="companion-off"
            onClick={() => {
              setCompanionOn(false)
              setOpen(false)
            }}
          >
            Turn off the companion
          </button>
        </div>
      )}
      <button
        ref={launcher}
        type="button"
        className="companion-launcher"
        aria-label="Ask the companion"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          if (open) return close()
          setPose('talking')
          setOpen(true)
        }}
      >
        <CompanionHead pose={open ? (pose ?? resting) : resting} size={32} />
      </button>
    </div>
  )
}
