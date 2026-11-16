'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { HOP_MS, scrollAwayStep } from '@/lib/companionScroll'
import { Wraith } from './Wraith'
import { nextStepTitle } from '@/data/stepTitles'
import { usePersistedState } from '@/hooks/usePersistedState'
import { BASE_PATH } from '@/lib/basePath'
import { hopKind, next, nodeFor, sameRoute, type Choice, type NodeContext, type NodeId } from '@/lib/companionTree'
import { CURRENT_PATCH } from '@/lib/constants'
import { isIdle, subscribeIdle } from '@/lib/idle'
import { importPath, recentCharacters } from '@/lib/recentCharacters'

/** Set once the visitor has opened the tip, so the hop stops for this session. */
const TIP_SEEN = 'poe2-companion-tip-seen'
/** Set once the visitor has opened the stale-patch notice, so that hop stops for this session. */
const STALE_SEEN = 'poe2-companion-stale-seen'
/** Set once the first-visit tour has been opened, for good. */
export const TOURED = 'poe2-companion-toured'
/** Quick type: each letter fades in this many ms after the one before it. */
const CHAR_MS = 6
const DOZE_MS = 120_000
const WANDER_EVERY_MS = 120_000
const WANDER_MS = 5_000
const STARTLE_MS = 300
/** It comes back this long after scrolling stops, or at once on scroll up. */
const BACK_MS = 1000

function flag(store: 'local' | 'session', key: string): boolean {
  try {
    return (store === 'local' ? window.localStorage : window.sessionStorage).getItem(key) === '1'
  } catch {
    // Storage blocked: treat as seen, so a visitor who can never save it is not toured or hopped at every visit.
    return true
  }
}

function setFlag(store: 'local' | 'session', key: string): void {
  try {
    ;(store === 'local' ? window.localStorage : window.sessionStorage).setItem(key, '1')
  } catch {
    // Best-effort.
  }
}

/**
 * The wraith: a small figure fixed under the nav (desktop) or above the tab bar
 * (phones), both top-right. Clicking it opens a square speech bubble beside it
 * with one line of the tree and its choices; `start` opens the node for the
 * current page. Non-modal: Esc, a click outside or Close shuts it and focus
 * returns to the figure. First visit: it hops and the click opens a three-line
 * tour (once, ever). After that it hops only when there is a next step and the
 * visitor has started the checklist or imported a character; the click opens
 * "Next: {step}." (once per session); when the recent character was last read on another patch it hops once per
 * session too and opens the fix node with the patch notice. On phones it slides off the edge while the page scrolls
 * down and returns on scroll up or a second after scrolling stops.
 */
