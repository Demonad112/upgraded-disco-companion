'use client'

/**
 * Batch 2.4 on the site: the defence axis with its beginner tips, the gear axis with the per-slot table and stat
 * swaps, and each resistance's over-cap shared across items. Default text follows `docs/COPY.md` (action first, one
 * reason); the method and the long reasons sit behind Pro detail.
 */

import type { DamageAxis, DefenceAxis, GearReview, SlotScore, StatSwap } from '@poe2/core'
import { ProOnly } from '@/components/shared/ProToggle'
import { Tag } from '@/components/ui'

const GRADE_TONE: Record<string, 'good' | 'accent' | 'warn' | 'danger' | 'default'> = {
  S: 'good', A: 'good', B: 'accent', C: 'warn', D: 'danger',
}

function Letter({ letter, label }: { letter: string; label: string }) {
  return (
    <span
      aria-label={`${label} ${letter}`}
      data-axis-letter
      className="grid h-9 min-w-9 shrink-0 place-items-center border border-accent/50 bg-accent-soft px-1.5 font-display text-lg font-bold text-accent"
    >
      {letter}
    </span>
  )
}

/** The three axes side by side: defence, gear, damage. Each is graded on its own. */
export function AxisSummary({ defence, gear, gearState, damage = null }: { defence: DefenceAxis; gear: GearReview | null; gearState: 'ready' | 'loading' | 'closed'; damage?: DamageAxis | null }) {
  const graded = gearState === 'ready' && gear?.axis.grade ? gear.axis.grade : null
  const gearLine = graded
    ? `${gear!.axis.graded} of ${gear!.axis.total} items graded. The Gear tab says which line to change first.`
    : gearState === 'closed'
      ? 'Open the Gear tab to grade each item.'
      : gearState === 'ready'
        ? 'No item could be graded from this code.'
        : 'Grading your items…'
  return (
    <ul className="grid gap-3 sm:grid-cols-3" aria-label="Grades" data-axis-summary>
      <li className="flex min-w-0 gap-3" data-axis="defence">
        <Letter letter={defence.letter} label="Defence" />
        <div className="min-w-0">
          <div className="label-metric">Defence</div>
          <p className="text-xs leading-relaxed text-ink-dim">{defence.sentence}</p>
        </div>
      </li>
      <li className="flex min-w-0 gap-3" data-axis="gear">
        <Letter letter={graded ?? '—'} label="Gear" />
        <div className="min-w-0">
          <div className="label-metric">Gear</div>
          <p className="text-xs leading-relaxed text-ink-dim">{gearLine}</p>
        </div>
      </li>
      <li className="flex min-w-0 gap-3" data-axis="damage">
        <Letter letter={damage?.letter ?? '—'} label="Damage" />
        <div className="min-w-0">
          <div className="label-metric">Damage</div>
          <p className="text-xs leading-relaxed text-ink-dim">
            {damage ? `${damage.sentence} (${damage.label})` : 'Not graded: this code carries no main-skill damage figure.'}
          </p>
        </div>
      </li>
    </ul>
  )
}

