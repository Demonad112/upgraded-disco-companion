'use client'

/**
 * The overall verdict.
 *
 * A single letter is the most confident thing on this page, so most of what
 * follows is about not overstating it: the two halves are shown separately, an
 * unscored offence half is drawn as absent rather than as zero, and every
 * caveat that qualifies the number sits directly under it instead of in a
 * tooltip nobody opens.
 */

import type { BuildAssessment, KeystoneEffects } from '@poe2/core'
import { Tag, fmt } from './ui'

/**
 * The headline grade, which is a range whenever damage could not be graded.
 *
 * A single letter over one measured half would be a guess, and the guess the
 * arithmetic used to make was the flattering one — perfect defences and no
 * ladder sample read as a confident A. A range says the same thing without
 * claiming the half nobody measured.
 */
export function gradeText(assessment: BuildAssessment): { letter: string; score: string } | null {
  const { tier, tierRange, score, scoreRange } = assessment
  if (tier && score !== null) return { letter: tier, score: score.toFixed(2) }
  if (!tierRange || !scoreRange) return null
  const same = tierRange.worst === tierRange.best
  return {
    letter: same ? tierRange.worst : `${tierRange.worst}–${tierRange.best}`,
    score: same ? scoreRange.min.toFixed(2) : `${scoreRange.min.toFixed(2)}–${scoreRange.max.toFixed(2)}`,
  }
}

function Half({ label, value, of, unscored }: { label: string; value: number | null; of: number; unscored?: string }) {
  const pct = value === null ? 0 : Math.round((value / of) * 100)
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-medium tracking-wide text-ink-dim uppercase">{label}</span>
        <span className="tabular text-[11px] text-ink-mute">
          {value === null ? 'not assessed' : `${value.toFixed(2)} of ${of.toFixed(2)}`}
        </span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden bg-surface-sunken">
        {value === null ? (
          // Drawn as absent, not as zero. A build is never punished for data
          // that was unavailable, and the bar must not imply it was.
          <div className="h-full w-full bg-[repeating-linear-gradient(45deg,var(--color-line)_0_4px,transparent_4px_8px)]" />
        ) : (
          <div className="h-full bg-accent" style={{ width: `${Math.max(2, pct)}%` }} />
        )}
      </div>
      {unscored ? <p className="mt-1.5 text-[11px] leading-relaxed text-ink-mute">{unscored}</p> : null}
    </div>
  )
}

export function BuildScore({ assessment, keystones }: { assessment: BuildAssessment; keystones: KeystoneEffects }) {
  const critical = assessment.weaknesses.filter((w) => w.severity === 'critical')
  const warnings = assessment.weaknesses.filter((w) => w.severity === 'warning')

  return (
    <details id="assessment" data-surface="data" className="card group">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <span className="h3">Why this grade</span>
        <span className="eyebrow">Defence and damage, weighted evenly</span>
      </summary>
      <div className="dbody border-t border-line">
      <p className="max-w-prose text-sm leading-relaxed text-balance text-ink">{assessment.note}</p>
      <p className="mt-2 max-w-prose text-xs leading-relaxed text-ink-mute">
        Damage is graded only against figures observed on the ladder — never against invented thresholds.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Half label="Defence" value={assessment.defence} of={0.5} />
        <Half
          label="Damage"
          value={assessment.offence}
          of={0.5}
          {...(assessment.offenceUnscoredReason ? { unscored: assessment.offenceUnscoredReason } : {})}
        />
      </div>

      {/*
        The pool the score was computed from, always shown — not only when it
        crosses a band and lands in one of the columns below. Naming its parts
        is the point: a keystone may have converted life or energy shield away,
        and calling the total "life + ES + ward" regardless would credit the
        build with a buffer it does not have.
      */}
      <p className="mt-3 text-[11px] leading-relaxed text-ink-mute">
        Defensive pool{' '}
        <span className="tabular font-semibold text-ink-dim">{fmt(assessment.pool.total)}</span> —{' '}
        {assessment.pool.label}
        {assessment.pool.excluded.length ? (
          <>
            , with {assessment.pool.excluded.join(' and ')} excluded by an allocated keystone
          </>
        ) : null}
        .
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="min-w-0 border border-good/40 bg-good/5 p-3">
          <h3 className="mb-2 text-[11px] font-medium tracking-wide text-good uppercase">Holding up</h3>
          <ul className="space-y-1.5">
            {assessment.strengths.map((s) => (
              <li key={s} className="flex gap-2 text-xs leading-relaxed text-ink-dim">
                <span aria-hidden className="mt-[0.4rem] size-1 shrink-0 rounded-full bg-good" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0">
          <h3 className="mb-2 text-[11px] font-medium tracking-wide text-warn uppercase">Gaps</h3>
          <ul className="space-y-1.5">
            {[...critical, ...warnings].map((w) => (
              <li key={w.text} className="flex gap-2 text-xs leading-relaxed text-ink-dim">
                <span
                  aria-hidden
                  className={`mt-[0.4rem] size-1 shrink-0 rounded-full ${w.severity === 'critical' ? 'bg-danger' : 'bg-warn'}`}
                />
                <span>
                  {w.text}
                  {w.severity === 'critical' ? (
                    <span className="ml-1.5 align-middle">
                      <Tag tone="danger">critical</Tag>
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {assessment.caveats.length ? (
        <details className="mt-5 border border-line bg-surface-sunken p-4">
          <summary className="cursor-pointer text-[11px] font-medium tracking-wide text-ink-dim uppercase">
            What this verdict assumes
          </summary>
          <ul className="mt-2 space-y-1.5">
            {assessment.caveats.map((c) => (
              <li key={c} className="text-[11px] leading-relaxed text-ink-mute">
                {c}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {keystones.notes.length ? (
        <div className="mt-4">
          <h3 className="mb-2 text-[11px] font-medium tracking-wide text-ink-dim uppercase">
            Keystones changing how this reads
          </h3>
          <ul className="space-y-2">
            {keystones.notes.map((n) => (
              <li key={n.keystone} className="bg-surface-sunken px-3 py-2">
                <span className="text-xs font-medium text-ink">{n.keystone}</span>
                <p className="mt-0.5 text-[11px] leading-relaxed text-ink-dim">{n.text}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {keystones.unverified.length ? (
        <div className="mt-4 border border-warn/40 p-4">
          <h3 className="text-[11px] font-medium tracking-wide text-warn uppercase">Allocated but not in effect</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-mute">
            These keystones are on the tree, but this character&rsquo;s own stats contradict them, so none of their
            corrections were applied. poe.ninja may not have reindexed since the tree changed.
          </p>
          <ul className="mt-2 space-y-1.5">
            {keystones.unverified.map((u) => (
              <li key={u.keystone} className="text-[11px] leading-relaxed text-ink-dim">
                <span className="font-medium text-ink">{u.keystone}</span> — {u.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      </div>
    </details>
  )
}
