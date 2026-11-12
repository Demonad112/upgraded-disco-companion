'use client'

/**
 * The character page's tab lives in the URL hash, using the old section ids so existing links keep working
 * (`?import=…#gear`). Aliases are ids that used to be a section or a panel inside one: they open the owning tab,
 * then scroll to the element.
 */

import { useCallback, useState, useSyncExternalStore } from 'react'

export const TAB_IDS = ['overview', 'defences', 'damage', 'gear', 'progress', 'advanced'] as const
export type TabId = (typeof TAB_IDS)[number]

const ALIASES: Record<string, TabId> = {
  findings: 'overview',
  assessment: 'overview',
  'top-fixes-title': 'overview',
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
  if (!id || (TAB_IDS as readonly string[]).includes(id)) return null
  return id
}

const EVENT = 'poe2-character-tab'
const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  window.addEventListener(EVENT, cb)
  return () => {
    window.removeEventListener('hashchange', cb)
    window.removeEventListener(EVENT, cb)
  }
}
const getHash = () => window.location.hash
const getServerHash = () => ''

/**
 * The open tab, the hash target to scroll to, and the tabs opened so far (lazy data hooks key off the last).
 * Changing tab uses `replaceState`, so tab clicks do not fill the back stack; `hashchange` (a link, the address bar)
 * drives the panel as well.
 */
export function useCharacterTab(): {
  tab: TabId
  target: string | null
  opened: ReadonlySet<TabId>
  select: (id: TabId) => void
} {
  const hash = useSyncExternalStore(subscribe, getHash, getServerHash)
  const tab = tabForHash(hash)
  const [opened, setOpened] = useState<ReadonlySet<TabId>>(() => new Set<TabId>(['overview']))
  // Adjusting state while rendering is React's pattern for state derived from other state.
  if (!opened.has(tab)) setOpened(new Set([...opened, tab]))
  const select = useCallback((id: TabId) => {
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#${id}`)
    window.dispatchEvent(new Event(EVENT))
  }, [])
  return { tab, target: targetForHash(hash), opened, select }
}
