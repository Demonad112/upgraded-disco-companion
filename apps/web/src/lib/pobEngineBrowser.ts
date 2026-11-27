/**
 * PoB2's calc engine in the visitor's browser: Demonad112/disco-pob-calc (PoB2's Lua on PUC Lua 5.2 in WebAssembly,
 * in a module worker), served from this site under `/pob-calc/<release id>/` (`scripts/fetch-pob-calc.mjs`).
 *
 * It answers in `services/pob-engine`'s shape, so `parsePobEngineResult` and `applyPobEngine` take it unchanged and
 * its figures keep provenance `pob-calc`. Decided 2026-11-27 (owner): "Lift 'no PoB in the browser' and implement the
 * browser engine plan? Yes, browser engine + fallback path". The server engine stays as the fallback transport.
 *
 * Cost on first use: ~3.8 MB download (then the worker's Cache Storage), ~3 s to start PoB, then ~20 s for every skill
 * group, and 370-530 MB of wasm memory. So it runs only where that memory is likely there (`browserEngineSuitable`).
 */

import { parsePobEngineResult, type PobEngineResult } from '@poe2/core'
import lockJson from '../../pob-calc.lock.json'
import { BASE_PATH } from './basePath'

/** `sha256` is null until a release is pinned, so its JSON type would be `null` alone. */
const lock: { pinCommit: string; sha256: string | null } = lockJson
const sha = typeof lock.sha256 === 'string' && /^[0-9a-f]{64}$/.test(lock.sha256) ? lock.sha256 : null

/**
 * The folder the engine is served from (ends with `/`), named by the release tarball's sha256 so `immutable` caching
 * can never serve one release's unhashed files (`engine.wasm`, `pob-worker.js`) for another. Must match
 * `scripts/fetch-pob-calc.mjs` `releaseId`.
 */
export const POB_CALC_DIR = `${BASE_PATH}/pob-calc/${sha ? sha.slice(0, 16) : 'unpinned'}/`

/** False when the build has no engine files: no release pinned, unless a local tarball was unpacked (dev, e2e). */
export const POB_CALC_AVAILABLE = sha !== null || process.env.NEXT_PUBLIC_POB_CALC_LOCAL === '1'

export type BrowserEnginePhase = 'download' | 'start' | 'calc'

/** The part of `pob-calc.js`'s API used here. */
export interface PobCalcModule {
  init(opts: { baseUrl?: string; onProgress?: (p: { phase: string; loaded: number; total: number }) => void }): Promise<unknown>
  calc(code: string, opts?: { groups?: boolean }): Promise<unknown>
  terminate(): void
}

/** An error from the browser engine. `kind`: 'decode', 'engine', 'fatal' (crash or out of memory), 'load' (no engine files). */
export class BrowserEngineError extends Error {
  constructor(
    message: string,
    readonly kind: string,
  ) {
    super(message)
    this.name = 'BrowserEngineError'
  }
}

interface Env {
  WebAssembly?: unknown
  Worker?: unknown
  navigator?: { deviceMemory?: number; userAgent?: string; maxTouchPoints?: number }
}

/**
 * Whether this device should run the engine itself. Needs WebAssembly and module workers, and ~530 MB of headroom:
 * 4 GB or more where the browser reports its memory (Chromium); iPhones and iPads report nothing and kill tabs that
 * size, so they don't (they use the server engine when one is configured).
 */
export function browserEngineSuitable(env: Env = globalThis as Env): boolean {
  if (!env.WebAssembly || typeof env.Worker !== 'function') return false
  const nav = env.navigator
  if (typeof nav?.deviceMemory === 'number') return nav.deviceMemory >= 4
  const ua = nav?.userAgent ?? ''
  if (/iPhone|iPad|iPod/.test(ua)) return false
  // iPadOS reports a desktop Safari user agent; touch points give it away.
  if (/Macintosh/.test(ua) && (nav?.maxTouchPoints ?? 0) > 1) return false
  return true
}

let loading: Promise<PobCalcModule> | null = null

function loadModule(): Promise<PobCalcModule> {
  if (!loading) {
    const url = new URL(`${POB_CALC_DIR}pob-calc.js`, location.href).href
    loading = import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url).catch((err: Error) => {
      loading = null
      throw new BrowserEngineError(`the engine files could not be loaded (${err.message})`, 'load')
    }) as Promise<PobCalcModule>
  }
  return loading
}

/** Run one code through the engine, every skill group included. Aborting stops the engine (it restarts from cache). */
export async function calcInBrowser(
  code: string,
  {
    signal,
    onPhase,
    load = loadModule,
  }: { signal?: AbortSignal; onPhase?: (phase: BrowserEnginePhase) => void; load?: () => Promise<PobCalcModule> } = {},
): Promise<PobEngineResult> {
  const abortError = () => Object.assign(new Error('aborted'), { name: 'AbortError' })
  if (signal?.aborted) throw abortError()
  const mod = await load()
  if (signal?.aborted) throw abortError()
  let started = false
  // A calc can't be cancelled midway; terminating frees the ~500 MB and lets the next code start at once.
  const onAbort = () => mod.terminate()
  signal?.addEventListener('abort', onAbort, { once: true })
  try {
    onPhase?.('download')
    await mod.init({
      baseUrl: new URL(POB_CALC_DIR, location.href).href,
      onProgress: ({ phase }) => {
        if (!started && (phase === 'unpack' || phase === 'start')) {
          started = true
          onPhase?.('start')
        }
      },
    })
    if (signal?.aborted) throw abortError()
    onPhase?.('calc')
    const raw = await mod.calc(code.trim(), { groups: true })
    if (signal?.aborted) throw abortError()
    return parsePobEngineResult(raw)
  } catch (err) {
    if (signal?.aborted) throw abortError()
    if (err instanceof BrowserEngineError) throw err
    const e = err as Error & { kind?: string }
    // A crash message can carry a whole CSP header or stack; the status line needs the gist.
    const msg = (e.message || 'the engine failed').replace(/\s+/g, ' ')
    throw new BrowserEngineError(msg.length > 160 ? `${msg.slice(0, 157)}…` : msg, e.kind ?? 'fatal')
  } finally {
    signal?.removeEventListener('abort', onAbort)
  }
}
