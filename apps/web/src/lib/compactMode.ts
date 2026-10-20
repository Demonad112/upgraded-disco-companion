'use client'

import { createLocalStore } from './localStore'

/**
 * Compact second-monitor mode: a narrow, glanceable layout. Its own key, so
 * the saved-progress blob is untouched. `data-compact` on <html> is what the
 * CSS keys on; the bootstrap below sets it before paint.
 */
export const COMPACT_KEY = 'poe2-endgame-companion:compact:v1'

export const compactMode = createLocalStore<{ on: boolean }>(
  COMPACT_KEY,
  { on: false },
  (v) => typeof v === 'object' && v !== null && typeof (v as { on?: unknown }).on === 'boolean',
)

/** Reflects the store onto the root element. */
export function applyCompact(on: boolean): void {
  document.documentElement.toggleAttribute('data-compact', on)
}

/** In <head>: a stored preference, or `?compact=1|0` (which is stored), applies before first paint. */
export const COMPACT_BOOTSTRAP = `(function(){try{var k=${JSON.stringify(COMPACT_KEY)};var q=new URLSearchParams(location.search).get('compact');if(q==='1'||q==='0')localStorage.setItem(k,JSON.stringify({on:q==='1'}));if(JSON.parse(localStorage.getItem(k)||'{}').on===true)document.documentElement.setAttribute('data-compact','')}catch(e){}})()`
