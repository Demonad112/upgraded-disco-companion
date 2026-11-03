'use client'

/**
 * Top 3 fixes: the engine's three highest-ranked actionable findings as one-liners, each with a link to the panel
 * behind it and a Trade button. A resistance shortfall gets a prefilled trade2 search (`?q=`, built by core's
 * `buildTradeQueries`); anything else, or a stat the trade snapshot cannot map, opens the site's own /trade page.
 */

import { useEffect, useState } from 'react'
import { resolveTradeStatMapFromSnapshot, type RecommendationReport, type Trade2StatsSnapshot, type TradeStatMap } from '@poe2/core'
import { fmt } from '@/components/ui'
import { BASE_PATH, dataUrl } from '@/lib/basePath'
import { TRADE_LEAGUE } from '@/lib/constants'
import { fixAnchor, splitAction, topFixes, tradeLinkFor, tradeStatFor } from './topFixes'

/** Internal stat id → trade id, from the committed trade2 snapshot. Fetched only when a fix can use it. */
function useTradeMap(wanted: boolean): TradeStatMap | null {
  const [map, setMap] = useState<TradeStatMap | null>(null)
  useEffect(() => {
    if (!wanted) return
    let live = true
    const load = () =>
      fetch(dataUrl('trade2-stats.json'))
      .then((r) => (r.ok ? (r.json() as Promise<Trade2StatsSnapshot>) : Promise.reject(new Error(String(r.status)))))
      .then((snap) => {
        if (!live) return
        const m: Record<string, string> = {}
        for (const s of resolveTradeStatMapFromSnapshot(snap)) if (s.tradeId) m[s.internalId] = s.tradeId
        setMap(m)
      })
      .catch(() => live && setMap({}))
    // 1.4 MB: fetched when the browser is idle, not during the first paint (Safari has no requestIdleCallback).
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

export function TopFixes({ report, league }: { report: RecommendationReport; league?: string | null }) {
  const fixes = topFixes(report)
  const map = useTradeMap(fixes.some((f) => tradeStatFor(f) !== null))
  const tradeLeague = league || TRADE_LEAGUE

  return (
    <section data-surface="data" className="card min-w-0" aria-labelledby="top-fixes-title" data-top-fixes>
      <h3 id="top-fixes-title" className="h3">
        {fixes.length > 1 ? `Top ${fixes.length} fixes` : 'Top fix'}
      </h3>
      {!fixes.length ? (
        <p className="mt-1.5 text-sm text-ink-dim">{report.summary || 'Nothing urgent to fix.'}</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {fixes.map((f, i) => {
            const { lead, detail } = splitAction(f.action)
            const trade = map ? tradeLinkFor(f, map, tradeLeague) : null
            return (
              <li key={f.id} className="flex gap-3 border border-line bg-sunken/65 p-3">
                <span aria-hidden className="tabular grid size-7 shrink-0 place-items-center border border-accent font-mono text-sm text-accent">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm leading-snug font-medium text-ink">{lead}</p>
                  {detail ? <p className="mt-1 truncate text-xs text-ink-mute" title={detail}>{detail}</p> : null}
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    {f.impact ? (
                      <span className="tabular mr-1 font-mono text-xs text-good">
                        {f.impact.label}: {fmt(f.impact.from)}
                        {f.impact.unit === 'percent' ? '%' : ''} → {fmt(f.impact.to)}
                        {f.impact.unit === 'percent' ? '%' : ''}
                      </span>
                    ) : null}
                    <a href={fixAnchor(f)} className="btn btn-ghost btn-sm" aria-label={`Details: ${lead}`}>
                      Details
                    </a>
                    {trade ? (
                      <a
                        href={trade}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                        aria-label={`Trade: search trade2 for ${lead.toLowerCase()}`}
                        data-trade="search"
                      >
                        Trade
                      </a>
                    ) : (
                      <a href={`${BASE_PATH}/trade/`} className="btn btn-secondary btn-sm" data-trade="page">
                        Open /trade
                      </a>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
