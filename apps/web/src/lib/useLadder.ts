'use client'

/**
 * Fetch the ladder sample this character's damage is graded against.
 *
 * Entirely best-effort. Failure is silent by design: the assessment already
 * knows how to leave offence unscored and say so, which is strictly better than
 * grading damage against a threshold nobody measured. So this hook never
 * surfaces an error — it just returns null, and the assessment explains itself.
 */

import { useEffect, useState } from 'react'
import { fetchLadder, type LadderSummary } from '@poe2/core'
import { PROXY_BASE } from './proxy'

/** `settled` is true once the request has answered (with a sample or without), or when there is nothing to ask for. */
export function useLadder(league: string | null, ascendancy: string | null): { ladder: LadderSummary | null; settled: boolean } {
  const [summary, setSummary] = useState<LadderSummary | null>(null)
  const [settledFor, setSettledFor] = useState<string | null>(null)
  const key = league ? `${league}|${ascendancy ?? ''}` : null

  useEffect(() => {
    if (!league) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting state to sync with a changed external input (league)
      setSummary(null)
      return
    }
    let cancelled = false
    void fetchLadder({
      fetch: (input, init) => fetch(input, init),
      proxyBaseUrl: PROXY_BASE,
      league,
      ...(ascendancy ? { ascendancy } : {}),
    }).then((next) => {
      if (!cancelled) {
        setSummary(next)
        setSettledFor(key)
      }
    })
    return () => {
      cancelled = true
    }
  }, [league, ascendancy, key])

  return { ladder: summary, settled: key === null || settledFor === key }
}
