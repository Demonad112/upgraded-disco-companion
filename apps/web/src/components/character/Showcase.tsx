'use client'

/**
 * The showcase, first view of the character page and the player's brag card: who the character is, the grade as a
 * stamp, the main skill's DPS inside its element ring, life / energy shield / spirit, and the hit that kills it first.
 * The share card draws the same picture (`ShareCard.tsx`).
 *
 * Every value is read straight off the analysis; nothing here is computed. A figure the data doesn't have reads "—"
 * or drops out rather than showing a zero.
 */

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react'
import { auditSpirit, dataAge, type Analysis, type BuildAssessment, type BuildTier } from '@poe2/core'
import { Tag, fmt, fmtCompact } from '@/components/ui'
import { gradeText } from '@/lib/grade'
import { ringSplit, type RingSlice } from '@/lib/shareCard'
import { DMG_VAR, Diamond, cap } from './dmg'

let mountedAt: number | null = null
const subscribeNever = () => () => {}
const clientNow = (): number => (mountedAt ??= Date.now())
const serverNow = (): number | null => null

function Vital({ label, value, caption }: { label: string; value: string; caption?: string | null }) {
  return (
    <div className="min-w-0 border border-line bg-sunken/80 px-3.5 py-3">
      <div className="label-metric truncate">{label}</div>
      <div className="tabular mt-1.5 truncate font-mono text-[22px] leading-none font-medium text-ink desk:text-[26px]">{value}</div>
      {caption ? <div className="mt-1.5 truncate text-[11px] text-ink-mute">{caption}</div> : null}
    </div>
  )
}

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
const RING_BOX = { width: 'clamp(208px,24vw,236px)', height: 'clamp(208px,24vw,236px)' } as const
const TWO_COL = { gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 18rem), 1fr))' } as const

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

/** Square perimeter, starting top-centre and running clockwise; `pathLength` 100 makes dash lengths percentages. */
const RING_PATH = 'M100 8H192V192H8V8Z'
const GAP = 0.8

/**
 * The element ring: a square frame around the DPS figure, each side split by the main skill's damage types in their
 * W0 colours. Lightning carries its white-hot core, chaos its dark edge. The split is also in the legend and the
 * aria-label, so it never depends on colour alone.
 */
