'use client'

/**
 * The showcase, first view of the character page: the home "last character" card (same component) with the grade
 * stamp and note inside it, and the copy-link / share-card actions under it.
 *
 * Every value is read straight off the analysis; nothing here is computed. A figure the data doesn't have reads "—"
 * or drops out rather than showing a zero.
 */

import { useEffect, useRef, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import { dataAge, toSnapshot, type Analysis, type BuildAssessment, type BuildTier } from '@poe2/core'
import { Tag } from '@/components/ui'
import { DMG_VAR, cap } from './dmg'
import '@/styles/buildcard.css'
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
            className={`grid size-6 place-items-center border font-display text-sm font-bold ${
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
    <div ref={ref} data-grade-stamp className="bc-stamp">
      <span className="text-gradient-gold" style={{ fontSize: long ? 22 : 40 }}>
        {letter}
      </span>
    </div>
  )
}

/** Opens the "Why this grade" disclosure before the fragment link scrolls to it. */
const openAssessment = () => document.getElementById('assessment')?.setAttribute('open', '')

/** Compact figure: 225,652 -> 225.7k, 1,477 -> 1,477. Same cut-offs as the home card. */
function compact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (Math.abs(n) >= 10_000) return `${(n / 1000).toFixed(1)}k`
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

/**
 * A tile figure. The final text is in the DOM from the first paint (`data-value` holds the number); unless motion is
 * reduced it then counts up from 80 % over 480 ms and lands on the same text.
 */
function Figure({ value, delay }: { value: number | null; delay: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || value === null || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const start = performance.now() + delay
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / 480))
      el.textContent = compact(value * (0.8 + 0.2 * (1 - (1 - t) ** 3)))
      if (t < 1) raf = requestAnimationFrame(tick)
      else el.textContent = compact(value)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      el.textContent = compact(value)
    }
  }, [value, delay])
  if (value === null) return <span className="bc-val" data-missing>not reported</span>
  return (
    <span ref={ref} className="bc-val tabular" data-value={value} title={value.toLocaleString()}>
      {compact(value)}
    </span>
  )
}

const RES_TONE = { fire: 'var(--dmg-fire)', cold: 'var(--dmg-cold)', lightning: 'var(--dmg-lightning)', chaos: 'var(--dmg-chaos)' } as const
const RES_LABEL = { fire: 'Fire', cold: 'Cold', lightning: 'Light.', chaos: 'Chaos' } as const

export function Showcase({ analysis, children }: { analysis: Analysis; children?: ReactNode }) {
  const { identity, assessment, defense, dps } = analysis
  const nowMs = useSyncExternalStore(subscribeNever, clientNow, serverNow)
  const age = nowMs === null ? null : dataAge(identity.updatedUtc, new Date(nowMs))
  const grade = gradeText(assessment)
  const snap = toSnapshot(analysis, '')
  const skill = dps.primary
  const hitType = defense.lowestMaximumHitType
  const tiles: { label: string; value: number | null; tone: string; sub?: string }[] = [
    { label: 'Main skill DPS', value: snap.dps && snap.dps > 0 ? snap.dps : null, tone: 'var(--accent)', sub: skill?.dominantType ? `${cap(skill.dominantType)} damage` : undefined },
    { label: 'Killed by', value: snap.weakestHit && snap.weakestHit > 0 ? snap.weakestHit : null, tone: 'var(--dmg-physical)', sub: hitType ? `${cap(hitType)} hit` : undefined },
    { label: 'Life', value: snap.life && snap.life > 0 ? snap.life : null, tone: 'var(--dmg-fire)' },
    { label: 'Energy shield', value: snap.energyShield && snap.energyShield > 0 ? snap.energyShield : null, tone: 'var(--dmg-cold)' },
  ]
  const resists = (['fire', 'cold', 'lightning', 'chaos'] as const).map((t) => defense.resistances.find((r) => r.type === t))

  return (
    <div data-showcase>
      <section aria-labelledby="showcase-title" className="bc">
        <div className="bc-top">
          <span>{[identity.className, identity.league].filter(Boolean).join(' · ') || 'Character'}</span>
        </div>
        <div className="bc-head">
          <h2 id="showcase-title" className="bc-name text-gradient-gold">{identity.name}</h2>
          <div className="bc-level" aria-label={identity.level === null ? 'Level unknown' : `Level ${identity.level}`}>
            <span>
              <small>Lv</small>
              {identity.level ?? '—'}
            </span>
          </div>
        </div>
        <p className="bc-skill" style={{ '--c': DMG_VAR[skill?.dominantType ?? ''] ?? 'var(--accent)' } as CSSProperties}>
          {skill ? (
            <>
              <i aria-hidden />
              <span>{skill.name}</span>
            </>
          ) : null}
          {age ? (
            <time className={`bc-age${age.stale ? ' text-danger' : ''}`} dateTime={identity.updatedUtc ?? undefined} title={age.stale ? 'Re-import before buying' : undefined}>
              {age.label.replace(/^updated /, '')}
              {age.stale ? ' · re-import' : ''}
            </time>
          ) : null}
        </p>

        <div className="bc-grade">
          {grade ? (
            <>
              <GradeStamp letter={grade.letter} />
              <div className="min-w-0">
                <GradeLadder assessment={assessment} />
                <div className="tabular mt-1.5 font-mono text-[11px] whitespace-nowrap text-ink-dim">grade score {grade.score}</div>
                {analysis.pobStats ? <div className="mt-1"><Tag tone="good">Cross-validated</Tag></div> : null}
              </div>
            </>
          ) : (
            <div className="label-metric">Grade unknown</div>
          )}
        </div>
        <p className="bc-note">
          {assessment.note}{' '}
          <a href="#assessment" onClick={openAssessment} className="whitespace-nowrap text-accent underline underline-offset-2">
            Why this grade
          </a>
        </p>

        <dl className="bc-tiles">
          {tiles.map((t, i) => (
            <div key={t.label} className="bc-tile" style={{ '--c': t.tone } as CSSProperties}>
              <dt>{t.label}</dt>
              <dd>
                <Figure value={t.value} delay={i * 40} />
                {t.sub && t.value !== null ? <span className="bc-sub">{t.sub}</span> : null}
              </dd>
            </div>
          ))}
        </dl>

        <ul className="bc-res" aria-label="Resistances">
          {resists.map((r, i) => {
            const type = (['fire', 'cold', 'lightning', 'chaos'] as const)[i]!
            const short = r?.underCap != null && r.underCap > 0
            return (
              <li key={type} data-short={short || undefined} style={{ '--c': RES_TONE[type] } as CSSProperties}>
                {RES_LABEL[type]}
                <b>
                  {r?.value == null ? 'unknown' : r.value}
                  {r?.value != null && r.max != null ? <em>/{r.max}</em> : null}
                </b>
              </li>
            )
          })}
        </ul>

        {children ? <div className="bc-actions">{children}</div> : null}
      </section>
    </div>
  )
}
