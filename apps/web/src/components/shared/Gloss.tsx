'use client'

import { Fragment, useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { glossary } from '@/data/glossary'
import type { GlossaryTerm } from '@/lib/types'

/**
 * Inline glossary: a game term in running text gets a dotted underline and shows its definition on hover, keyboard
 * focus or tap. The definition is a popover in the top layer, so no card's overflow or stacking clips it, and it is
 * placed against the viewport edges so it never widens the page. Without popover support the term still reads its
 * definition to screen readers (aria-describedby) and is plain text to everyone else.
 */

/** The words in running text that name each term: its `matches`, else the term itself. */
function phrases(t: GlossaryTerm): string[] {
  return t.matches ?? [t.term]
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const BY_PHRASE = new Map<string, GlossaryTerm>()
for (const t of glossary) for (const p of phrases(t)) BY_PHRASE.set(p.toLowerCase(), t)

// Longest phrase first, so "Overseer Tablet" wins over "Tablet". An optional plural `s` and whole words only.
const PATTERN = new RegExp(
  `\\b(${[...BY_PHRASE.keys()].sort((a, b) => b.length - a.length).map(escape).join('|')})(s?)\\b`,
  'gi',
)

/** Split text into plain runs and glossary hits; each term is marked once per text, at its first mention. */
export function glossSegments(text: string): (string | { text: string; term: GlossaryTerm })[] {
  const out: (string | { text: string; term: GlossaryTerm })[] = []
  const seen = new Set<string>()
  let last = 0
  for (const m of text.matchAll(PATTERN)) {
    const term = BY_PHRASE.get(m[1]!.toLowerCase())
    if (!term || seen.has(term.id)) continue
    seen.add(term.id)
    if (m.index > last) out.push(text.slice(last, m.index))
    out.push({ text: m[0], term })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

/** Running text with its game terms marked. Anything that isn't a plain string passes through untouched. */
export function Glossed({ children }: { children: ReactNode }) {
  if (typeof children !== 'string') return <>{children}</>
  return (
    <>
      {glossSegments(children).map((s, i) =>
        typeof s === 'string' ? <Fragment key={i}>{s}</Fragment> : <Term key={i} term={s.term}>{s.text}</Term>,
      )}
    </>
  )
}

const GAP = 6
const EDGE = 16

export function Term({ term, children }: { term: GlossaryTerm; children: ReactNode }) {
  const id = useId()
  const button = useRef<HTMLButtonElement>(null)
  const tip = useRef<HTMLSpanElement>(null)
  // 'hover' follows the pointer and focus; 'pinned' is a tap or click and stays until dismissed.
  const [open, setOpen] = useState<null | 'hover' | 'pinned'>(null)

  /** Put the tip under (or above) its word, inside the viewport. False when the word has scrolled out of view. */
  const place = useCallback((): boolean => {
    const b = button.current?.getBoundingClientRect()
    const t = tip.current
    if (!b || !t) return false
    if (b.bottom < 0 || b.top > window.innerHeight) return false
    const w = t.offsetWidth
    const h = t.offsetHeight
    const left = Math.max(EDGE, Math.min(b.left, window.innerWidth - EDGE - w))
    const below = b.bottom + GAP
    const top = below + h > window.innerHeight - EDGE && b.top - GAP - h > EDGE ? b.top - GAP - h : below
    t.style.left = `${left}px`
    t.style.top = `${top}px`
    return true
  }, [])

  useEffect(() => {
    const t = tip.current
    if (!t || typeof t.showPopover !== 'function') return
    if (!open) {
      if (t.matches(':popover-open')) t.hidePopover()
      return
    }
    if (!t.matches(':popover-open')) t.showPopover()
    place()
    const close = () => setOpen(null)
    const outside = (e: PointerEvent) => {
      if (!button.current?.contains(e.target as Node) && !t.contains(e.target as Node)) close()
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    // The tip is fixed to the viewport, so it follows its word on scroll and resize, and closes once the word is gone.
    let raf = 0
    const follow = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        if (!place()) close()
      })
    }
    window.addEventListener('scroll', follow, { passive: true, capture: true })
    window.addEventListener('resize', follow)
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', key)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', follow, { capture: true })
      window.removeEventListener('resize', follow)
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', key)
    }
  }, [open, place])

  const hoverable = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches

  return (
    <>
      <button
        ref={button}
        type="button"
        data-compact-ok
        className="gloss-term"
        aria-describedby={id}
        aria-expanded={open !== null}
        onClick={() => setOpen((o) => (o === 'pinned' ? null : 'pinned'))}
        onPointerEnter={(e) => {
          if (e.pointerType === 'mouse' && hoverable()) setOpen((o) => o ?? 'hover')
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse') setOpen((o) => (o === 'hover' ? null : o))
        }}
        onFocus={(e) => {
          if (e.currentTarget.matches(':focus-visible')) setOpen((o) => o ?? 'hover')
        }}
        onBlur={() => setOpen((o) => (o === 'hover' ? null : o))}
      >
        {children}
      </button>
      <span ref={tip} id={id} role="tooltip" popover="manual" className="gloss-tip">
        <span className="gloss-tip-term">{term.term}</span>
        {term.definition}
      </span>
    </>
  )
}
