'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Wraith } from './Wraith'
import { next, nodeFor, type Choice, type NodeId } from '@/lib/companionTree'
import { importPath, recentCharacters } from '@/lib/recentCharacters'

/** Set once the visitor has opened the tip, so the hop stops for this session. */
const TIP_SEEN = 'poe2-companion-tip-seen'
/** Quick type: each letter fades in this many ms after the one before it. */
const CHAR_MS = 6
const DOZE_MS = 120_000
const WANDER_EVERY_MS = 120_000
const WANDER_MS = 5_000
const STARTLE_MS = 300

function tipSeen(): boolean {
  try {
    return window.sessionStorage.getItem(TIP_SEEN) === '1'
  } catch {
    return false
  }
}

/**
 * The wraith: a small figure fixed under the nav (desktop) or above the tab bar
 * (phones). Clicking it opens a square speech bubble beside it with one line of
 * the tree and its choices. Non-modal: Esc, a click outside or Close shuts it
 * and focus returns to the figure. When the checklist has a step left it hops
 * until clicked (once per session); the click opens that tip.
 */
export default function Companion({ hasNextStep }: { hasNextStep: boolean }) {
  const [node, setNode] = useState<NodeId | null>(null)
  // Read once on mount (this chunk only loads in the browser); the hop follows the checklist from there.
  const [tipDone, setTipDone] = useState(tipSeen)
  const [talking, setTalking] = useState(false)
  const [skip, setSkip] = useState(false)
  const [startle, setStartle] = useState(false)
  const [asleep, setAsleep] = useState(false)
  const [wander, setWander] = useState(false)
  const launcher = useRef<HTMLButtonElement>(null)
  const root = useRef<HTMLElement>(null)
  const firstChoice = useRef<HTMLElement | null>(null)
  const open = node !== null

  const hop = hasNextStep && !tipDone

  /** Open a node: the line types out again, with the squint. */
  const show = (id: NodeId) => {
    setSkip(false)
    setTalking(true)
    setNode(id)
  }

  const close = useCallback((refocus = true) => {
    setNode(null)
    if (refocus) launcher.current?.focus()
  }, [])

  // Esc and a click outside close the bubble.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) close(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open, close])

  const reopen = recentCharacters.get()[0]
  const current = node
    ? nodeFor(node, reopen ? { reopen: { label: `Reopen ${reopen.name}`, href: importPath(reopen.url) } } : {})
    : null

  // Squint while the line types out; focus the first choice once it is there.
  useEffect(() => {
    if (!current) return
    firstChoice.current?.focus()
    const t = window.setTimeout(() => setTalking(false), current.text.length * CHAR_MS + 180)
    return () => window.clearTimeout(t)
    // Only a new node restarts the line.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node])

  // Dozes after two quiet minutes with the bubble shut; any input wakes it.
  useEffect(() => {
    let t = 0
    const wake = () => {
      setAsleep(false)
      window.clearTimeout(t)
      t = window.setTimeout(() => setAsleep(true), DOZE_MS)
    }
    wake()
    const events = ['pointerdown', 'keydown', 'scroll'] as const
    events.forEach((e) => window.addEventListener(e, wake, { passive: true }))
    return () => {
      window.clearTimeout(t)
      events.forEach((e) => window.removeEventListener(e, wake))
    }
  }, [])

  // Leaves the screen edge and arcs back, at most every two minutes, never
  // while open, hopping or asleep (CSS drops it under reduced motion).
  useEffect(() => {
    if (open || hop || asleep) return
    let done = 0
    const id = window.setInterval(() => {
      if (document.hidden) return
      setWander(true)
      done = window.setTimeout(() => setWander(false), WANDER_MS)
    }, WANDER_EVERY_MS)
    return () => {
      window.clearInterval(id)
      window.clearTimeout(done)
      setWander(false)
    }
  }, [open, hop, asleep])

  function onLauncher() {
    setStartle(true)
    window.setTimeout(() => setStartle(false), STARTLE_MS)
    if (open) return close()
    if (hop) {
      setTipDone(true)
      try {
        window.sessionStorage.setItem(TIP_SEEN, '1')
      } catch {
        // Best-effort: it hops again next visit.
      }
      return show('tip')
    }
    show('start')
  }

  function pick(choice: Choice) {
    const to = next(choice)
    if ('node' in to) show(to.node)
    else close(false)
  }

  const pose = [
    hop && !open ? 'is-hop' : '',
    talking && !skip ? 'is-talking' : '',
    startle ? 'is-startle' : '',
    asleep && !open ? 'is-asleep' : '',
    wander ? 'is-wander' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <aside ref={root} aria-label="Companion" className="wraith">
      {current && (
        <div id="wraith-bubble" role="dialog" aria-modal="false" aria-labelledby="wraith-line" className="wraith-bubble">
          <p className="wraith-line" aria-live="polite" onClick={() => setSkip(true)}>
            <span id="wraith-line" className="sr-only">
              {current.text}
            </span>
            <span key={node} aria-hidden="true" className={skip ? 'wraith-type is-skip' : 'wraith-type'}>
              {[...current.text].map((ch, i) => (
                <span key={i} style={{ animationDelay: `${i * CHAR_MS}ms` }}>
                  {ch}
                </span>
              ))}
            </span>
          </p>
          <ul className="wraith-choices">
            {current.choices.map((c, i) => {
              const ref = i === 0 ? (el: HTMLElement | null) => void (firstChoice.current = el) : undefined
              return (
                <li key={c.label}>
                  {c.href ? (
                    <Link ref={ref} href={c.href} className="wraith-choice" onClick={() => pick(c)}>
                      {c.label}
                    </Link>
                  ) : (
                    <button ref={ref} type="button" className="wraith-choice" onClick={() => pick(c)}>
                      {c.label}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
          <button type="button" className="wraith-close" onClick={() => close()}>
            Close
          </button>
        </div>
      )}
      <button
        ref={launcher}
        type="button"
        className={`wraith-launcher ${pose}`}
        aria-label={hop ? 'Companion: you have a tip' : 'Companion'}
        aria-expanded={open}
        aria-controls={open ? 'wraith-bubble' : undefined}
        onClick={onLauncher}
      >
        <span className="wraith-float">
          <Wraith className="wraith-art" />
        </span>
      </button>
    </aside>
  )
}
