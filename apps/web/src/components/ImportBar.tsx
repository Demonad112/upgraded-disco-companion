'use client'

import { useRef, useState } from 'react'
import { NinjaClient, NinjaError, looksLikePobCode, parseProfileUrl } from '@poe2/core'
import { PROXY_BASE } from '@/lib/proxy'
import { useLocalStore } from '@/lib/localStore'
import { recentCharacters } from '@/lib/recentCharacters'
import { isOffline } from '@/lib/online'
import { Button, Input, Segmented, Textarea, tabPanelProps } from './shared/controls'

const EXAMPLE = 'https://poe.ninja/poe2/profile/Demonad112-2589/forbiddenrites/character/Yykiuy'
const IMPORT_METHODS = [
  { value: 'url', label: 'poe.ninja URL' },
  { value: 'paste', label: 'Paste data' },
] as const

export type ImportResult =
  /** `url` is set when it came from a poe.ninja profile URL, so it can be re-imported. */
  | { ok: true; kind: 'ninja'; data: unknown; url?: string }
  /** A Path of Building export code. Fewer stats, all of them real. */
  | { ok: true; kind: 'pob'; code: string }
  | { ok: false; error: string; canPaste: boolean; cancelled?: boolean }

/** Shown while the proxy reports poe.ninja as busy (429/503): `seconds` left before retry `step` of `of`. */
type BusyInfo = { seconds: number; step: number; of: number }

/** Waits between retries when the proxy sends no `Retry-After`. Three steps, then the error shows. */
export const BACKOFF_SECONDS = [3, 6, 12] as const
/** Wait before the single retry after a request that got no response. */
const NETWORK_RETRY_S = 2
const MAX_RETRY_AFTER_S = 30

