'use client'

import { useState } from 'react'
import { describePobConfig, type DpsSummary, type PobConfig, type SkillDamage } from '@poe2/core'
import { Empty, Tag, fmt, fmtCompact } from './ui'
import { DMG_VAR, Diamond, TYPE_ORDER, cap } from './character/dmg'

/**
 * Damage-type split as one full-width bar, with its percentages in the title
 * and aria-label so the split never depends on colour alone.
 */
function SplitBar({ skill }: { skill: SkillDamage }) {
  const split = skill.damageSplit.length ? skill.damageSplit : skill.dotSplit
  if (!split.length) return <span className="text-xs text-ink-mute">Damage split unknown</span>
  const ordered = [...split].sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type))
  const text = ordered.map((s) => `${cap(s.type)} ${s.percent}%`).join(', ')
  return (
    <div role="img" aria-label={`Damage split: ${text}`} title={text} className="flex h-4 w-full gap-px overflow-hidden bg-sunken">
      {ordered.map((s) => (
        <div key={s.type} style={{ width: `${s.percent}%`, background: DMG_VAR[s.type] }} />
      ))}
    </div>
  )
}

function Legend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {TYPE_ORDER.map((t) => (
        <li key={t} className="flex items-center gap-2 text-[11px] text-ink-dim">
          <Diamond type={t} />
          {cap(t)}
        </li>
      ))}
    </ul>
  )
}

function Mini({ label, value, sub }: { label: string; value: string; sub?: string | null }) {
  return (
    <div className="border border-line bg-sunken/80 px-3.5 py-3">
      <div className="eyebrow">{label}</div>
      <div className="tabular mt-1.5 font-mono text-[20px] leading-none font-medium text-ink">{value}</div>
      {sub ? <div className="tabular mt-1.5 font-mono text-[11px] text-ink-mute">{sub}</div> : null}
    </div>
  )
}

/** One skill: collapsed to its name, DPS and a bar scaled to the top skill. */
function SkillRow({ s, isPrimary, top }: { s: SkillDamage; isPrimary: boolean; top: number }) {
  return (
    <details className="drow border-t border-line first:border-t-0" open={isPrimary}>
      <summary className="block cursor-pointer list-none py-3 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-3">
          <span className="min-w-0 flex-1">
            <span className="serif-label text-[17px]">{s.name}</span>
            {isPrimary ? (
              <span className="ml-2 align-middle">
                <Tag tone="accent">primary</Tag>
              </span>
            ) : null}
            {s.isDotOnly ? (
              <span className="ml-2 align-middle">
                <Tag>dot only</Tag>
              </span>
            ) : null}
          </span>
          <span className="tabular font-mono text-base font-medium text-ink">{fmt(s.totalDps)}</span>
          <svg viewBox="0 0 20 20" fill="none" aria-hidden className="chev size-3.5 shrink-0 text-ink-mute">
            <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span aria-hidden className="mt-2 block h-2 w-full bg-sunken">
          <span className="block h-full bg-accent" style={{ width: `${top > 0 ? Math.max(1, (s.totalDps / top) * 100) : 0}%` }} />
        </span>
      </summary>
      <div className="pb-4">
        <div className="grid grid-cols-3 gap-3">
          <Mini label="Over time" value={s.dotDps ? fmtCompact(s.dotDps) : '—'} />
          <Mini
            label="Rate"
            value={s.rate !== null ? `${s.rate.toFixed(2)}/s` : '—'}
            sub={s.hitRate !== null ? `×${s.hitRate.toFixed(2)} hit rate` : null}
          />
          <Mini
            label="Crit"
            value={s.critChance !== null ? `${s.critChance}%` : '—'}
            sub={s.critMultiplier !== null ? `×${s.critMultiplier}` : null}
          />
        </div>
        <div className="mt-3">
          <SplitBar skill={s} />
        </div>
      </div>
    </details>
  )
}

/**
 * What the numbers above were computed under.
 *
 * Rendered only when poe.ninja and Path of Building agree on the damage figure,
 * because that agreement is what makes PoB's saved configuration a description
 * of the number on screen rather than of a different one.
 *
 * This replaces a claim the predecessor made without checking: that these
 * figures came from PoB's defaults with no boss or buff settings applied. On
 * the reference character that was wrong twice over.
 */
function ConfigCaveat({ config, applies }: { config: PobConfig | null; applies: boolean }) {
  if (!config || !applies || config.inputCount === 0) return null

  return (
    <div className="mt-3 border border-line bg-sunken px-3 py-2.5">
      <p className="text-[11px] leading-relaxed text-ink-dim">{describePobConfig(config)}</p>
      {!config.versusBoss ? (
        <p className="mt-1 text-[11px] leading-relaxed text-warn">
          Not a single-target number. Judging pinnacle-boss readiness against it would overstate this build.
        </p>
      ) : null}
    </div>
  )
}

export function DpsMatrix({
  dps,
  pobConfig = null,
  configApplies = false,
}: {
  dps: DpsSummary
  /** The configuration the attached Path of Building export was saved with. */
  pobConfig?: PobConfig | null
  /** Whether poe.ninja and PoB agree this is the same number. */
  configApplies?: boolean
}) {
  const [showAll, setShowAll] = useState(false)

  if (dps.unresolved) {
    return (
      <section className="card" aria-label="Damage">
        <h3 className="h3">Damage</h3>
        <Empty>{dps.unresolved}</Empty>
      </section>
    )
  }

  const rows = showAll ? dps.skills : dps.hitSkills
  const hidden = dps.skills.length - rows.length
  const top = Math.max(0, ...rows.map((s) => s.totalDps))
  const primary = dps.primary

  return (
    <section className="card" aria-label="Damage">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="h3">{primary ? `${primary.name} · ${fmt(primary.totalDps)} dps` : 'Damage'}</h3>
        <span className="eyebrow">Read from poe.ninja, not recalculated</span>
      </div>
      <div className="mt-3">
        {rows.map((s) => (
          <SkillRow key={s.name} s={s} isPrimary={s.name === primary?.name} top={top} />
        ))}
      </div>

      {hidden > 0 || showAll ? (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-2 text-xs text-accent transition-opacity hover:opacity-80">
          {showAll
            ? 'Show attacking skills only'
            : `Show ${hidden} buff / herald skill${hidden === 1 ? '' : 's'} (damage over time only)`}
        </button>
      ) : null}

      <div className="mt-4 border-t border-line pt-3">
        <Legend />
      </div>

      <ConfigCaveat config={pobConfig} applies={configApplies} />

      <p className="mt-3 text-xs leading-relaxed text-ink-mute">
        Charge-up skills report a hit rate below 1 — only that fraction of uses land, so their effective rate is lower than the raw
        figure. Buff and herald skills report 0 hit DPS by design.
      </p>
    </section>
  )
}
