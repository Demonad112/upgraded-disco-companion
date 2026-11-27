'use client'

/**
 * PoB's own calc engine for a pasted code (`services/pob-engine`, `@poe2/core` `fetchPobEngine`).
 *
 * A code stores PoB's damage for its main skill group only; the engine calculates every other group (about 10 s per
 * build). The analysis runs without it first and runs again once it answers, so nothing waits on it.
 *
 * Off unless `NEXT_PUBLIC_POB_ENGINE_BASE` is set at build time (the service is deployed separately; its origin must
 * also be in `connect-src` of `public/_headers`). A failure is shown as one line on the Damage tab, never as an error
 * over the analysis.
 *
 * The status lives in a small module store so the Damage tab reads it without threading props through every panel.
 */

import { useEffect, useSyncExternalStore } from 'react'
import { fetchPobEngine, type PobEngineResult } from '@poe2/core'

export const POB_ENGINE_BASE = (process.env.NEXT_PUBLIC_POB_ENGINE_BASE || '').replace(/\/+$/, '')

export type PobEngineStatus =
  | { status: 'off' }
  | { status: 'loading' }
  | { status: 'ready'; result: PobEngineResult }
  | { status: 'error'; message: string }

const OFF: PobEngineStatus = { status: 'off' }
let current: PobEngineStatus = OFF
const listeners = new Set<() => void>()
function set(next: PobEngineStatus) {
  current = next
  for (const l of listeners) l()
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

// Answers by code for this visit: going back to a code already calculated costs nothing.
const answered = new Map<string, PobEngineResult>()

/** The engine's status for whichever code the character page last asked about. */
export function usePobEngineStatus(): PobEngineStatus {
  return useSyncExternalStore(subscribe, () => current, () => OFF)
}

/** Ask the engine about `code` (null: nothing to ask, e.g. a poe.ninja import). Returns the answer once it is in. */
export function usePobEngine(code: string | null): PobEngineResult | null {
  const status = usePobEngineStatus()
  useEffect(() => {
    if (!code || !POB_ENGINE_BASE) {
      set(OFF)
      return
    }
    const hit = answered.get(code)
    if (hit) {
      set({ status: 'ready', result: hit })
      return
    }
    const ctrl = new AbortController()
    set({ status: 'loading' })
    // A request this effect has given up on (the code changed) never writes the status: it belongs to the new code.
    fetchPobEngine(code, { baseUrl: POB_ENGINE_BASE, fetch: (i, init) => fetch(i, init), signal: ctrl.signal }).then(
      (result) => {
        answered.set(code, result)
        if (answered.size > 8) answered.delete(answered.keys().next().value!)
        if (!ctrl.signal.aborted) set({ status: 'ready', result })
      },
      (err: Error) => {
        if (!ctrl.signal.aborted && err.name !== 'AbortError') set({ status: 'error', message: err.message })
      },
    )
    return () => ctrl.abort()
  }, [code])
  return code && status.status === 'ready' ? (answered.get(code) ?? null) : null
}
