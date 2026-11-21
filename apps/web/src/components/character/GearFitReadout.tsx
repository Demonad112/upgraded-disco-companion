'use client'

/**
 * Gear fit readout and swap veto notes for one Gear card (GF1-4). A labelled readout only: it never changes the
 * order of the rows or the build grade (GF1-2). Anything the data could not decide is printed as missing.
 */

import { useMemo } from 'react'
import { GEAR_FIT_BASIS, planReplacement, type Analysis, type GearFit, type ItemAnalysis } from '@poe2/core'
import { ProOnly } from '@/components/shared/ProToggle'
import type { ModTiersState } from '@/lib/useModTiers'

const statLabel = (id: string) => id.replace(/_/g, ' ').replace(/\+%|%/g, '%').trim()

export function GearFitLine({ fit }: { fit: GearFit | undefined }) {
  if (!fit) return <p className="text-sm text-ink-mute">Gear fit: not available (needs the affix data).</p>
  if (fit.score === null) return <p className="text-sm text-ink-mute">Gear fit: missing. {fit.missing}</p>
  return (
    <div className="text-sm" data-gear-fit>
      <p>
        <span className="label-metric">Gear fit</span> <b className="tabular">{fit.score}</b>/100
        {fit.ceiling !== null && fit.ceiling > fit.score ? <span className="text-ink-mute"> · best on this base {fit.ceiling}</span> : null}
      </p>
      <p className="text-xs text-ink-mute">{GEAR_FIT_BASIS}</p>
      <ProOnly>
        <ul className="mt-1 text-xs text-ink-mute">
          {fit.absent.length ? <li>Not rolled: {fit.absent.map((a) => statLabel(a.statId)).join(', ')}</li> : null}
          {fit.wasted.map((w) => (
            <li key={w.text}>
              {w.amount} wasted on {w.text}: {w.reason}
              {w.sharedWith.length ? ` Shared with ${w.sharedWith.join(', ')}: ${w.overCap}% over cap in total.` : ''}
            </li>
          ))}
          {fit.unscored.length ? <li>{fit.unscored.length} line{fit.unscored.length === 1 ? '' : 's'} not scored (no weight, no ceiling or not understood).</li> : null}
        </ul>
      </ProOnly>
    </div>
  )
}

export function VetoNotes({
  analysis: a,
  state,
  target,
  analysed,
}: {
  analysis: Analysis
  state: ModTiersState
  target: ItemAnalysis | undefined
  analysed: ItemAnalysis[]
}) {
  const notes = useMemo(() => {
    if (!target || state.status !== 'ready') return null
    return planReplacement({
      target,
      items: analysed,
      rawItems: a.items,
      defense: a.defense,
      attribution: a.attribution,
      tiers: state.tiers,
      sheet: a.model.defensiveStats ?? null,
    }).vetoes
  }, [target, analysed, a, state])
  if (!notes?.length) return null
  return (
    <div className="text-sm" data-veto>
      <p className="label-metric">If you swap this item</p>
      <ul className="text-xs text-ink-mute">
        {notes.map((n) => (
          <li key={n.text} className={n.status === 'risk' ? 'text-warn' : undefined}>
            {n.text}
          </li>
        ))}
      </ul>
    </div>
  )
}
