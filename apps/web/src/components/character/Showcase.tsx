'use client'

/**
 * The showcase, first view of the character page: the home "last character" card (same component) with the grade
 * stamp and note inside it, and the copy-link / share-card actions under it.
 *
 * Every value is read straight off the analysis; nothing here is computed. A figure the data doesn't have reads "—"
 * or drops out rather than showing a zero.
 */

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react'
import { dataAge, toSnapshot, type Analysis, type BuildAssessment, type BuildTier } from '@poe2/core'
import { Tag } from '@/components/ui'
import { CharacterCard } from '@/components/home/LastCharacterCard'
import { gradeText } from '@/lib/grade'

let mountedAt: number | null = null
const subscribeNever = () => () => {}
const clientNow = (): number => (mountedAt ??= Date.now())
const serverNow = (): number | null => null

const LADDER: readonly BuildTier[] = ['D', 'C', 'B', 'A']

/** The grade letters worst to best, with the letter (or every letter of a `D–B` range) lit. */
function GradeLadder({ assessment }: { assessment: BuildAssessment }) {
  const lo = assessment.tier ?? assessment.tierRange?.worst
  const hi = assessment.tier ?? assessment.tierRange?.best
  if (!lo || !hi) return null
  const [from, to] = [LADDER.indexOf(lo), LADDER.indexOf(hi)]
  return (
    <ol aria-hidden className="inline-flex gap-1" data-grade-ladder>
      {LADDER.map((l, i) => {
        const lit = i >= from && i <= to
        return (
          <li
            key={l}
            data-lit={lit || undefined}
            className={`grid size-7 place-items-center border font-display text-sm font-bold ${
              lit ? 'border-accent bg-accent-soft text-accent' : 'border-line text-ink-mute'
            }`}
          >
            {l}
          </li>
        )
      })}
    </ol>
  )
}

// Inline rather than utilities: these sizes are the showcase's alone, and every new utility lands in the CSS every route loads.
const STAMP = {
  width: 'clamp(104px,11vw,120px)',
  height: 'clamp(104px,11vw,120px)',
  borderWidth: 3,
  transform: 'rotate(-6deg)',
  boxShadow: 'inset 0 0 0 3px var(--page), inset 0 0 0 4px var(--accent-line)',
} as const

/**
 * The grade as a square ink stamp. It lands once on mount (Web Animations, so no global keyframes); with reduced
 * motion it is simply there.
 */
function GradeStamp({ letter }: { letter: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof el.animate !== 'function') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    el.animate(
      [
        { opacity: 0, transform: 'rotate(-16deg) scale(1.7)' },
        { opacity: 1, transform: 'rotate(-5deg) scale(0.94)', offset: 0.7 },
        { opacity: 1, transform: 'rotate(-6deg) scale(1)' },
      ],
      { duration: 560, easing: 'cubic-bezier(.2,.8,.2,1)' },
    )
  }, [])
  const long = letter.length > 1
  return (
    <div
      ref={ref}
      data-grade-stamp
      className="grid shrink-0 place-items-center border-accent bg-accent-soft"
      style={STAMP}
    >
      <span className="font-display leading-none font-bold text-gradient-gold" style={{ fontSize: long ? 'clamp(34px,4vw,40px)' : 'clamp(68px,8vw,80px)' }}>
        {letter}
      </span>
    </div>
  )
}

/** Opens the "Why this grade" disclosure before the fragment link scrolls to it. */
const openAssessment = () => document.getElementById('assessment')?.setAttribute('open', '')

export function Showcase({ analysis, children }: { analysis: Analysis; children?: ReactNode }) {
  const { identity, assessment } = analysis
  const nowMs = useSyncExternalStore(subscribeNever, clientNow, serverNow)
  const age = nowMs === null ? null : dataAge(identity.updatedUtc, new Date(nowMs))
  const grade = gradeText(assessment)
  const snap = toSnapshot(analysis, '')
  const figure = (label: string, value: number | null) => ({ label, value: value ?? 0, show: value !== null && value > 0 })

  return (
    <div data-showcase>
      <CharacterCard
        titleId="showcase-title"
        eyebrow="Character"
        name={identity.name}
        level={identity.level ?? null}
        className={[identity.className, identity.league].filter(Boolean).join(' · ') || null}
        status={age ? <span className={age.stale ? 'text-danger' : undefined}>{age.label}{age.stale ? ' · re-import before buying' : ''}</span> : null}
        figures={[
          figure('Life', snap.life),
          figure('Energy shield', snap.energyShield),
          figure('Main skill DPS', snap.dps),
          figure('Killed by', snap.weakestHit),
        ]}
        resists={snap}
        actions={children}
      >
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
          {grade ? (
            <>
              <GradeStamp letter={grade.letter} />
              <div className="min-w-0">
                <div className="label-metric">Grade</div>
                <div className="mt-1.5">
                  <GradeLadder assessment={assessment} />
                </div>
                <div className="tabular mt-1.5 font-mono text-sm text-ink-dim">score {grade.score}</div>
              </div>
            </>
          ) : (
            <div className="label-metric">Grade unknown</div>
          )}
          {analysis.pobStats ? <Tag tone="good">Cross-validated</Tag> : null}
        </div>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-dim">
          {assessment.note}{' '}
          <a href="#assessment" onClick={openAssessment} className="whitespace-nowrap text-accent">
            Why this grade
          </a>
        </p>
      </CharacterCard>
    </div>
  )
}
