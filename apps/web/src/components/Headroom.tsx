'use client'

/**
 * Survivability against waystone tier and against bosses, drawn to scale.
 *
 * The tier→area level mapping is real (waystone n is area level 64 + n, from
 * the waystone item bases) and so is the base monster damage. What is NOT
 * modelled is rare, unique and map-modifier damage, which is what actually
 * kills characters — so the caveat sits next to the number.
 */

import { useEffect, useId, useState } from 'react'
import { COMFORT_THRESHOLDS, analyzeContent, type DefenseSummary, type MonsterStatData } from '@poe2/core'
import { Empty, fmt } from './ui'
import { Select } from '@/components/shared/controls'

const DATA_URL = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/monster-stats.json`

const WINDOW = 6
const DEFAULT_FROM = 11

// SVG geometry: viewBox 760 × 270, the reference chart's proportions, so the
// 9–10px labels render small instead of being scaled up with a narrow box.
const W = 760
const H = 270
const X0 = 46
const X1 = 750
const Y0 = 26
const Y1 = 236

const GOLD = '#e3b341'
const GOLD_DIM = '#8a6d22'
const AMBER = '#c98500'

interface Bar {
  key: string
  value: number
  top: string
  bottom: string
  fill: string
  title: string
}

export function Headroom({ defense }: { defense: DefenseSummary }) {
  const [data, setData] = useState<MonsterStatData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [from, setFrom] = useState(DEFAULT_FROM)
  const selectId = useId()

  useEffect(() => {
    let cancelled = false
    fetch(DATA_URL)
      .then(async (res) => {
        if (!res.ok) throw new Error(`returned ${res.status}`)
        return (await res.json()) as MonsterStatData
      })
      .then((d) => !cancelled && setData(d))
      .catch((err: Error) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [])

  const head = (
    <h3 className="h3">Survivability by waystone tier</h3>
  )

  if (error) {
    return (
      <section data-surface="data" className="card" aria-label="Survivability by waystone tier">
        {head}
        <Empty>Could not load the monster data ({error}).</Empty>
      </section>
    )
  }
  if (!data) {
    return (
      <section data-surface="data" className="card" aria-label="Survivability by waystone tier">
        {head}
        <div className="mt-4 h-40 animate-pulse bg-sunken" />
      </section>
    )
  }

  const report = analyzeContent(defense, data)
  const tiers = report.tiers
  // Window starts a tier can open so that a full window of six fits.
  const starts = tiers.slice(0, Math.max(0, tiers.length - WINDOW + 1))
  const start = starts.find((t) => t.tier === from) ?? starts.find((t) => t.tier >= DEFAULT_FROM) ?? starts.at(-1)
  const shown = start ? tiers.filter((t) => t.tier >= start.tier).slice(0, WINDOW) : tiers.slice(0, WINDOW)

  const bars: Bar[] = [
    ...shown.map((t) => ({
      key: `t${t.tier}`,
      value: t.headroom,
      top: `T${t.tier}`,
      bottom: `lvl ${t.areaLevel}`,
      fill: t.headroom >= COMFORT_THRESHOLDS.comfortable ? GOLD : GOLD_DIM,
      title: `Waystone ${t.tier}, area level ${t.areaLevel}: ${t.headroom}× a base monster hit`,
    })),
    ...report.bosses.map((b) => ({
      key: `b${b.level}`,
      value: b.headroom,
      top: b.label.startsWith('Pinnacle') ? `P${b.level}` : `L${b.level}`,
      bottom: 'boss',
      fill: AMBER,
      title: `${b.label}, level ${b.level}: ${b.headroom}× a base monster hit`,
    })),
  ]
  const peak = Math.max(...bars.map((b) => b.value), 0)
  const ymax = Math.max(6, Math.ceil(peak / 6) * 6)
  const y = (v: number) => Y1 - (Math.max(0, v) / ymax) * (Y1 - Y0)
  const slot = (X1 - X0) / Math.max(1, bars.length)
  const bw = Math.min(30, slot * 0.62)
  const ticks = Array.from({ length: ymax / 6 + 1 }, (_, i) => i * 6)
  const label = `Survivability against a physical hit of ${fmt(report.lowestMaximumHit)}, as a multiple of a base monster hit. ${bars
    .map((b) => `${b.top} ${b.value}×`)
    .join(', ')}.`

  return (
    <section data-surface="data" className="card" aria-label="Survivability by waystone tier" id="headroom">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {head}
          <p className="mt-1 max-w-prose text-sm leading-relaxed text-ink-dim">
            Against a {report.lowestMaximumHitType} hit of{' '}
            <span className="tabular font-mono text-ink">{fmt(report.lowestMaximumHit)}</span>, as a multiple of a base monster hit.{' '}
            {report.highestComfortableTier !== null
              ? `Comfortable up to waystone tier ${report.highestComfortableTier}.`
              : 'No waystone tier reads as comfortable.'}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={selectId} className="eyebrow">
            Show from
          </label>
          <Select id={selectId} value={start?.tier ?? from} onChange={(e) => setFrom(Number(e.target.value))}>
            {starts.map((t) => (
              <option key={t.tier} value={t.tier}>
                Waystone {t.tier} · area {t.areaLevel}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="mx-auto mt-4 block h-auto w-full">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={X0} x2={X1} y1={y(t)} y2={y(t)} stroke="#27262c" strokeWidth="1" />
            <text x={X0 - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#8f897f" style={{ fontFamily: 'var(--font-label)' }}>
              {t}×
            </text>
          </g>
        ))}
        <line x1={X0} x2={X1} y1={y(COMFORT_THRESHOLDS.comfortable)} y2={y(COMFORT_THRESHOLDS.comfortable)} stroke="#199e70" strokeWidth="1.2" strokeDasharray="5 4" />
        <line x1={X0} x2={X1} y1={y(COMFORT_THRESHOLDS.dangerous)} y2={y(COMFORT_THRESHOLDS.dangerous)} stroke="#e66767" strokeWidth="1.2" strokeDasharray="5 4" />
        <text x={X1 - 2} y={y(COMFORT_THRESHOLDS.comfortable) - 6} textAnchor="end" fontSize="10" fill="#199e70" style={{ fontFamily: 'var(--font-label)' }}>
          comfortable {COMFORT_THRESHOLDS.comfortable}×
        </text>
        <text x={X1 - 2} y={y(COMFORT_THRESHOLDS.dangerous) - 6} textAnchor="end" fontSize="10" fill="#e66767" style={{ fontFamily: 'var(--font-label)' }}>
          dangerous under {COMFORT_THRESHOLDS.dangerous}×
        </text>
        {bars.map((b, i) => {
          const cx = X0 + slot * i + slot / 2
          return (
            <g key={b.key}>
              <title>{b.title}</title>
              <rect x={cx - bw / 2} y={y(b.value)} width={bw} height={Math.max(0, Y1 - y(b.value))} fill={b.fill} />
              <text x={cx} y={y(b.value) - 5} textAnchor="middle" fontSize="9" fill="#f3eee4" style={{ fontFamily: 'var(--font-label)' }}>
                {b.value}
              </text>
              <text x={cx} y={Y1 + 16} textAnchor="middle" fontSize="9.5" fill="#b1aca3" style={{ fontFamily: 'var(--font-label)' }}>
                {b.top}
              </text>
            </g>
          )
        })}
      </svg>

      <ul className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 text-[11px] text-ink-mute">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block size-2.5" style={{ background: GOLD }} /> Comfortable ({COMFORT_THRESHOLDS.comfortable}× or more)
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block size-2.5" style={{ background: GOLD_DIM }} /> Below comfortable
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block size-2.5" style={{ background: AMBER }} /> Boss (P = pinnacle, L = highest level)
        </li>
      </ul>

      <details className="mt-4 border border-line">
        <summary className="flex cursor-pointer items-center px-4 text-sm text-ink-dim">Show all {tiers.length} tiers as a table</summary>
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Headroom against a base monster hit, by waystone tier</caption>
            <thead>
              <tr className="eyebrow text-left">
                <th scope="col" className="px-4 py-2 font-medium">Waystone</th>
                <th scope="col" className="px-4 py-2 font-medium">Area level</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Headroom</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((t) => (
                <tr key={t.tier} className="border-t border-line">
                  <th scope="row" className="tabular px-4 py-2 text-left font-mono font-normal">{t.tier}</th>
                  <td className="tabular px-4 py-2 font-mono">{t.areaLevel}</td>
                  <td className="tabular px-4 py-2 text-right font-mono">{t.headroom}×</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <div className="mt-4 border border-warn/40 bg-warn/5 p-3">
        <h4 className="text-[11px] font-medium tracking-wide text-warn uppercase">Read this with the number</h4>
        <ul className="mt-1.5 space-y-1">
          {report.caveats.map((c) => (
            <li key={c} className="text-xs leading-relaxed text-ink-dim">
              {c}
            </li>
          ))}
          <li className="text-xs leading-relaxed text-ink-dim">
            &ldquo;Comfortable&rdquo; ({COMFORT_THRESHOLDS.comfortable}× or more) and &ldquo;dangerous&rdquo; (under {COMFORT_THRESHOLDS.dangerous}×) are this
            project&rsquo;s judgement, not game constants.
          </li>
        </ul>
      </div>

      {report.unresolved.map((u) => (
        <div key={u.question} className="mt-2 bg-sunken p-3">
          <h4 className="text-xs font-medium text-ink-dim">{u.question}</h4>
          <p className="mt-1 text-xs leading-relaxed text-ink-mute">{u.missing}</p>
        </div>
      ))}
    </section>
  )
}
