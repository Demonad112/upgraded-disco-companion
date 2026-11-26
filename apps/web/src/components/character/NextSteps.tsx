'use client'

/**
 * "Next 3 steps": the one advice list on the Overview, under the hero. Each step is a plain sentence with Details
 * (the tab behind it) and Find on trade. A resistance step gets a prefilled trade2 search; any other opens /trade.
 * "Show all (n)" opens every finding in place.
 */

import { useState, type ReactNode } from 'react'
import type { NextStep, RecommendationReport } from '@poe2/core'
import { BASE_PATH } from '@/lib/basePath'
import { TRADE_LEAGUE } from '@/lib/constants'
import { useTradeMap } from './TopFixes'
import { findingForStep, stepAnchor, tradeLinkFor } from './topFixesData'

export function NextSteps({
  steps,
  report,
  league,
  all,
  expand = false,
  pending = false,
}: {
  steps: NextStep[]
  report: RecommendationReport
  league?: string | null
  /** The full findings list, shown in place under "Show all (n)". */
  all?: ReactNode
  /** A link to `#findings` asks for the list to be open. */
  expand?: boolean
  /** The steps wait on the full analysis, the gear grade and the damage figure: hold their place. */
  pending?: boolean
}) {
  const [shown, setShown] = useState(false)
  const open = shown || expand
  const total = report.recommendations.length
  const findings = steps.map((s) => findingForStep(s, report))
  const map = useTradeMap(!pending && findings.some((f) => f !== null))
  const tradeLeague = league || TRADE_LEAGUE
  const title = steps.length === 1 ? 'Next step' : `Next ${steps.length || 3} steps`

  return (
    <section data-surface="data" className="card min-w-0" aria-labelledby="next-steps-title" data-next-steps {...(pending ? { 'aria-busy': true, 'data-pending': true } : {})}>
      <h3 id="next-steps-title" className="h3">
        {pending ? 'Next 3 steps' : title}
      </h3>
      {pending ? (
        <div className="skeleton mt-3" style={{ height: 'min(300px, 56vw + 100px)' }} />
      ) : (
        <ol className="mt-3 space-y-3">
          {steps.map((s, i) => {
            const f = findings[i]!
            const details = stepAnchor(s)
            const trade = f && map ? tradeLinkFor(f, map, tradeLeague) : null
            return (
              <li key={i} className="flex gap-3 border border-line bg-sunken/65 p-3" data-step-area={s.area}>
                <span aria-hidden className="tabular grid size-7 shrink-0 place-items-center border border-accent font-mono text-sm text-accent">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm leading-snug font-medium text-ink">{s.text}</p>
                  {details ? (
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <a href={details} className="btn btn-secondary btn-sm" aria-label={`Details: ${s.text}`}>
                        Details
                      </a>
                      {trade ? (
                        <a href={trade} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" aria-label={`Find on trade: search trade2 for step ${i + 1}`} data-trade="search">
                          Find on trade
                        </a>
                      ) : (
                        <a href={`${BASE_PATH}/trade/`} className="btn btn-secondary btn-sm" aria-label={`Find on trade: open the trade page for step ${i + 1}`} data-trade="page">
                          Find on trade
                        </a>
                      )}
                    </div>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ol>
      )}
      {!pending && all && total > 0 ? (
        <div className="mt-3">
          <button type="button" className="btn btn-ghost btn-sm" aria-expanded={open} aria-controls="findings" onClick={() => setShown(!open)}>
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
