'use client'

/**
 * The verdict card, first view of the page: who the character is, the grade,
 * what kills it first, and four vitals.
 *
 * Every value is read straight off the analysis; nothing here is computed. A
 * figure the data doesn't have drops its tile (or reads "unknown") rather than
 * showing a zero.
 */

import { useSyncExternalStore, type ReactNode } from 'react'
import { auditSpirit, dataAge, type Analysis, type BuildAssessment, type BuildTier } from '@poe2/core'
import { Tag, fmt, fmtCompact } from '@/components/ui'
import { gradeText } from '@/components/BuildScore'
import { cap } from './dmg'

let mountedAt: number | null = null
const subscribeNever = () => () => {}
const clientNow = (): number => (mountedAt ??= Date.now())
const serverNow = (): number | null => null

function Tile({ label, value, caption, title }: { label: string; value: string; caption?: string | null; title?: string }) {
  return (
    <div className="min-w-0 border border-line bg-sunken/80 px-3.5 py-3">
      <div className="label-metric truncate">{label}</div>
      <div title={title} className="tabular mt-1.5 truncate font-mono text-[22px] leading-none font-medium text-ink desk:text-[26px]">{value}</div>
      {caption ? <div className="mt-1.5 truncate text-[11px] text-ink-mute">{caption}</div> : null}
    </div>
  )
}

const LADDER: readonly BuildTier[] = ['D', 'C', 'B', 'A']

/** The grade letters worst to best, with the letter (or every letter of a `D–B` range) lit. The letter above says it in words. */
function GradeLadder({ assessment }: { assessment: BuildAssessment }) {
  const lo = assessment.tier ?? assessment.tierRange?.worst
  const hi = assessment.tier ?? assessment.tierRange?.best
  if (!lo || !hi) return null
  const [from, to] = [LADDER.indexOf(lo), LADDER.indexOf(hi)]
  return (
    <ol aria-hidden className="mt-3 inline-flex gap-1" data-grade-ladder>
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

/** Opens the "Why this grade" disclosure before the fragment link scrolls to it. */
const openAssessment = () => document.getElementById('assessment')?.setAttribute('open', '')

export function CharacterVerdict({ analysis, children }: { analysis: Analysis; children?: ReactNode }) {
  const { identity, defense, dps, pobStats, assessment, recommendations } = analysis
  const primary = dps.primary
  const spirit = auditSpirit(pobStats)
  const spiritTotal = spirit?.total ?? (defense.spirit > 0 ? defense.spirit : null)
  const nowMs = useSyncExternalStore(subscribeNever, clientNow, serverNow)
  const age = nowMs === null ? null : dataAge(identity.updatedUtc, new Date(nowMs))
  const grade = gradeText(assessment)

  // maxHits arrive weakest first; the second and last are the contrast.
  const hits = [...defense.maxHits].sort((a, b) => a.value - b.value)
  const weakest = hits[0]
  const next = hits[1]
  const strongest = hits.length > 2 ? hits[hits.length - 1] : null
  const top = recommendations.recommendations[0] ?? null

  return (
    <section data-surface="data" className="card" aria-label="Verdict">
      <div className="grid items-end gap-x-8 gap-y-5 min-[621px]:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <div className="eyebrow text-accent">Character</div>
          <h2 className="mt-1 font-display text-[clamp(38px,6vw,60px)] leading-none font-bold tracking-[0.04em] text-gradient-gold uppercase">
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
        </div>
        <div className="min-w-0 min-[621px]:text-right">
          {grade ? (
            <>
              <div className="font-display text-[72px] leading-none font-bold text-gradient-gold min-[621px]:text-[88px]">{grade.letter}</div>
              <GradeLadder assessment={assessment} />
              <div className="tabular mt-1.5 font-mono text-sm text-ink-dim">{grade.score}</div>
            </>
          ) : (
            <div className="label-metric">Grade unknown</div>
          )}
        </div>
      </div>
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-dim">
        {assessment.note}{' '}
        <a href="#assessment" onClick={openAssessment} className="whitespace-nowrap text-accent">
          Why this grade
        </a>
      </p>

      {weakest ? (
        <div className="mt-5 border border-line bg-sunken/65 p-4">
          <div className="label-metric">Kills you first</div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
            <span className="tabular font-mono text-4xl leading-none font-medium text-danger">{fmt(weakest.value)}</span>
            <span className="serif-label">{cap(weakest.type)} hit</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-ink-dim">
            {next ? (
              <>
                Next weakest is {next.type} at <span className="tabular text-ink">{fmt(next.value)}</span>.{' '}
              </>
            ) : null}
            {strongest ? (
              <>
                Strongest is {strongest.type} at <span className="tabular text-ink">{fmt(strongest.value)}</span>.{' '}
              </>
            ) : null}
            {defense.ehpOverstatementRatio !== null && defense.ehpOverstatementRatio > 1.5 ? (
              <>
                The effective health pool of <span className="tabular text-ink">{fmt(defense.effectiveHealthPool)}</span> overstates
                safety by <span className="tabular text-warn">{defense.ehpOverstatementRatio.toFixed(1)}×</span>.
              </>
            ) : null}
          </p>
          {top ? (
            <div className="mt-3 border-t border-line pt-3 text-sm text-ink-dim">
              {top.action}
              {top.impact ? (
                <>
                  {' '}
                  <a href="#findings" className="tabular font-mono whitespace-nowrap text-accent">
                    {fmt(top.impact.from)}
                    {top.impact.unit === 'percent' ? '%' : ''} → {fmt(top.impact.to)}
                    {top.impact.unit === 'percent' ? '%' : ''}
                  </a>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-2 gap-3 min-[621px]:grid-cols-4">
        <Tile label="Life" value={fmt(defense.life)} />
        <Tile label="Energy shield" value={fmt(defense.energyShield)} />
        <Tile label="Main skill DPS" value={primary ? fmtCompact(primary.totalDps) : '—'} title={primary ? fmt(primary.totalDps) : undefined} caption={primary?.name ?? 'unknown'} />
        <Tile
          label="Spirit"
          value={spiritTotal !== null ? fmt(spiritTotal) : '—'}
          caption={spirit ? `${fmt(spirit.unreserved)} unreserved` : null}
        />
      </div>
    </section>
  )
}