/** Defence tab: the grade and up to three things to fix, most urgent first. */
export function DefenceAxisCard({ axis }: { axis: DefenceAxis }) {
  return (
    <section id="defence-axis" aria-labelledby="defence-axis-title" className="card p-4 sm:p-5" data-defence-axis>
      <div className="flex items-center gap-3">
        <Letter letter={axis.letter} label="Defence grade" />
        <h3 id="defence-axis-title" className="h3">
          Defence grade
        </h3>
      </div>
      {axis.tips.length ? (
        <ol className="mt-3 space-y-1.5" aria-label="Fix these first">
          {axis.tips.map((t) => (
            <li key={`${t.kind}-${t.type}`} className="text-sm leading-relaxed text-ink" data-defence-tip={t.kind}>
              {t.text}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-sm text-ink">{axis.sentence}</p>
      )}
      <ProOnly>
        <p className="mt-3 text-xs leading-relaxed text-ink-mute">
          {axis.score !== null
            ? `Defence scores ${Math.round(axis.score * 100)}% on the build grade's rubric: largest hit survived, elemental and chaos resistance. S is 85% or more, A 70%, B 55%, C 40%.`
            : `Defence scores between ${Math.round(axis.range!.min * 100)}% and ${Math.round(axis.range!.max * 100)}%. ${axis.missing ?? ''}`}
        </p>
      </ProOnly>
    </section>
  )
}

function slotGrade(s: SlotScore) {
  if (s.grade === null) return <Tag>not graded</Tag>
  return <Tag tone={GRADE_TONE[s.grade]}>{`${s.grade} · ${Math.round(s.score!)}`}</Tag>
}

function SwapItem({ swap }: { swap: StatSwap }) {
  const others = swap.candidates.slice(1)
  return (
    <li className="border-b border-line/60 py-2 last:border-b-0" data-swap={swap.slotLabel}>
      <p className="text-sm leading-relaxed text-ink">{swap.sentence}</p>
      {others.length ? (
        <p className="mt-0.5 text-xs leading-relaxed text-ink-dim">
          Also good: {others.map((c) => c.text ?? c.modId).join('; ')}.
        </p>
      ) : null}
      <ProOnly>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-mute">
          {swap.cost} {swap.candidates.map((c) => `${c.affix ?? c.modId} (tier ${c.tier}): ${c.reason}`).join(' ')}
        </p>
      </ProOnly>
    </li>
  )
}

/** Gear tab: the gear grade, each slot's grade or why it has none, and the stat swaps (biggest waste first). */
export function GearReviewCard({ review, ready }: { review: GearReview | null; ready: boolean }) {
  if (!review || !ready) {
    return (
      <section className="card p-4 sm:p-5" aria-busy="true" data-gear-review="loading">
        <p className="text-sm text-ink-dim">Grading your items…</p>
      </section>
    )
  }
  const { axis, report, swaps } = review
  return (
    <section id="gear-review" aria-labelledby="gear-review-title" className="card p-4 sm:p-5" data-gear-review="ready">
      <div className="flex items-center gap-3">
        <Letter letter={axis.grade ?? '—'} label="Gear grade" />
        <h3 id="gear-review-title" className="h3">
          Gear grade
        </h3>
      </div>
      <p className="mt-2 text-sm text-ink">
        {swaps.length ? 'Fix the lines below first: each one is doing nothing for your build.' : 'No wasted lines. Upgrade the lowest-graded slot next.'}
      </p>
      <ProOnly>
        <p className="mt-1 text-xs leading-relaxed text-ink-mute">
          {report.basis} Graded {axis.graded} of {axis.total} slots; the gear grade is their average ({axis.score ?? '—'}). {report.profile.reasons.join(' ')}
        </p>
      </ProOnly>

      <ul className="mt-3" aria-label="Item grades">
        {report.slots.map((s) => (
          <li key={s.slotId} className="flex items-start justify-between gap-3 border-b border-line/60 py-1.5 last:border-b-0" data-slot-grade={s.slotLabel}>
            <div className="min-w-0">
              <div className="text-sm text-ink">
                {s.slotLabel} <span className="text-ink-mute">· {s.name}</span>
              </div>
              {s.missing ? <p className="text-xs leading-relaxed text-ink-mute">{s.missing}</p> : null}
            </div>
            {slotGrade(s)}
          </li>
        ))}
      </ul>

      {swaps.length ? (
        <>
          <h4 className="mt-4 label-metric">Swap these lines</h4>
          <ul className="mt-1" aria-label="Stat swaps">
            {swaps.map((s) => (
              <SwapItem key={`${s.slotId}-${s.line.modId}`} swap={s} />
            ))}
          </ul>
        </>
      ) : null}
    </section>
  )
}

/** Sheet tab: each resistance's over-cap, split across the item lines that spend it. */
export function OverCapShares({ review }: { review: GearReview | null }) {
  if (!review || !review.overCap.length) return null
  return (
    <section id="sheet-over-cap" aria-labelledby="sheet-over-cap-title" className="card p-4 sm:p-5">
      <h3 id="sheet-over-cap-title" className="text-sm font-semibold text-ink">
        Resistance over the cap
      </h3>
      <p className="mt-1 text-xs text-ink-dim">Move some of this into other stats. Each point is counted once, biggest line first.</p>
      <ul className="mt-2">
        {review.overCap.map((o) => (
          <li key={o.type} className="border-b border-line/60 py-1.5 text-sm text-ink last:border-b-0" data-over-cap={o.type} data-outline-field data-provenance="derived">
            {o.sentence}
          </li>
        ))}
      </ul>
    </section>
  )
}
