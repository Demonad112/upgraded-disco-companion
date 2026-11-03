'use client'

/**
 * Which waystone tiers are worth running: risk for this character against the
 * XP lost to the level gap. Maps only; bosses are out of scope here.
 *
 * Character mode reads risk from headroom (core `analyzeContent`); with no max
 * hit it falls back to reference mode, where risk is the level gap alone. The
 * verdict, limits and "what's needed" lines all come from core `planWaystones`.
 */

import { useEffect, useId, useState } from 'react'
import {
  COMFORT_THRESHOLDS,
  DEATH_XP_LOSS,
  REFERENCE_RISK_PER_LEVEL,
  XP_WORTH_FLOOR,
  analyzeContent,
  planWaystones,
  type DefenseSummary,
  type MonsterStatData,
  type PushNeed,
  type RiskBand,
  type WaystoneRow,
} from '@poe2/core'
import { Empty, fmt } from './ui'
import { Input, Select } from '@/components/shared/controls'
import { dataUrl } from '@/lib/basePath'

const DATA_URL = dataUrl('monster-stats.json')
const GROUP = 4
const DEFAULT_LEVEL = 75
const TITLE = 'Survivability by waystone tier'

const BAND_WORD: Record<RiskBand, string> = { low: 'Low', some: 'Some', high: 'High' }
const BAND_TEXT: Record<RiskBand, string> = { low: 'text-good', some: 'text-warn', high: 'text-danger' }
const BAND_VAR: Record<RiskBand, string> = { low: 'var(--good)', some: 'var(--warn)', high: 'var(--danger)' }
const BAND_FILL: Record<RiskBand, string> = { low: 'bg-good', some: 'bg-warn', high: 'bg-danger' }

const pct = (n: number) => `${Math.round(n * 100)}%`
const xpLostLabel = (lost: number) => (Math.round(lost * 100) === 0 ? '0%' : `−${pct(lost)}`)
const xpLostTone = (lost: number) =>
  Math.round(lost * 100) === 0 ? 'text-good' : 1 - lost >= XP_WORTH_FLOOR ? 'text-warn' : 'text-danger'
const needValue = (n: PushNeed) => (n.unit === '%' ? `${n.from}% → ${n.to}%` : `+${n.to}%`)

function LimitLine({ children }: { children: string }) {
  return (
    <li aria-hidden className="eyebrow flex items-center gap-2 py-2 text-[10px] text-warn">
      <span className="flex-1 border-t border-dashed border-warn" />
      {children}
      <span className="flex-1 border-t border-dashed border-warn" />
    </li>
  )
}

function TierRow({ row }: { row: WaystoneRow }) {
  return (
    <li
      className="grid grid-cols-[5rem_1fr_4.5rem] items-center gap-3 border-b border-l-2 border-line py-3 pl-3"
      style={{ borderLeftColor: BAND_VAR[row.band] }}
      aria-label={`Tier ${row.tier}, area level ${row.areaLevel}: ${BAND_WORD[row.band].toLowerCase()} risk, ${row.risk}%. XP lost ${xpLostLabel(row.xpLost)}.`}
    >
      <div>
        <div className="font-display text-xl leading-none font-bold">T{row.tier}</div>
        <div className="eyebrow mt-1 text-[10px]">
          lvl {row.areaLevel}
          {row.corruptOnly ? ' · corrupt' : ''}
        </div>
      </div>
      <div aria-hidden>
        <div className="flex justify-between text-xs">
          <span className={`eyebrow ${BAND_TEXT[row.band]}`}>
            {BAND_WORD[row.band]} risk
          </span>
          <span className="tabular font-mono text-ink">{row.risk}%</span>
        </div>
        <div className="mt-1.5 h-1.5 bg-line">
          <div className={`h-1.5 ${BAND_FILL[row.band]}`} style={{ width: `${Math.max(row.risk, 2)}%` }} />
        </div>
      </div>
      <div aria-hidden className="text-right">
        <div className={`tabular font-mono text-base ${xpLostTone(row.xpLost)}`}>{xpLostLabel(row.xpLost)}</div>
        <div className="eyebrow text-[10px]">XP lost</div>
      </div>
    </li>
  )
}

