'use client'

/**
 * PoB's own calc engine for a pasted code. Two transports, one answer shape (`PobEngineResult`):
 *   - browser (default): PoB2 in WebAssembly in a worker on this device (`pobEngineBrowser.ts`), when the build ships
 *     the engine files and the device has the memory (`browserEngineSuitable`);
 *   - server (fallback): `services/pob-engine` via `@poe2/core` `fetchPobEngine`, when `NEXT_PUBLIC_POB_ENGINE_BASE`
 *     is set at build time (its origin is added to `connect-src` by `scripts/csp-hashes.mjs`). Used where the browser
 *     engine is unsuitable, and after the browser engine crashes or runs out of memory.
 * Neither: off.
 *
 * A code stores PoB's damage for its main skill group only; the engine calculates every other group (~25 s in the
 * browser on first use, ~10 s on the server). The analysis runs without it first and runs again once it answers, so
 * nothing waits on it. A failure is shown as one line on the Damage tab, never as an error over the analysis.
 *
 * The status lives in a small module store so the Damage tab reads it without threading props through every panel.
 */

import { useEffect, useSyncExternalStore } from 'react'
import { fetchPobEngine, type PobEngineResult } from '@poe2/core'
import { browserEngineSuitable, calcInBrowser, POB_CALC_AVAILABLE, type BrowserEnginePhase } from './pobEngineBrowser'

export const POB_ENGINE_BASE = (process.env.NEXT_PUBLIC_POB_ENGINE_BASE || '').replace(/\/+$/, '')

export type PobEngineTransport = 'browser' | 'server'

export type PobEngineStatus =
  | { status: 'off' }
  | { status: 'loading'; where: PobEngineTransport; phase?: BrowserEnginePhase }
  | { status: 'ready'; result: PobEngineResult; where: PobEngineTransport }
  | { status: 'error'; message: string; where: PobEngineTransport }

/** Which transport a device uses first, or null for none. Exported for tests. */
export function pickTransport({
  browserFiles = POB_CALC_AVAILABLE,
  suitable = browserEngineSuitable(),
  serverBase = POB_ENGINE_BASE,
}: { browserFiles?: boolean; suitable?: boolean; serverBase?: string } = {}): PobEngineTransport | null {
  if (browserFiles && suitable) return 'browser'
  if (serverBase) return 'server'
  return null
}

/** Browser errors after which the server is worth a try: no engine files, or a crash / out of memory. */
const fallsBack = (err: Error & { kind?: string }) => err.kind === 'load' || err.kind === 'fatal'

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
const answered = new Map<string, { result: PobEngineResult; where: PobEngineTransport }>()

/** The engine's status for whichever code the character page last asked about. */
export function usePobEngineStatus(): PobEngineStatus {
  return useSyncExternalStore(subscribe, () => current, () => OFF)
}

/** Ask the engine about `code` (null: nothing to ask, e.g. a poe.ninja import). Returns the answer once it is in. */
export function usePobEngine(code: string | null): PobEngineResult | null {
  const status = usePobEngineStatus()
  useEffect(() => {
    const first = code ? pickTransport() : null
    if (!code || !first) {
      set(OFF)
      return
    }
    const hit = answered.get(code)
    if (hit) {
      set({ status: 'ready', result: hit.result, where: hit.where })
      return
    }
    const ctrl = new AbortController()
    const live = () => !ctrl.signal.aborted
    let where: PobEngineTransport = first
    const viaServer = () => {
      where = 'server'
      if (live()) set({ status: 'loading', where: 'server' })
      return fetchPobEngine(code, { baseUrl: POB_ENGINE_BASE, fetch: (i, init) => fetch(i, init), signal: ctrl.signal })
    }
    const run = async (): Promise<{ result: PobEngineResult; where: PobEngineTransport }> => {
      if (first === 'server') return { result: await viaServer(), where: 'server' }
      set({ status: 'loading', where: 'browser' })
      try {
        const result = await calcInBrowser(code, { signal: ctrl.signal, onPhase: (phase) => live() && set({ status: 'loading', where: 'browser', phase }) })
        return { result, where: 'browser' }
      } catch (err) {
        if (POB_ENGINE_BASE && live() && fallsBack(err as Error & { kind?: string })) return { result: await viaServer(), where: 'server' }
        throw err
      }
    }
    // A run this effect has given up on (the code changed) never writes the status: it belongs to the new code.
    run().then(
      (answer) => {
        answered.set(code, answer)
        if (answered.size > 8) answered.delete(answered.keys().next().value!)
        if (live()) set({ status: 'ready', ...answer })
      },
      (err: Error) => {
        if (live() && err.name !== 'AbortError') set({ status: 'error', message: err.message, where })
      },
    )
    return () => ctrl.abort()
  }, [code])
  return code && status.status === 'ready' ? (answered.get(code)?.result ?? null) : null
}
