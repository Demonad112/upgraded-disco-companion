'use client'

/**
 * The Defences section: resistance meters, the largest hit you survive, pools.
 * Led by the smallest hit that kills — not by an averaged pool. Every figure is
 * poe.ninja's own, read as given.
 */

import type { DefenseSummary } from '@poe2/core'
import { Tag, fmt } from './ui'
import { Diamond, DMG_VAR, cap } from './character/dmg'
import { ProvenanceBadge } from './shared/ProvenanceBadge'

/** Resistance tracks are drawn to a 0–90% scale so values above the cap stay visible. */
const RES_SCALE = 90

function Meter({ r }: { r: DefenseSummary['resistances'][number] }) {
  const pos = (v: number) => `${(Math.max(0, Math.min(RES_SCALE, v)) / RES_SCALE) * 100}%`
  const color = DMG_VAR[r.type] ?? 'var(--ink-dim)'
  const known = r.value !== null
  const value = r.value ?? 0
  const under = known && r.underCap !== null && r.underCap > 0
  const over = known && r.overCap !== null && r.overCap > 0
  return (
    <li className="grid items-center gap-x-4 gap-y-2 min-[621px]:grid-cols-[7.5rem_minmax(0,1fr)_auto]">
      <span className="flex items-center gap-2">
        <Diamond type={r.type} />
        <span className="serif-label">{cap(r.type)}</span>
      </span>
      <span
        role="img"
        aria-label={
          known
            ? `${cap(r.type)} resistance ${value}% of a ${r.max}% cap${under ? `, ${r.underCap} under cap` : over ? `, ${r.overCap} over cap` : ''}`
            : `${cap(r.type)} resistance unknown`
        }
        className="relative block h-[16px] bg-sunken"
      >
        {known ? (
          <>
            <span className="absolute inset-y-0 left-0" style={{ width: pos(Math.min(value, r.max)), background: color }} />
            {over ? (
              <span
                className="absolute inset-y-0"
                style={{
                  left: pos(r.max),
                  width: `calc(${pos(value)} - ${pos(r.max)})`,
                  background: `repeating-linear-gradient(45deg, ${color} 0 3px, transparent 3px 6px)`,
                }}
              />
            ) : null}
            {under ? (
              <span
                className="absolute inset-y-[3px]"
                style={{
                  left: pos(value),
                  width: `calc(${pos(r.max)} - ${pos(value)})`,
                  borderTop: '1px dashed var(--danger)',
                  borderBottom: '1px dashed var(--danger)',
                  background: 'color-mix(in srgb, var(--danger) 18%, transparent)',
                }}
              />
            ) : null}
          </>
        ) : null}
        <span className="absolute -top-1 -bottom-1 w-0.5 bg-white" style={{ left: `calc(${pos(r.max)} - 1px)` }} />
      </span>
      <span className="flex flex-wrap items-center gap-2 min-[621px]:justify-end">
        <span className="tabular font-mono text-sm text-ink">{known ? `${value}%` : 'unknown'}</span>
        {!known ? <Tag>unknown</Tag> : under ? <Tag tone="danger">{r.underCap} under</Tag> : <Tag tone="good">OK</Tag>}
        {over ? <span className="tabular font-mono text-[11px] text-ink-mute">{r.overCap} over cap</span> : null}
      </span>
    </li>
  )
}

function ResistanceMeters({ d }: { d: DefenseSummary }) {
  return (
    <section data-surface="data" className="card" aria-label="Resistances">
      <h3 className="h3">Resistances</h3>
      <ul className="mt-4 space-y-4">
        {d.resistances.map((r) => (
          <Meter key={r.type} r={r} />
        ))}
      </ul>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-mute">
        <li>White tick: cap</li>
        <li>Hatched: over cap</li>
        <li>Dashed: shortfall to cap</li>
        <li>Scale: 0–{RES_SCALE}%</li>
      </ul>
    </section>
  )
}

/** Next round figure above `n`, for a chart scale derived from the data itself. */
const niceCeil = (n: number): number => Math.max(2000, Math.ceil(n / 2000) * 2000)