export function Headroom({ defense, level }: { defense: DefenseSummary | null; level?: number | null }) {
  const [data, setData] = useState<MonsterStatData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [levelText, setLevelText] = useState(String(level ?? DEFAULT_LEVEL))
  const [group, setGroup] = useState<number | null>(null)
  const groupId = useId()
  const levelId = useId()

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

  const head = <h3 className="h3">{TITLE}</h3>

  if (error) {
    return (
      <section data-surface="data" className="card" aria-label={TITLE}>
        {head}
        <Empty>Could not load the monster data ({error}).</Empty>
      </section>
    )
  }
  if (!data) {
    return (
      <section data-surface="data" className="card" aria-label={TITLE}>
        {head}
        <div className="mt-4 h-40 animate-pulse bg-sunken" />
      </section>
    )
  }

  const typed = Number.parseInt(levelText, 10)
  const lvl = Number.isFinite(typed) && typed >= 1 && typed <= 100 ? typed : (level ?? DEFAULT_LEVEL)
  const report = defense ? analyzeContent(defense, data) : null
  const plan = planWaystones({ level: lvl, tiers: data.tiers, report, defense })
  const character = plan.mode === 'character'
  const groups: WaystoneRow[][] = []
  for (let i = 0; i < plan.rows.length; i += GROUP) groups.push(plan.rows.slice(i, i + GROUP))
  const anchor = plan.best ?? plan.riskLimitTier ?? plan.rows.at(-1)?.tier
  const defaultGroup = Math.max(0, groups.findIndex((g) => g.some((r) => r.tier === anchor)))
  const shownIndex = group !== null && group < groups.length ? group : defaultGroup
  const shown = groups[shownIndex] ?? []
  const groupLabel = (g: WaystoneRow[]) => `T${g[0]!.tier}–T${g.at(-1)!.tier}`

  const verdict =
    plan.runFrom !== null && plan.runTo !== null ? (
      <>
        Run {plan.runFrom === plan.runTo ? `T${plan.runTo}` : `T${plan.runFrom}–T${plan.runTo}`}.{' '}
        <span className="text-good">Best: T{plan.best}</span>
      </>
    ) : plan.rows.some((r) => r.band === 'low') ? (
      <>No low-risk tier keeps {pct(XP_WORTH_FLOOR)} XP</>
    ) : (
      <span className="text-warn">No tier is low risk yet</span>
    )

  const subParts: string[] = []
  if (plan.xpLimitTier !== null)
    subParts.push(`Below T${plan.xpLimitTier} you lose over ${pct(1 - XP_WORTH_FLOOR)} XP at level ${plan.level}.`)
  if (plan.riskLimitTier !== null)
    subParts.push(
      character ? `Above T${plan.riskLimitTier} this character carries risk.` : `Above T${plan.riskLimitTier} maps are over your level.`,
    )
  if (!character) subParts.push('General estimate from level only.')

  const top = plan.rows.at(-1)
  const nextTier = plan.riskLimitTier !== null ? plan.riskLimitTier + 1 : null

  return (
    <section data-surface="data" className="card" aria-label={TITLE} id="headroom">
      {head}
      <p className="font-display mt-3 text-2xl leading-tight font-bold uppercase" data-testid="headroom-verdict">
        {verdict}
      </p>
      {subParts.length ? <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-ink-dim">{subParts.join(' ')}</p> : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={groupId} className="eyebrow">
            Tiers
          </label>
          <Select id={groupId} value={shownIndex} onChange={(e) => setGroup(Number(e.target.value))}>
            {groups.map((g, i) => (
              <option key={i} value={i}>
                {groupLabel(g)}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={levelId} className="eyebrow">
            Your level
          </label>
          <Input
            id={levelId}
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            className="tabular w-20 font-mono"
            value={levelText}
            onChange={(e) => setLevelText(e.target.value)}
          />
        </div>
      </div>

      <div aria-hidden className="eyebrow mt-5 grid grid-cols-[5rem_1fr_4.5rem] gap-3 border-l-2 border-transparent pl-3 text-[10px]">
        <span>Tier</span>
        <span>{character ? 'Risk for you' : 'General risk'}</span>
        <span className="text-right">XP lost</span>
      </div>
      <ol className="mt-1 border-t border-line" aria-label={`Waystone tiers ${groupLabel(shown)}`}>
        {shown.flatMap((row) => {
          const items = []
          if (row.tier === plan.xpLimitTier)
            items.push(<LimitLine key={`xp${row.tier}`}>{`XP limit · below loses ${pct(1 - XP_WORTH_FLOOR)}+`}</LimitLine>)
          items.push(<TierRow key={row.tier} row={row} />)
          if (row.tier === plan.riskLimitTier) items.push(<LimitLine key={`r${row.tier}`}>Risk limit · above needs more</LimitLine>)
          return items
        })}
      </ol>

      <ul className="eyebrow mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block size-2.5 bg-good" /> Low 0%
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block size-2.5 bg-warn" /> Some 1–99%
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block size-2.5 bg-danger" /> High 100%
        </li>
      </ul>

      <p className="mt-4 max-w-prose border-l-2 border-accent pl-3 text-sm leading-relaxed text-ink-dim">
        {character ? (
          <>
            Risk is how close a tier is to one-shot territory for your whole character. <b className="font-semibold text-ink">0%</b>: a
            plain monster&rsquo;s hit would have to be {COMFORT_THRESHOLDS.comfortable} times harder to kill you, so rares and map mods
            still leave room. <b className="font-semibold text-ink">100%</b>: under {COMFORT_THRESHOLDS.dangerous} times, one rare or a bad
            mod can kill you.
          </>
        ) : (
          <>
            With no character, risk only counts how far the map is above your level:{' '}
            <b className="font-semibold text-ink">+{REFERENCE_RISK_PER_LEVEL}%</b> per level,{' '}
            <b className="font-semibold text-ink">100%</b> at {Math.ceil(100 / REFERENCE_RISK_PER_LEVEL)} levels over.
          </>
        )}
      </p>

      {character && nextTier !== null ? (
        <div className="mt-5 border-t border-line-strong pt-4" data-testid="headroom-needs">
          <h4 className="eyebrow text-accent">To push past T{plan.riskLimitTier}</h4>
          <ul>
            {plan.needs.map((n) => (
              <li key={`${n.stat}${n.tier}`} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 border-b border-line py-2.5">
                <span className="font-semibold text-ink">{n.stat}</span>
                <span className="tabular font-mono text-warn">{needValue(n)}</span>
                <span className="text-[13px] text-ink-dim">
                  {n.tier !== null ? `Gets T${n.tier} to low risk. ` : ''}
                  {n.note}
                </span>
                <span className="eyebrow text-right text-[10px]">{n.tier !== null ? `T${n.tier}` : 'All'}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs leading-relaxed text-ink-mute">
            Estimates. Damage is not judged here: poe.ninja gives no clear-speed figure to compare against.
          </p>
        </div>
      ) : null}
      {!character && top && plan.riskLimitTier !== null ? (
        <div className="mt-5 border-t border-line-strong pt-4" data-testid="headroom-needs">
          <h4 className="eyebrow text-accent">
            Going {plan.level} → T{top.tier} (lvl {top.areaLevel})
          </h4>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-dim">
            {top.areaLevel - plan.level} levels over: expect capped elemental resistances and some chaos resistance before running it.
            Import a character for a real read.
          </p>
        </div>
      ) : null}

      <details className="mt-4 border border-line">
        <summary className="flex cursor-pointer items-center px-4 text-sm text-ink-dim">Show all {plan.rows.length} tiers as a table</summary>
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Risk and XP lost by waystone tier</caption>
            <thead>
              <tr className="eyebrow text-left">
                <th scope="col" className="px-4 py-2 font-medium">Waystone</th>
                <th scope="col" className="px-4 py-2 font-medium">Area level</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Risk</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">XP lost</th>
              </tr>
            </thead>
            <tbody>
              {plan.rows.map((r) => (
                <tr key={r.tier} className="border-t border-line">
                  <th scope="row" className="tabular px-4 py-2 text-left font-mono font-normal">{r.tier}</th>
                  <td className="tabular px-4 py-2 font-mono">{r.areaLevel}</td>
                  <td className={`tabular px-4 py-2 text-right font-mono ${BAND_TEXT[r.band]}`}>{r.risk}%</td>
                  <td className="tabular px-4 py-2 text-right font-mono">{xpLostLabel(r.xpLost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <div className="mt-4 border border-warn/40 bg-warn/5 p-3">
        <h4 className="text-[11px] font-medium tracking-wide text-warn uppercase">A death costs {pct(DEATH_XP_LOSS)} of a level</h4>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-dim">
          In waystones a death takes {pct(DEATH_XP_LOSS)} of the XP needed for your next level. The bar stops at 0%; you never lose a level.
        </p>
      </div>

      {report && character ? (
        <div className="mt-2 border border-warn/40 bg-warn/5 p-3">
          <h4 className="text-[11px] font-medium tracking-wide text-warn uppercase">Upper bound, not a safety verdict</h4>
          <ul className="mt-1.5 space-y-1">
            <li className="text-xs leading-relaxed text-ink-dim">{report.caveats[0]}</li>
            <li className="text-xs leading-relaxed text-ink-dim">
              Your weakest side is {report.lowestMaximumHitType}: a{' '}
              <span className="tabular font-mono text-ink">{fmt(report.lowestMaximumHit)}</span> hit kills you. Other damage types have more
              room.
            </li>
            <li className="text-xs leading-relaxed text-ink-dim">
              Low ({COMFORT_THRESHOLDS.comfortable}× or more) and high (under {COMFORT_THRESHOLDS.dangerous}×) risk, and the{' '}
              {pct(XP_WORTH_FLOOR)} XP limit, are this project&rsquo;s judgement, not game constants.
            </li>
          </ul>
        </div>
      ) : null}

      {report?.unresolved.map((u) => (
        <div key={u.question} className="mt-2 bg-sunken p-3">
          <h4 className="text-xs font-medium text-ink-dim">{u.question}</h4>
          <p className="mt-1 text-xs leading-relaxed text-ink-mute">{u.missing}</p>
        </div>
      ))}
    </section>
  )
}
