'use client'

/**
 * Top 3 fixes: the engine's three highest-ranked actionable findings as one-liners, each with a link to the panel
 * behind it and a Trade button. A resistance shortfall gets a prefilled trade2 search (`?q=`, built by core's
 * `buildTradeQueries`); anything else, or a stat the trade snapshot cannot map, opens the site's own /trade page.
 */

import { useEffect, useState, type ReactNode } from 'react'
import type { Recommendation, RecommendationReport, TradeStatMap } from '@poe2/core'
import { usePrefs } from '@/hooks/usePrefs'
import { BASE_PATH, dataUrl } from '@/lib/basePath'
import { TRADE_LEAGUE } from '@/lib/constants'
import { fixAnchor, fixLines, topFixes, tradeLinkFor, tradeStatFor } from './topFixesData'

/** Internal stat id → trade id, resolved from the trade2 snapshot at build (`trade-map.json`, about 1 KB). Fetched only when a fix can use it. */
export function useTradeMap(wanted: boolean): TradeStatMap | null {
  const [map, setMap] = useState<TradeStatMap | null>(null)
  useEffect(() => {
    if (!wanted) return
    let live = true
    const load = () =>
      fetch(dataUrl('trade-map.json'))
        .then((r) => (r.ok ? (r.json() as Promise<{ map?: TradeStatMap }>) : Promise.reject(new Error(String(r.status)))))
        .then((j) => live && setMap(j.map ?? {}))
        .catch(() => live && setMap({}))
    // Fetched when the browser is idle, not during the first paint (Safari has no requestIdleCallback).
    const ric = typeof window.requestIdleCallback === 'function'
    const handle = ric ? window.requestIdleCallback(load, { timeout: 3000 }) : window.setTimeout(load, 500)
    return () => {
      live = false
      if (ric) window.cancelIdleCallback(handle)
      else window.clearTimeout(handle)
    }
  }, [wanted])
  return map
}

/** One fix: action, one gain line, Details, and the one trade button. Shared by Top 3 and Easy wins. */
export function FixRow({
  f,
  index,
  map,
  league,
  pro,
  note,
}: {
  f: Recommendation
  index: number
  map: TradeStatMap | null
  league: string
  pro: boolean
  /** A muted line under the gain (Easy wins: how much of the gap it closes, or that the value is not measured). */
  note?: ReactNode
}) {
  const { lead, gain, detail } = fixLines(f, pro)
  const trade = map ? tradeLinkFor(f, map, league) : null
  return (
    <li className="flex gap-3 border border-line bg-sunken/65 p-3">
      <span aria-hidden className="tabular grid size-7 shrink-0 place-items-center border border-accent font-mono text-sm text-accent">
        {index}
      </span>
      <div className="min-w-0">
        <p className="text-sm leading-snug font-medium text-ink">{lead}</p>
        {detail ? <p className="mt-1 text-xs text-ink-mute">{detail}</p> : null}
        {note ? <p className="mt-1 font-mono text-[11px] text-ink-mute">{note}</p> : null}
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {gain ? <span className="tabular mr-1 font-mono text-xs text-good">{gain}</span> : null}
          <a href={fixAnchor(f)} className="btn btn-secondary btn-sm" aria-label={`Details: ${lead}`}>
            Details
          </a>
          {trade ? (
            <a
              href={trade}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
              aria-label={`Find on trade: search trade2 for ${lead.toLowerCase()}`}
              data-trade="search"
            >
              Find on trade
            </a>
          ) : (
            <a
              href={`${BASE_PATH}/trade/`}
              className="btn btn-secondary btn-sm"
              aria-label={`Find on trade: open the trade page for ${lead.toLowerCase()}`}
              data-trade="page"
            >
              Find on trade
            </a>
          )}
        </div>
      </div>
    </li>
  )
}

export function TopFixes({
  report,
  league,
  all,
  expand = false,
}: {
  report: RecommendationReport
  league?: string | null
  /** The full findings list, shown in place under "Show all (n)". */
  all?: ReactNode
  /** A link to `#findings` asks for the list to be open. */
  expand?: boolean
}) {
  const [shown, setShown] = useState(false)
  const open = shown || expand
  const fixes = topFixes(report)
  const total = report.recommendations.length
  const map = useTradeMap(fixes.some((f) => tradeStatFor(f) !== null))
  const tradeLeague = league || TRADE_LEAGUE
  const { proDetail } = usePrefs()

  return (
    <section data-surface="data" className="card min-w-0" aria-labelledby="top-fixes-title" data-top-fixes>
      <h3 id="top-fixes-title" className="h3">
        {fixes.length > 1 ? `Top ${fixes.length} fixes` : 'Top fix'}
      </h3>
      {!fixes.length ? (
        <p className="mt-1.5 text-sm text-ink-dim">{report.summary || 'Nothing urgent to fix.'}</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {fixes.map((f, i) => (
            <FixRow key={f.id} f={f} index={i + 1} map={map} league={tradeLeague} pro={proDetail} />
          ))}
        </ol>
      )}
      {all && (total > fixes.length || report.suppressed.length > 0 || report.unresolved.length > 0) ? (
        <div className="mt-3">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            aria-expanded={open}
            aria-controls="findings"
            onClick={() => setShown(!open)}
          >
            {open ? 'Show fewer' : `Show all (${total})`}
          </button>
          {open ? (
            <div id="findings" className="mt-3">
              {all}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