/** A poe.ninja PoE2 profile URL in free text (a share sheet's `text` is often "Check this out https://…"). */
export function findProfileUrl(text: string | null | undefined): string | null {
  const m = text?.match(/https?:\/\/(?:www\.)?poe\.ninja\/poe2\/profile\/[^\s"'<>]+/i)
  if (!m) return null
  const url = m[0].replace(/[).,;!?]+$/, '')
  return parseProfileUrl(url) ? url : null
}

/** The profile URL a PWA share (`?url=` / `?text=`) carries, or null. */
export function sharedProfileUrl(search: string): string | null {
  const q = new URLSearchParams(search)
  return findProfileUrl(q.get('url')) ?? findProfileUrl(q.get('text'))
}

function waitSeconds(seconds: number, signal: AbortSignal | undefined, tick: (left: number) => void): Promise<boolean> {
  return new Promise((resolve) => {
    let left = seconds
    tick(left)
    const done = (ok: boolean) => {
      clearInterval(timer)
      signal?.removeEventListener('abort', onAbort)
      resolve(ok)
    }
    const onAbort = () => done(false)
    const timer = setInterval(() => {
      left -= 1
      if (left <= 0) done(true)
      else tick(left)
    }, 1000)
    if (signal?.aborted) done(false)
    else signal?.addEventListener('abort', onAbort)
  })
}

/** Why `target` can't be imported, or null when it looks like a full profile URL. */
function checkProfileUrl(target: string): string | null {
  const ref = parseProfileUrl(target)
  if (!ref) return 'That does not look like a poe.ninja PoE2 character URL. Expected something like the example below.'
  if (!ref.leagueSlug) return 'That URL has no league in it. Use the full profile URL, which includes the league.'
  return null
}

/**
 * Fetch a character by its poe.ninja profile URL. Shared by the import bar and
 * the character page's `?import=` handling, which lives on the page: the page
 * owns `busy` and the box's open state, and reads the parameter once per visit.
 */
export async function importProfile(
  target: string,
  opts: { onBusy?: (info: BusyInfo | null) => void; signal?: AbortSignal } = {},
): Promise<ImportResult> {
  const ref = parseProfileUrl(target)
  if (!ref?.leagueSlug) return { ok: false, error: checkProfileUrl(target) ?? 'Invalid URL.', canPaste: false }
  if (isOffline()) {
    return {
      ok: false,
      error:
        "You're offline, so poe.ninja import won't work. Pasting character JSON or a Path of Building code still does.",
      canPaste: true,
    }
  }
  // The client's own retry is off: the proxy answers 429/503 when poe.ninja is busy, and the bar shows that wait
  // (with a Cancel) instead of sitting silent.
  let busy: { retryAfter: number | null } | null = null
  const client = new NinjaClient({
    fetch: async (i, init) => {
      const res = await fetch(i, init)
      const header = Number(res.headers.get('retry-after'))
      busy =
        res.status === 429 || res.status === 503
          ? { retryAfter: Number.isFinite(header) && header > 0 ? header : null }
          : null
      return res
    },
    proxyBaseUrl: PROXY_BASE,
    retries: 0,
  })
  try {
    let data: unknown
    let networkRetried = false
    for (let attempt = 0; ; attempt++) {
      busy = null
      try {
        data = await client.fetchCharacter(ref.account, ref.leagueSlug, ref.character)
        break
      } catch (err) {
        // A phone switching between Wi-Fi and mobile data drops the request with no response at all. One quiet retry
        // covers that blip; a blocked or dead host still fails the second time and shows the message.
        if (err instanceof NinjaError && err.reason === 'network' && !networkRetried) {
          networkRetried = true
          if (!(await waitSeconds(NETWORK_RETRY_S, opts.signal, () => {}))) {
            return { ok: false, error: 'Import cancelled.', canPaste: true, cancelled: true }
          }
          attempt--
          continue
        }
        const hint = busy as { retryAfter: number | null } | null
        if (!hint || attempt >= BACKOFF_SECONDS.length) throw err
        const seconds = Math.min(MAX_RETRY_AFTER_S, Math.ceil(hint.retryAfter ?? BACKOFF_SECONDS[attempt]))
        const step = attempt + 1
        const resumed = await waitSeconds(seconds, opts.signal, (left) =>
          opts.onBusy?.({ seconds: left, step, of: BACKOFF_SECONDS.length }),
        )
        if (!resumed) return { ok: false, error: 'Import cancelled.', canPaste: true, cancelled: true }
      }
    }
    opts.onBusy?.(null)
    // Put the profile in the address bar, so a reload or a shared link
    // re-imports the same character instead of landing on an empty page.
    try {
      const next = new URL(window.location.href)
      next.searchParams.set('import', target)
      window.history.replaceState(window.history.state, '', next)
    } catch {
      // Cosmetic only.
    }
    return { ok: true, kind: 'ninja', data, url: target }
  } catch (err) {
    opts.onBusy?.(null)
    const message =
      err instanceof NinjaError && /returned (429|503)\b/.test(err.message)
        ? 'poe.ninja is still busy after three retries. Try again in a minute, or paste the character data instead.'
        : err instanceof NinjaError
          ? err.message
          : `Import failed: ${(err as Error).message ?? 'unknown error'}`
    return { ok: false, error: message, canPaste: true }
  }
}

export function ImportBar({
  onResult,
  busy,
  setBusy,
}: {
  onResult: (r: ImportResult) => void
  busy: boolean
  setBusy: (b: boolean) => void
}) {
  const [mode, setMode] = useState<'url' | 'paste'>('url')
  const [url, setUrl] = useState('')
  const [paste, setPaste] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recents = useLocalStore(recentCharacters)
  const [busyInfo, setBusyInfo] = useState<BusyInfo | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  async function importUrl(e: React.FormEvent) {
    e.preventDefault()
    await runImport(url)
  }

  async function runImport(target: string) {
    setError(null)
    setMode('url')
    setUrl(target)
    const invalid = checkProfileUrl(target)
    if (invalid) {
      setError(invalid)
      return
    }
    setBusy(true)
    // importProfile never throws. On success the page owns `busy` until the analysis lands; clearing it here as well
    // dropped the skeleton for the whole analysis.
    const controller = new AbortController()
    abortRef.current = controller
    const result = await importProfile(target, { onBusy: setBusyInfo, signal: controller.signal })
    abortRef.current = null
    setBusyInfo(null)
    if (!result.ok && result.cancelled) {
      setBusy(false)
      return
    }
    if (!result.ok) {
      setError(result.error)
      setBusy(false)
    }
    onResult(result)
  }

  /** iOS has no share target, so a tap reads the clipboard (permission prompt included) and fills the box. */
  async function pasteUrl() {
    setError(null)
    try {
      const found = findProfileUrl(await navigator.clipboard.readText())
      if (found) setUrl(found)
      else setError('The clipboard has no poe.ninja PoE2 profile URL. Copy it from the character page and tap Paste again.')
    } catch {
      setError('Could not read the clipboard. Long-press the box and paste the URL instead.')
    }
  }

  function importPaste(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const text = paste.trim()
    if (!text) {
      setError('Paste a character model JSON or a Path of Building export code.')
      return
    }
    // A Path of Building code is a second real source, not a lesser one: it
    // carries 106 computed PlayerStat values including every maximum-hit-taken
    // figure. This used to be rejected on the false claim that it carried none.
    if (looksLikePobCode(text)) {
      onResult({ ok: true, kind: 'pob', code: text })
      return
    }

    try {
      onResult({ ok: true, kind: 'ninja', data: JSON.parse(text) })
    } catch {
      setError(
        'That is neither valid JSON nor a Path of Building export code. Paste either the full response from ' +
          'poe.ninja’s character model endpoint, or a Path of Building code copied with its Share button.',
      )
    }
  }

  return (
    <div data-surface="data" className="card p-4 sm:p-5">
      <Segmented
        kind="tabs"
        label="Import method"
        options={IMPORT_METHODS}
        value={mode}
        onChange={(m) => {
          setMode(m)
          setError(null)
        }}
        idBase="import"
        className="mb-3"
      />

      <div {...tabPanelProps('import', mode)}>
        {mode === 'url' ? (
          <form onSubmit={importUrl} className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="url"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://poe.ninja/poe2/profile/Account-1234/league/character/Name"
              aria-label="poe.ninja character URL"
              className="flex-1"
            />
            <Button type="button" onClick={() => void pasteUrl()} disabled={busy}>
              Paste
            </Button>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? 'Analysing…' : 'Analyse'}
            </Button>
          </form>
        ) : (
          <form onSubmit={importPaste} className="flex flex-col gap-2">
            <Textarea
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              rows={4}
              placeholder='Paste a character model JSON, or a Path of Building export code'
              aria-label="Character model JSON or Path of Building code"
              className="font-mono"
            />
            <Button type="submit" variant="primary" disabled={busy} className="self-start">
              Analyse pasted data
            </Button>
          </form>
        )}

        {mode === 'url' && recents.length > 0 ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-ink-mute">Recent:</span>
            {recents.map((r) => (
              <Button
                key={r.url}
                size="sm"
                disabled={busy}
                onClick={() => void runImport(r.url)}
                title={r.url}
                className="font-medium text-ink-dim"
              >
                {r.name}
                {r.level ? <span className="text-ink-mute"> · {r.level}</span> : null}
              </Button>
            ))}
          </div>
        ) : null}

        {busyInfo ? (
          <p role="status" className="mt-2 flex flex-wrap items-center gap-2 text-xs leading-relaxed text-ink-dim">
            <span>
              poe.ninja is busy, retrying in {busyInfo.seconds} s (try {busyInfo.step} of {busyInfo.of})
            </span>
            <Button size="sm" onClick={() => abortRef.current?.abort()}>
              Cancel
            </Button>
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="mt-2 text-xs leading-relaxed text-danger">
            {error}
          </p>
        ) : null}

        <p className="mt-2 text-[11px] leading-relaxed text-ink-mute">
          {mode === 'url' ? (
            <>
              Example:{' '}
              <button
                type="button"
                onClick={() => setUrl(EXAMPLE)}
                className="text-accent underline underline-offset-2 transition-opacity hover:opacity-80"
              >
                {EXAMPLE}
              </button>
              {' '}
              — fetched through a small proxy. If that&apos;s down, paste the data instead.
            </>
          ) : (
            'Runs entirely in your browser, on what you paste here.'
          )}
        </p>
      </div>
    </div>
  )
}