function LargestHit({ d }: { d: DefenseSummary }) {
  const hits = [...d.maxHits].sort((a, b) => a.value - b.value)
  if (!hits.length) return null
  const scale = niceCeil(Math.max(...hits.map((h) => h.value), d.effectiveHealthPool ?? 0))
  const res = new Map(d.resistances.map((r) => [r.type as string, r]))
  const ehpAt = d.effectiveHealthPool !== null ? `${(d.effectiveHealthPool / scale) * 100}%` : null
  return (
    <section data-surface="data" className="card" aria-label="Largest hit you survive">
      <h3 className="h3">Largest hit you survive</h3>
      <ul className="mt-4 space-y-4">
        {hits.map((h) => {
          const r = res.get(h.type)
          const note =
            r && r.value !== null && r.underCap !== null
              ? r.underCap > 0
                ? `${r.value}/${r.max}% · ${r.underCap} under cap`
                : `${r.value}/${r.max}%${r.overCap ? ` · ${r.overCap} over cap` : ''}`
              : h.type === 'physical' && d.physicalDamageReduction !== null
                ? `${d.physicalDamageReduction}% reduction from armour`
                : null
          return (
            <li key={h.type} className="grid items-center gap-x-4 gap-y-1 min-[621px]:grid-cols-[7.5rem_minmax(0,1fr)_auto]">
              <span>
                <span className="flex items-center gap-2">
                  <Diamond type={h.type} />
                  <span className="serif-label">{cap(h.type)}</span>
                </span>
              </span>
              <span
                role="img"
                aria-label={`${cap(h.type)} maximum hit ${fmt(h.value)}`}
                className="relative block h-[16px] bg-sunken"
              >
                <span
                  className="absolute inset-y-0 left-0"
                  style={{ width: `${Math.max(1, (h.value / scale) * 100)}%`, background: DMG_VAR[h.type] ?? 'var(--ink-dim)' }}
                />
                {ehpAt ? (
                  <span
                    className="absolute -top-1 -bottom-1 border-l border-dashed border-accent"
                    style={{ left: ehpAt }}
                  />
                ) : null}
              </span>
              <span className="flex flex-wrap items-center gap-2 min-[621px]:justify-end">
                <span className="tabular font-mono text-sm text-ink">{fmt(h.value)}</span>
                {h.isLowest ? <Tag tone="danger">Kills first</Tag> : null}
              </span>
              {note ? <span className="tabular font-mono text-[11px] text-ink-mute min-[621px]:col-start-2">{note}</span> : null}
            </li>
          )
        })}
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-ink-mute">
        Dashed gold line: effective health pool{d.effectiveHealthPool !== null ? ` (${fmt(d.effectiveHealthPool)})` : ' (unknown)'}. Max hit
        = pool / (1 − effective resistance), as poe.ninja computes it. Scale 0–{fmt(scale)}.
      </p>
    </section>
  )
}

function PoolTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 border border-line bg-sunken/80 px-3.5 py-3">
      <div className="eyebrow truncate">{label}</div>
      <div className="tabular mt-1.5 truncate font-mono text-[20px] leading-none font-medium text-ink">{value}</div>
      {hint ? <div className="mt-1.5 truncate text-[11px] text-ink-mute">{hint}</div> : null}
    </div>
  )
}

function Pools({ d }: { d: DefenseSummary }) {
  return (
    <section data-surface="data" className="card" aria-label="Pools">
      <h3 className="h3">Pools</h3>
      <div className="pools mt-4">
        <PoolTile label="Life" value={fmt(d.life)} />
        <PoolTile label="Energy shield" value={fmt(d.energyShield)} />
        <PoolTile label="Ward" value={fmt(d.ward)} hint="0.5 mechanic" />
        <PoolTile label="Evasion" value={fmt(d.evasion)} hint={d.evadeChance === null ? 'evade chance not reported' : `${fmt(d.evadeChance)}% evade`} />
        <PoolTile
          label="Armour"
          value={fmt(d.armour)}
          hint={d.physicalDamageReduction !== null ? `${d.physicalDamageReduction}% phys reduction` : undefined}
        />
        <PoolTile label="Deflection" value={fmt(d.deflectionRating)} hint={`${fmt(d.deflectChance)}% · ${fmt(d.deflectEffect)}% effect`} />
      </div>
      <p className="mt-4 text-xs leading-relaxed text-ink-mute">
        Chaos removes twice as much energy shield as it deals, so the raw chaos pool is{' '}
        <span className="tabular">{fmt(d.chaosRawPool)}</span> (life + half energy shield). Block caps at 50% in PoE2; resistances at
        75%.
      </p>
    </section>
  )
}

export function DefensePanel({ d }: { d: DefenseSummary }) {
  const implied = d.impliedResistances.some((r) => r.status === 'implied' && r.gap && r.gap.min > 0.5)
  return (
    <div className="grid-cards">
      {implied ? (
        <p data-surface="data" className="card border-warn/50 text-xs leading-relaxed text-warn">
          <ProvenanceBadge provenance="derived" /> poe.ninja’s elemental maximum hits imply lower resistances than shown:{' '}
          {d.impliedResistances
            .filter((r) => r.status === 'implied' && r.implied)
            .map((r) => `${cap(r.type)} ${r.implied!.min === r.implied!.max ? r.implied!.min : `${r.implied!.min}–${r.implied!.max}`}% against ${r.displayed ?? '?'}% shown`)
            .join(', ')}
          . Assumes the hit pool is life + energy shield with no other mitigation (true here: the physical maximum hit equals it). The cause is
          not established; it may be a resistance penalty poe.ninja applies and the sheet omits. Treat it as a check on how much margin you
          really have, not a correction.
        </p>
      ) : null}
      <div className="grid-cards desk:grid-cols-2">
        <ResistanceMeters d={d} />
        <LargestHit d={d} />
      </div>
      <Pools d={d} />
    </div>
  )
}