export default function Companion() {
  const [node, setNode] = useState<NodeId | null>(null)
  // Read once on mount (this chunk only loads in the browser); the hop follows the checklist from there.
  const [toured, setToured] = useState(() => flag('local', TOURED))
  const [tipDone, setTipDone] = useState(() => flag('session', TIP_SEEN))
  const [talking, setTalking] = useState(false)
  const [skip, setSkip] = useState(false)
  const [startle, setStartle] = useState(false)
  const [asleep, setAsleep] = useState(false)
  const [wander, setWander] = useState(false)
  const [staleDone, setStaleDone] = useState(() => flag('session', STALE_SEEN))
  const [away, setAway] = useState(false)
  const launcher = useRef<HTMLButtonElement>(null)
  const root = useRef<HTMLElement>(null)
  const firstChoice = useRef<HTMLElement | null>(null)
  const startleTimer = useRef(0)
  const open = node !== null
  const path = usePathname() ?? '/'
  const { state } = usePersistedState()
  const completed = state.checklist.completedStepIds
  const step = nextStepTitle(completed)
  const recent = recentCharacters.get()[0]

  // The latest snapshot of the recent character (snapshots are oldest first) and whether it is from another patch.
  const snap = recent ? [...state.character.snapshots].reverse().find((s) => s.key === recent.key) : undefined
  const was = snap?.gameVersion
  const stale = Boolean(recent && was && was !== CURRENT_PATCH)
  const kind = hopKind({
    hasNextStep: step !== null,
    completed: completed.length,
    hasRecent: Boolean(recent),
    tipSeen: tipDone,
    stalePatch: stale,
    staleSeen: staleDone,
  })
  const hop = !toured || kind !== null

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

  let ctx: NodeContext = { path, step }
  if (recent) {
    ctx = {
      ...ctx,
      recent: {
        name: recent.name,
        href: importPath(recent.url),
        topFix: recent.topFix ?? null,
        stalePatch: stale && was ? { was, now: CURRENT_PATCH } : null,
      },
    }
  }
  const current = node ? nodeFor(node, ctx) : null

  // Squint while the line types out; focus the first choice once it is there.
  useEffect(() => {
    if (!current) return
    firstChoice.current?.focus()
    const t = window.setTimeout(() => setTalking(false), current.text.length * CHAR_MS + 180)
    return () => window.clearTimeout(t)
    // Only a new node restarts the line.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node])

  // Dozes after two quiet minutes (the shared idle signal, lib/idle) with the bubble shut; any input wakes it.
  useEffect(() => subscribeIdle(DOZE_MS, setAsleep), [])

  // Leaves the screen edge and arcs back, at most every two minutes, never
  // while open, hopping or asleep (CSS drops it under reduced motion).
  useEffect(() => {
    if (open || hop || asleep) return
    let done = 0
    const id = window.setInterval(() => {
      if (document.hidden || isIdle(10_000)) return
      setWander(true)
      done = window.setTimeout(() => setWander(false), WANDER_MS)
    }, WANDER_EVERY_MS)
    return () => {
      window.clearInterval(id)
      window.clearTimeout(done)
      setWander(false)
    }
  }, [open, hop, asleep])

  useEffect(() => () => window.clearTimeout(startleTimer.current), [])

  // Phones: slide off the edge while the page scrolls down, back on scroll up or BACK_MS after it stops. Passive,
  // rAF-throttled, and the only thing read is scrollY. Never while the bubble is open, it hops, or the figure has focus.
  // `hop` stays true while a tip is pending, long after the CSS hop has rested, so only the HOP_MS it plays blocks
  // (B1-4: blocking on `hop` kept the figure over the text on every first visit).
  const hopUntil = useRef(0)
  useEffect(() => {
    hopUntil.current = hop ? performance.now() + HOP_MS : 0
  }, [hop])
  const openRef = useRef(false)
  useEffect(() => {
    openRef.current = open
  }, [open])
  useEffect(() => {
    const phone = window.matchMedia('(max-width: 720px)')
    let last = window.scrollY
    let frame = 0
    let back = 0
    const show = () => {
      window.clearTimeout(back)
      setAway(false)
    }
    const onFrame = () => {
      frame = 0
      const y = window.scrollY
      const dy = y - last
      last = y
      const step = scrollAwayStep({
        phone: phone.matches,
        blocked: openRef.current || performance.now() < hopUntil.current,
        focused: !!root.current?.contains(document.activeElement),
        y,
        dy,
      })
      if (step === 'show') return show()
      if (step === 'away') setAway(true)
      window.clearTimeout(back)
      back = window.setTimeout(show, BACK_MS)
    }
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(onFrame)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.cancelAnimationFrame(frame)
      window.clearTimeout(back)
    }
  }, [])

  // Sit under the nav, which the patch banner pushes down (one or two lines, or gone once dismissed).
  useEffect(() => {
    const banner = document.querySelector<HTMLElement>('.patch-banner')
    const el = root.current
    if (!banner || !el || typeof ResizeObserver !== 'function') return
    const ro = new ResizeObserver(() => el.style.setProperty('--banner-h', `${banner.offsetHeight}px`))
    ro.observe(banner)
    return () => ro.disconnect()
  }, [])

  function onLauncher() {
    setStartle(true)
    window.clearTimeout(startleTimer.current)
    startleTimer.current = window.setTimeout(() => setStartle(false), STARTLE_MS)
    if (open) return close()
    if (!toured) {
      setToured(true)
      setFlag('local', TOURED)
      return show('tour1')
    }
    if (kind === 'stale') {
      setStaleDone(true)
      setFlag('session', STALE_SEEN)
      return show('fix')
    }
    if (kind === 'tip') {
      setTipDone(true)
      setFlag('session', TIP_SEEN)
      return show('tip')
    }
    show('start')
  }

  function pick(choice: Choice, e?: MouseEvent) {
    const to = next(choice)
    if ('node' in to) return show(to.node)
    close(false)
    const here = window.location
    const how = sameRoute(to.href, { pathname: here.pathname.slice(BASE_PATH.length) || '/', search: here.search, hash: here.hash })
    if (how === 'link') return
    // Same page: <Link> would change the URL and nothing else (see sameRoute).
    e?.preventDefault()
    const u = new URL(to.href, here.origin)
    // assign() of a same-document hash URL fires `hashchange` (the character tabs listen for it) without a load.
    if (how === 'hash') window.location.assign(u.hash)
    // A full load on purpose: router.push to the same path keeps the page mounted, so its `?import=` effect never runs.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    else if (how === 'load') window.location.assign(`${BASE_PATH}${to.href}`)
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
    <aside ref={root} aria-label="Companion guide" className={away && !open ? 'wraith is-away' : 'wraith'}>
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
                    <Link ref={ref} href={c.href} className="wraith-choice" onClick={(e) => pick(c, e)}>
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
        aria-label={!toured ? 'Companion guide: take the tour' : kind ? 'Companion guide: you have a tip' : 'Companion guide'}
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
