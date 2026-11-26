'use client'

/**
 * The character page's tab lives in the URL hash, using the old section ids so existing links keep working
 * (`?import=…#gear`). Aliases are ids that used to be a section or a panel inside one: they open the owning tab,
 * then scroll to the element.
 */

import { startTransition, useCallback, useEffect, useState } from 'react'

export const TAB_IDS = ['overview', 'sheet', 'defences', 'damage', 'gear', 'progress', 'advanced'] as const
export type TabId = (typeof TAB_IDS)[number]

const ALIASES: Record<string, TabId> = {
  findings: 'overview',
  assessment: 'overview',
  'top-fixes-title': 'overview',
  'next-steps-title': 'overview',
  'easy-wins': 'overview',
  headroom: 'defences',
  'defence-checklist-disclosure': 'defences',
  'defence-checklist': 'defences',
  'what-if': 'defences',
  'damage-review': 'damage',
  'progress-history': 'progress',
  compare: 'progress',
  'advanced-fold': 'advanced',
  'detail-checks': 'advanced',
  'checks-list': 'advanced',
  'character-notes': 'advanced',
  'passive-tree': 'advanced',
  reconciliation: 'advanced',
  attribution: 'advanced',
}

/** The id in a hash (`#gear` → `gear`), decoded; empty when there is none. */
export function hashId(hash: string): string {
  const raw = hash.replace(/^#/, '')
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

/** The tab a hash opens. No hash, or an id the page does not know, opens Overview. */
export function tabForHash(hash: string): TabId {
  const id = hashId(hash)
  if ((TAB_IDS as readonly string[]).includes(id)) return id as TabId
  return ALIASES[id] ?? 'overview'
}

/** The id to scroll to once the tab is open: the alias or element id, never the tab's own id. */
export function targetForHash(hash: string): string | null {
  const id = hashId(hash)
  // A `#pob=<code>` link (lib/pobLink.ts) carries a character, not an element id.
  if (!id || id.startsWith('pob=') || (TAB_IDS as readonly string[]).includes(id)) return null
  return id
}

type TabState = { hash: string; opened: ReadonlySet<TabId> }

/** The next state for a hash: the same object when nothing changes, so React skips the render. */
export function withHash(prev: TabState, hash: string): TabState {
  if (hash === prev.hash) return prev
  const tab = tabForHash(hash)
  return { hash, opened: prev.opened.has(tab) ? prev.opened : new Set([...prev.opened, tab]) }
}

/**
 * The open tab, the hash target to scroll to, and the tabs opened so far (lazy data hooks key off the last).
 * Changing tab uses `replaceState`, so tab clicks do not fill the back stack; `hashchange` (a link, the address bar)
 * drives the panel as well. P4: one state update inside one transition per switch, so a switch is one render and the
 * old panel stays up while a lazy tab loads (no fallback commit in between).
 */
export function useCharacterTab(): {
  tab: TabId
  target: string | null
  opened: ReadonlySet<TabId>
  select: (id: TabId) => void
} {
  const [state, setState] = useState<TabState>(() => ({ hash: '', opened: new Set<TabId>(['overview']) }))
  useEffect(() => {
    const sync = () => startTransition(() => setState((prev) => withHash(prev, window.location.hash)))
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])
  const select = useCallback((id: TabId) => {
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#${id}`)
    startTransition(() => setState((prev) => withHash(prev, `#${id}`)))
  }, [])
  return { tab: tabForHash(state.hash), target: targetForHash(state.hash), opened: state.opened, select }
}
