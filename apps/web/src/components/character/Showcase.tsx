'use client'

/**
 * The showcase, first view of the character page: the home "last character" card (same component) with the grade
 * stamp and note inside it, and the copy-link / share-card actions under it.
 *
 * Every value is read straight off the analysis; nothing here is computed. A figure the data doesn't have reads "—"
 * or drops out rather than showing a zero.
 */

import { useEffect, useRef, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import { buildSummary, dataAge, headlineDps, toSnapshot, type Analysis, type DamageAxis } from '@poe2/core'
import { Tag } from '@/components/ui'
import { ProOnly } from '@/components/shared/ProToggle'
import { DMG_VAR, cap } from './dmg'
import '@/styles/buildcard.css'
import { gradeText } from '@/lib/grade'
import { ResName } from '@/components/shared/ResName'
import { sourceLabel } from '@/lib/characterName'

let mountedAt: number | null = null
const subscribeNever = () => () => {}
const clientNow = (): number => (mountedAt ??= Date.now())
const serverNow = (): number | null => null

const GRADE_COLOR: Record<string, string> = { S: 'var(--good)', A: 'var(--good)', B: 'var(--accent)', C: 'var(--warn)', D: 'var(--danger)' }

export interface AxisChipsState {
  /** The gear letter once graded; null while grading or when nothing could be graded. */
  gear: string | null
  gearState: 'ready' | 'loading' | 'closed'
  damage: DamageAxis | null
}

/** Three grades, each on its own: defence, gear, damage. No letter stands for the whole build. */
function AxisChips({ defence, gear, gearState, damage }: { defence: string | null } & AxisChipsState) {
  const chips = [
    { id: 'defence', label: 'Defence', letter: defence, note: defence ? null : 'unknown' },
    { id: 'gear', label: 'Gear', letter: gear, note: gearState === 'ready' ? (gear ? null : 'not graded') : 'grading…' },
    { id: 'damage', label: 'Damage', letter: damage?.letter ?? null, note: damage ? null : 'no DPS in code' },
  ]
  return (
    <ul className="grid grid-cols-3 gap-2" aria-label="Grades" data-axis-chips>
      {chips.map((c) => (
        <li key={c.id} data-chip={c.id} className="min-w-0 border border-line bg-sunken/65 px-2.5 py-2" style={{ borderLeft: `3px solid ${c.letter ? GRADE_COLOR[c.letter] ?? 'var(--accent)' : 'var(--line)'}` }}>
          <div className="label-metric">{c.label}</div>
          <div className="flex items-baseline gap-2">
            <span data-chip-letter aria-label={`${c.label} ${c.letter ?? c.note}`} className="font-display text-[length:var(--fs-22)] leading-none font-bold text-ink">
              {c.letter ?? '—'}
            </span>
            {c.note ? <span className="truncate text-[length:var(--fs-11)] text-ink-mute">{c.note}</span> : null}
          </div>
        </li>
      ))}
    </ul>
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
const RES_LABEL = { fire: 'Fire', cold: 'Cold', lightning: 'Lightning', chaos: 'Chaos' } as const

export function Showcase({ analysis, axes, children }: { analysis: Analysis; axes: AxisChipsState; children?: ReactNode }) {
  const { identity, defense, dps } = analysis
  const nowMs = useSyncExternalStore(subscribeNever, clientNow, serverNow)
  const age = nowMs === null ? null : dataAge(identity.updatedUtc, new Date(nowMs))
  const grade = gradeText(analysis)
  const snap = toSnapshot(analysis, '')
  const skill = dps.primary
  // One DPS figure: the hit DPS PoB calls TotalDPS, the same number the Sheet shows.
  const headline = headlineDps(skill)
  const summary = buildSummary({ className: identity.className, skill, life: defense.life, energyShield: defense.energyShield })
  const title = identity.name || summary || 'Unnamed character'
  const hitType = defense.lowestMaximumHitType
  const tiles: { label: string; value: number | null; tone: string; sub?: string }[] = [
    { label: 'Main skill DPS', value: headline ? Math.round(headline.value) : null, tone: 'var(--accent)', sub: headline?.includesDot ? 'incl. damage over time' : skill?.dominantType ? cap(skill.dominantType) : undefined },
    { label: 'Killed by', value: snap.weakestHit && snap.weakestHit > 0 ? snap.weakestHit : null, tone: 'var(--dmg-physical)', sub: hitType ? cap(hitType) : undefined },
    { label: 'Life', value: snap.life && snap.life > 0 ? snap.life : null, tone: 'var(--dmg-fire)' },
    { label: 'Energy shield', value: snap.energyShield && snap.energyShield > 0 ? snap.energyShield : null, tone: 'var(--dmg-cold)' },
  ]
  const resists = (['fire', 'cold', 'lightning', 'chaos'] as const).map((t) => defense.resistances.find((r) => r.type === t))

  return (
    <div data-showcase>
      <section aria-labelledby="showcase-title" className="bc">
        <div className="bc-head">
          <div className="min-w-0">
            <div className="bc-top">{[identity.className, sourceLabel(analysis)].filter(Boolean).join(' · ') || 'Character'}</div>
            <h2 id="showcase-title" className="bc-name text-gradient-gold">{title}</h2>
          </div>
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
          {age && age.hours !== null ? (
            <time className={`bc-age${age.stale ? ' text-danger' : ''}`} dateTime={identity.updatedUtc ?? undefined} title={age.stale ? 'Re-import before buying' : undefined}>
              {age.label.replace(/^updated /, '')}
              {age.stale ? ' · re-import' : ''}
            </time>
          ) : null}
        </p>

        {identity.name && summary ? <p className="bc-note">{summary}</p> : null}
        <div className="bc-grade">
          <div className="min-w-0 grow">
            <AxisChips defence={grade?.letter ?? null} {...axes} />
            <ProOnly>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {grade ? <span className="tabular font-mono text-[length:var(--fs-11)] whitespace-nowrap text-ink-dim">defence {grade.score}</span> : null}
                {analysis.pobStats ? <Tag tone="good">Cross-validated</Tag> : null}
              </div>
            </ProOnly>
          </div>
        </div>
        <p className="bc-note">
          <a href="#assessment" onClick={openAssessment} className="whitespace-nowrap text-accent underline underline-offset-2">
            Why these grades
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

        <ul className="bc-res res-row" aria-label="Resistances">
          {resists.map((r, i) => {
            const type = (['fire', 'cold', 'lightning', 'chaos'] as const)[i]!
            const short = r?.underCap != null && r.underCap > 0
            return (
              <li key={type} data-short={short || undefined} style={{ '--c': RES_TONE[type] } as CSSProperties}>
                <ResName label={RES_LABEL[type]} />
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