function ElementRing({ slices, children }: { slices: RingSlice[]; children: ReactNode }) {
  const text = slices.map((s) => `${cap(s.type)} ${s.percent}%`).join(', ')
  const arcs = slices.map((s, i) => {
    const start = slices.slice(0, i).reduce((sum, p) => sum + p.percent, 0)
    const len = Math.max(0, s.percent - (slices.length > 1 ? GAP : 0))
    return { ...s, dash: `${len} ${100 - len}`, offset: -start }
  })
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        role="img"
        aria-label={slices.length ? `Main skill damage split: ${text}` : 'Main skill damage split unknown'}
        className="relative"
        style={RING_BOX}
      >
        <svg viewBox="0 0 200 200" aria-hidden className="absolute inset-0 h-full w-full" fill="none" strokeLinejoin="miter">
          <path d={RING_PATH} pathLength={100} stroke="var(--line)" strokeWidth={10} />
          {arcs.map((a) => (
            <g key={a.type} data-ring-slice={a.type}>
              {a.type === 'chaos' ? (
                <path d={RING_PATH} pathLength={100} stroke="var(--dmg-chaos-edge)" strokeWidth={14} strokeDasharray={a.dash} strokeDashoffset={a.offset} />
              ) : null}
              <path d={RING_PATH} pathLength={100} stroke={DMG_VAR[a.type] ?? 'var(--ink-dim)'} strokeWidth={10} strokeDasharray={a.dash} strokeDashoffset={a.offset} />
              {a.type === 'lightning' ? (
                <path d={RING_PATH} pathLength={100} stroke="var(--dmg-lightning-core)" strokeWidth={3} strokeDasharray={a.dash} strokeDashoffset={a.offset} />
              ) : null}
            </g>
          ))}
          {/* Inner hairline: the gold frame every card on the site carries. */}
          <rect x={20.5} y={20.5} width={159} height={159} stroke="var(--accent-line)" strokeWidth={1} />
        </svg>
        <div className="absolute grid place-items-center text-center" style={{ inset: '13%' }}>{children}</div>
      </div>
      {slices.length ? (
        <ul aria-hidden className="flex flex-wrap justify-center gap-x-3 gap-y-1">
          {slices.map((s) => (
            <li key={s.type} className="flex items-center gap-1.5 text-[11px] text-ink-dim">
              <Diamond type={s.type} />
              {cap(s.type)} <span className="tabular font-mono text-ink">{s.percent}%</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/** Opens the "Why this grade" disclosure before the fragment link scrolls to it. */
const openAssessment = () => document.getElementById('assessment')?.setAttribute('open', '')

export function Showcase({ analysis, children }: { analysis: Analysis; children?: ReactNode }) {
  const { identity, defense, dps, pobStats, assessment } = analysis
  const primary = dps.primary
  const spirit = auditSpirit(pobStats)
  const spiritTotal = spirit?.total ?? (defense.spirit > 0 ? defense.spirit : null)
  const nowMs = useSyncExternalStore(subscribeNever, clientNow, serverNow)
  const age = nowMs === null ? null : dataAge(identity.updatedUtc, new Date(nowMs))
  const grade = gradeText(assessment)

  // maxHits arrive weakest first; the second is the contrast.
  const hits = [...defense.maxHits].sort((a, b) => a.value - b.value)
  const weakest = hits[0]
  const next = hits[1]

  return (
    <section data-surface="data" className="card" aria-label="Showcase" data-showcase>
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-6">
        <div className="min-w-0 flex-1" style={{ flexBasis: '20rem' }}>
          <div className="eyebrow text-accent">Character</div>
          <h2 className="mt-1 font-display text-[clamp(38px,6vw,60px)] leading-none font-bold tracking-[0.04em] break-words text-gradient-gold uppercase">
            {identity.name}
          </h2>
          <p className="mt-2 text-sm text-ink-dim">
            Level <span className="tabular font-semibold text-ink">{identity.level ?? '—'}</span>
            {identity.className ? <> · {identity.className}</> : null}
            {identity.league ? <> · {identity.league}</> : null}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {pobStats ? <Tag tone="good">Cross-validated</Tag> : null}
            {age ? (
              <Tag tone={age.stale ? 'danger' : 'default'}>
                {age.label}
                {age.stale ? ' · re-import before buying' : ''}
              </Tag>
            ) : null}
            {children}
          </div>

          <div className="mt-6 flex items-center gap-5">
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
          </div>
          <p className="mt-4 max-w-prose text-sm leading-relaxed text-ink-dim">
            {assessment.note}{' '}
            <a href="#assessment" onClick={openAssessment} className="whitespace-nowrap text-accent">
              Why this grade
            </a>
          </p>
        </div>

        <ElementRing slices={ringSplit(primary)}>
          <div className="min-w-0">
            <div className="label-metric">Main skill DPS</div>
            <div
              title={primary ? fmt(primary.totalDps) : undefined}
              className="tabular mt-1.5 font-mono leading-none font-medium text-ink"
              style={{ fontSize: 'clamp(34px,4vw,40px)' }}
            >
              {primary ? fmtCompact(primary.totalDps) : '—'}
            </div>
            <div className="mx-auto mt-1.5 truncate text-[12px] text-ink-dim" style={{ maxWidth: '9.5rem' }}>{primary?.name ?? 'unknown'}</div>
          </div>
        </ElementRing>
      </div>

      <div className="mt-6 grid gap-3" style={TWO_COL}>
        <div className="border border-line bg-sunken/65 px-4 py-3">
          <div className="label-metric">Kills you first</div>
          {weakest ? (
            <>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
                <span className="tabular font-mono text-4xl leading-none font-medium text-danger">{fmt(weakest.value)}</span>
                <span className="serif-label">{cap(weakest.type)} hit</span>
              </div>
              {next ? (
                <p className="mt-1.5 text-xs text-ink-dim">
                  Next weakest: {next.type} at <span className="tabular text-ink">{fmt(next.value)}</span>
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-1.5 text-sm text-ink-dim">Not reported by poe.ninja</p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Vital label="Life" value={fmt(defense.life)} />
          <Vital label="Energy shield" value={fmt(defense.energyShield)} />
          <Vital
            label="Spirit"
            value={spiritTotal !== null ? fmt(spiritTotal) : '—'}
            caption={spirit ? `${fmt(spirit.unreserved)} free` : null}
          />
        </div>
      </div>
    </section>
  )
}
