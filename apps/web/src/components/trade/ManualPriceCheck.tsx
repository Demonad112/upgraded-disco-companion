'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  URL_WARN_LENGTH,
  buildSearchQuery,
  buildTradeUrl,
  resolveTradeStatMapFromSnapshot,
  type Trade2StatsSnapshot,
} from '@poe2/core'
import { dataUrl } from '@/lib/basePath'
import { TRADE_LEAGUE, TRADE_STATUS } from '@/lib/constants'
import { tradeStatusOrDefault } from '@/lib/tradeStatus'
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge'
import { Button, Input } from '@/components/shared/controls'

interface Chip {
  id: string
  text: string
  min: string
}
type Load =
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'ready'; snapshot: Trade2StatsSnapshot; bases: string[] }

const MAX_LIST = 8

async function getJson(path: string): Promise<unknown> {
  const res = await fetch(dataUrl(path))
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`)
  return res.json()
}

export function ManualPriceCheck() {
  const [load, setLoad] = useState<Load>({ state: 'loading' })
  const [baseQuery, setBaseQuery] = useState('')
  const [base, setBase] = useState('')
  const [modQuery, setModQuery] = useState('')
  const [chips, setChips] = useState<Chip[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let live = true
    Promise.all([getJson('trade2-stats.json'), getJson('bases.json')])
      .then(([snap, b]) => {
        if (!live) return
        const bases = Object.entries((b as { bases: Record<string, { obtainable?: boolean }> }).bases)
          .filter(([, v]) => v.obtainable !== false)
          .map(([k]) => k)
          .sort()
        setLoad({ state: 'ready', snapshot: snap as Trade2StatsSnapshot, bases })
      })
      .catch((e: Error) => live && setLoad({ state: 'error', message: e.message }))
    return () => {
      live = false
    }
  }, [])

  const snapshot = load.state === 'ready' ? load.snapshot : null
  const bases = useMemo(() => (load.state === 'ready' ? load.bases : []), [load])
  const empty = snapshot !== null && snapshot.entries.length === 0

  const ids = useMemo(() => new Set(snapshot?.entries.map((e) => e.id) ?? []), [snapshot])
  const quick = useMemo(
    () =>
      snapshot
        ? resolveTradeStatMapFromSnapshot(snapshot).filter((r) => r.tradeId !== null && ids.has(r.tradeId))
        : [],
    [snapshot, ids],
  )

  const baseMatches = useMemo(() => {
    const q = baseQuery.trim().toLowerCase()
    if (!q || q === base.toLowerCase()) return []
    return bases.filter((b) => b.toLowerCase().includes(q)).slice(0, MAX_LIST)
  }, [bases, baseQuery, base])

  const modMatches = useMemo(() => {
    const q = modQuery.trim().toLowerCase()
    if (!q || !snapshot) return []
    const have = new Set(chips.map((c) => c.id))
    return snapshot.entries.filter((e) => !have.has(e.id) && e.text.toLowerCase().includes(q)).slice(0, MAX_LIST)
  }, [snapshot, modQuery, chips])

  const addChip = (id: string, text: string) => {
    if (!ids.has(id)) return
    setChips((c) => (c.some((x) => x.id === id) ? c : [...c, { id, text, min: '' }]))
    setModQuery('')
  }

  const result = useMemo(() => {
    const built = buildSearchQuery({
      type: base || undefined,
      status: tradeStatusOrDefault(TRADE_STATUS),
      stats: chips.map((c) => {
        const n = c.min.trim() === '' ? NaN : Number(c.min)
        return { id: c.id, ...(Number.isFinite(n) ? { min: n } : {}) }
      }),
    })
    if (!built.ok) return null
    return buildTradeUrl(TRADE_LEAGUE, built.body)
  }, [base, chips])

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const url = result?.ok ? result.url : null

  const copy = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  if (load.state === 'loading') return <p data-surface="data" className="card min-h-[840px] text-sm text-ink-dim md:min-h-[660px]">Loading trade data…</p>
  if (load.state === 'error')
    return (
      <p data-surface="data" className="card text-sm text-warn" role="alert">
        Could not load trade data ({load.message}).
      </p>
    )

  const snap = load.snapshot

  return (
    <div className="flex flex-col gap-5">
      <section data-surface="data" className="card space-y-4" aria-labelledby="trade-search-title">
        <h2 id="trade-search-title" className="section-title !mb-0">Search</h2>

        {empty ? (
          <p className="text-sm text-warn" role="status">
            The trade stat snapshot is empty, so no mods can be chosen. Run <code>npm run snapshot:trade-stats</code> with{' '}
            <code>TRADE_SNAPSHOT_CONTACT</code> set, then commit <code>packages/data/trade2-stats.json</code>.
          </p>
        ) : (
          <>
            <div className="space-y-2">
              <label htmlFor="trade-base" className="label-metric block">Base type</label>
              <Input
                id="trade-base"
                className="w-full"
                placeholder="Search bases, e.g. Sapphire Ring"
                value={baseQuery}
                autoComplete="off"
                onChange={(e) => {
                  setBaseQuery(e.target.value)
                  setBase('')
                }}
              />
              {baseMatches.length > 0 && (
                <ul aria-label="Matching bases" className="flex flex-wrap gap-2">
                  {baseMatches.map((b) => (
                    <li key={b}>
                      <button
                        type="button"
                        className="chip"
                        onClick={() => {
                          setBase(b)
                          setBaseQuery(b)
                        }}
                      >
                        {b}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="chip w-fit border-accent-line text-accent">Rare or magic · item level 60+</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="trade-mod" className="label-metric block">Mods</label>
              {quick.length > 0 && (
                <ul aria-label="Common mods" className="flex flex-wrap gap-2">
                  {quick.map((q) => (
                    <li key={q.internalId}>
                      <button type="button" className="chip" onClick={() => addChip(q.tradeId!, q.text)}>
                        + {q.text}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <Input
                id="trade-mod"
                className="w-full"
                placeholder="Search all mods by text"
                value={modQuery}
                autoComplete="off"
                onChange={(e) => setModQuery(e.target.value)}
              />
              {modMatches.length > 0 && (
                <ul aria-label="Matching mods" className="flex flex-col gap-1">
                  {modMatches.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        className="w-full border border-line px-3 py-2 text-left text-sm text-ink-dim break-words hover:border-accent-line"
                        onClick={() => addChip(m.id, m.text)}
                      >
                        {m.text} <span className="text-ink-mute">· {m.group ?? m.type}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {chips.length > 0 && (
              <ul aria-label="Chosen mods" className="space-y-2">
                {chips.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-2 border border-line px-3 py-2">
                    <span className="min-w-0 flex-1 basis-40 text-sm break-words text-ink">{c.text}</span>
                    <label className="flex items-center gap-2 text-sm text-ink-dim">
                      <span className="label-metric">Min</span>
                      <Input
                        inputMode="decimal"
                        className="w-20"
                        aria-label={`Minimum for ${c.text}`}
                        value={c.min}
                        onChange={(e) =>
                          setChips((all) => all.map((x) => (x.id === c.id ? { ...x, min: e.target.value } : x)))
                        }
                      />
                    </label>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Remove ${c.text}`}
                      onClick={() => setChips((all) => all.filter((x) => x.id !== c.id))}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      {!empty && (
        <section data-surface="data" className="card space-y-3" aria-labelledby="trade-out-title">
          <h2 id="trade-out-title" className="section-title !mb-0">Link</h2>
          {result && !result.ok && (
            <p className="text-sm text-warn" role="alert">
              This search link is {result.length} characters, over our {8000}-character limit. Remove some mods.
            </p>
          )}
          {result?.ok && (
            <>
              <p className="text-sm text-ink-dim">
                Link length: <span className="font-mono text-ink">{result.length}</span> characters
              </p>
              {result.warning && (
                <p className="text-sm text-warn" role="status">
                  Over {URL_WARN_LENGTH} characters. Some browsers or the trade site may not open it.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <a className="btn btn-primary" href={result.url} target="_blank" rel="noopener">
                  Open on trade site
                </a>
                <Button onClick={copy}>{copied ? 'Copied' : 'Copy link'}</Button>
                {canShare && (
                  <Button onClick={() => navigator.share({ url: result.url }).catch(() => {})}>Share</Button>
                )}
              </div>
            </>
          )}
        </section>
      )}

      <div data-surface="data" className="card space-y-2 text-sm text-ink-dim">
        <p className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 break-words">
            Patch {snap.patch ?? 'unknown'} · fetched {snap.fetchedAt ?? 'never'} · {snap.source}
          </span>
          <ProvenanceBadge label="observed" />
        </p>
        <p>
          The ?q= link prefills filters on trade2 (checked 2026-11-02). Console realms are unverified.
        </p>
      </div>
    </div>
  )
}
