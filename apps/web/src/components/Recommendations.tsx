'use client'

import { useState } from 'react'
import { FOCUS_CHOICES, focusOf, type FocusChoice } from '@/lib/characterNotes'
import { axisOf, focusView, type Cost, type Evidence, type Recommendation, type RecommendationReport } from '@poe2/core'
import { Tag, fmt } from './ui'
import { Segmented } from './shared/controls'
import { Glossed } from '@/components/shared/Gloss'

const CATEGORY_TONE = {
  survivability: 'danger',
  damage: 'accent',
  efficiency: 'good',
  gear: 'warn',
  question: 'default',
} as const

const COST_LABEL: Record<Cost['kind'], string> = {
  free: 'Free',
  passive: 'Passive points',
  gear: 'Gear slot',
  currency: 'Currency',
  unknown: 'Cost unclear',
}

function costTone(kind: Cost['kind']) {
  return kind === 'free' ? 'good' : kind === 'unknown' ? 'default' : 'warn'
}

function EvidenceLine({ e }: { e: Evidence }) {
  return (
    <li className="flex gap-2 text-[11px] leading-relaxed text-ink-dim">
      <span aria-hidden className="mt-[0.35rem] size-1 shrink-0 bg-ink-mute" />
      <span>{e.note}</span>
    </li>
  )
}

function ImpactBar({ r }: { r: Recommendation }) {
  if (!r.impact) return null
  const { from, to, delta, unit, label } = r.impact
  const suffix = unit === 'percent' ? '%' : ''
  const improving = delta > 0

  return (
    <div className="bg-surface-sunken px-3 py-2">
      <div className="label-field">{label}</div>
      <div className="tabular mt-0.5 flex items-baseline gap-2 text-sm">
        <span className="text-ink-dim">
          {fmt(from)}
          {suffix}
        </span>
        <span aria-hidden className="text-ink-mute">
          →
        </span>
        <span className="font-semibold text-ink">
          {fmt(to)}
          {suffix}
        </span>
        <span className={improving ? 'text-good' : 'text-ink-mute'}>
          ({improving ? '+' : ''}
          {fmt(delta)}
          {suffix})
        </span>
      </div>
    </div>
  )
}

function Card({ r, rank }: { r: Recommendation; rank: number }) {
  const [open, setOpen] = useState(false)
  const isQuestion = r.category === 'question'
  const axis = axisOf(r)

  return (
    <li data-surface="data" className="card flex flex-col">
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          aria-label={isQuestion ? 'Question' : `Finding ${rank}`}
          className="tabular inline-flex h-[22px] min-w-[22px] items-center justify-center border border-accent-line bg-accent-soft px-1 text-[11px] font-semibold text-accent"
        >
          {isQuestion ? '?' : `#${rank}`}
        </span>
        <Tag tone={CATEGORY_TONE[r.category]}>{r.category}</Tag>
        {axis === 'damage' || axis === 'survivability' ? (
          r.category === 'damage' || r.category === 'survivability' ? null : <Tag>helps {axis}</Tag>
        ) : null}
        <Tag tone={costTone(r.cost.kind)}>
          {COST_LABEL[r.cost.kind]}
          {r.cost.amount > 0 ? ` · ${r.cost.amount}` : ''}
          {r.cost.currencyTier && r.cost.currencyTier !== 'unknown' ? ` · ${r.cost.currencyTier}` : ''}
        </Tag>
      </div>
      <h3 className="title-sentence mt-2.5 text-[17px] text-ink">{r.action}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-dim"><Glossed>{r.rationale}</Glossed></p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <ImpactBar r={r} />
        <div className="bg-surface-sunken px-3 py-2">
          <div className="label-field">Cost</div>
          <div className="mt-0.5 text-xs leading-relaxed text-ink-dim">{r.cost.detail}</div>
        </div>
      </div>

      {r.tradeoff ? (
        <p className="mt-3 border-l-2 border-warn pl-2.5 text-[11px] leading-relaxed text-ink-mute">
          <span className="label-field">Trade-off:</span> {r.tradeoff}
        </p>
      ) : null}

      {/* Directly under the body, not pinned to the card's foot: in a two-column row the shorter card ends early. */}
      <div className="mt-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="hit-area text-[11px] text-accent transition-opacity hover:opacity-80"
        >
          {open ? 'Hide evidence' : `Evidence (${r.evidence.length})`}
        </button>
        {open ? (
          <ul className="mt-2 space-y-1.5 border-l border-line pl-3">
            {r.evidence.map((e, i) => (
              <EvidenceLine key={i} e={e} />
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  )
}

export function Recommendations({ report }: { report: RecommendationReport }) {
  const [focus, setFocus] = useState<FocusChoice>('default')
  // `default` is focusView(recs, null): the original order, untouched.
  const ordered = focusView(report.recommendations, focusOf(focus))
  const actionable = ordered.filter((r) => r.category !== 'question')
  const questions = ordered.filter((r) => r.category === 'question')

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs text-ink-dim">
            Ranked by gain per unit of cost. Every claim traces to data in the character payload.
          </p>
        </div>
        <Segmented kind="toggle" label="Focus" options={FOCUS_CHOICES} value={focus} onChange={setFocus} />
      </div>
      {report.buildIsSound ? (
        <p data-surface="data" className="card px-4 py-5 text-sm leading-relaxed text-good">{report.summary}</p>
      ) : (
        <ul className="grid gap-2.5 lg:grid-cols-2 lg:items-stretch">
          {actionable.map((r, i) => (
            <Card key={r.id} r={r} rank={i + 1} />
          ))}
        </ul>
      )}

      {questions.length ? (
        <div className="mt-5">
          <h3 className="mb-2 text-xs font-medium tracking-wide text-ink-dim uppercase">Worth checking</h3>
          <ul className="grid gap-2.5 lg:grid-cols-2 lg:items-stretch">
            {questions.map((r) => (
              <Card key={r.id} r={r} rank={0} />
            ))}
          </ul>
        </div>
      ) : null}

      {report.suppressed.length ? (
        <div data-surface="data" className="card mt-4 p-4">
          <h3 className="text-xs font-medium tracking-wide text-ink-dim uppercase">Ruled out by a keystone</h3>
          <p className="mt-1 text-[11px] text-ink-mute">
            Findings the engine did spot and then withdrew. Shown rather than dropped — a finding that vanishes
            silently is indistinguishable from one that was never noticed.
          </p>
          <ul className="mt-3 space-y-3">
            {report.suppressed.map((s) => (
              <li key={s.id}>
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-xs font-medium text-ink-dim line-through decoration-ink-mute/50">
                    {s.finding}
                  </span>
                  <Tag tone="accent">{s.keystone}</Tag>
                </div>
                <div className="mt-0.5 text-[11px] leading-relaxed text-ink-mute">{s.reason}</div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {report.unresolved.length ? (
        <div data-surface="data" className="card mt-4 p-4">
          <h3 className="text-xs font-medium tracking-wide text-ink-dim uppercase">Could not be determined</h3>
          <p className="mt-1 text-[11px] text-ink-mute">
            Stated rather than guessed — a wrong number is worse than a missing one.
          </p>
          <ul className="mt-3 space-y-3">
            {report.unresolved.map((u) => (
              <li key={u.id}>
                <div className="text-xs font-medium text-ink-dim">{u.question}</div>
                <div className="mt-0.5 text-[11px] leading-relaxed text-ink-mute">{u.missing}</div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
