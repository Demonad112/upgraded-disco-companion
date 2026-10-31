'use client'

/**
 * What-if: move a resistance, or tick a suggested re-craft, and the largest
 * survivable hit, the grade and the findings are recomputed by running the
 * same engine on a patched copy of the character. Nothing here is saved, and
 * the numbers are an estimate: see `whatIfDefense` in @poe2/core.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  analyzeCharacter,
  whatIfModel,
  type Analysis,
  type AnalyzeOptions,
  type BuildAssessment,
  type Recommendation,
  type WhatIfOverrides,
} from '@poe2/core'
import { Panel, Tag, fmt } from '../ui'
import { Button, Range } from '../shared/controls'
import { CountUp } from '../shared/CountUp'

type ResType = 'fire' | 'cold' | 'lightning' | 'chaos'
const TYPES: ResType[] = ['fire', 'cold', 'lightning', 'chaos']
const COLOR: Record<ResType, string> = {
  fire: 'bg-fire',
  cold: 'bg-cold',
  lightning: 'bg-lightning',
  chaos: 'bg-chaos',
}
const SLIDER_MIN = -60
const SLIDER_MAX = 90

const RES_STAT = /^(fire|cold|lightning|chaos)Resistance$/

const fmtDefence = (n: number | null) => (n === null ? '—' : n.toFixed(2))

/** The headline grade; a range when damage could not be graded. */
function grade(a: BuildAssessment): string {
  if (a.tier) return a.tier
  if (!a.tierRange) return '—'
  return a.tierRange.worst === a.tierRange.best ? a.tierRange.worst : `${a.tierRange.worst}–${a.tierRange.best}`
}

/** Suggested re-crafts that move a single resistance, with the size of the move. */
export function resistanceRecrafts(recs: Recommendation[]): { rec: Recommendation; type: ResType; delta: number }[] {
  const out: { rec: Recommendation; type: ResType; delta: number }[] = []
  for (const rec of recs) {
    const m = rec.impact ? RES_STAT.exec(rec.impact.stat) : null
    if (!rec.impact || !m || !Number.isFinite(rec.impact.delta) || rec.impact.delta === 0) continue
    if (rec.category !== 'gear' && rec.cost.kind !== 'gear' && rec.cost.kind !== 'currency') continue
    out.push({ rec, type: m[1] as ResType, delta: rec.impact.delta })
  }
  return out
}

function Delta({ before, after, format = fmt }: { before: number | null; after: number | null; format?: (n: number | null) => string }) {
  const changed = before !== after
  return (
    <span className="tabular">
      <span className={changed ? 'text-ink-mute' : 'text-ink'}>{format(before)}</span>
      {changed ? (
        <>
          <span className="text-ink-mute"> → </span>
          <CountUp value={after} from={before} format={format} className="font-semibold text-accent" />
        </>
      ) : null}
    </span>
  )
}

export function WhatIfPanel({ analysis, options }: { analysis: Analysis; options: AnalyzeOptions }) {
  const base = useMemo(() => {
    const map = {} as Record<ResType, number | null>
    for (const t of TYPES) map[t] = analysis.defense.resistances.find((r) => r.type === t)?.value ?? null
    return map
  }, [analysis])

  const [vals, setVals] = useState(base)
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set())
  const [result, setResult] = useState<{ key: string; analysis: Analysis } | null>(null)

  // A new character resets the experiment.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- re-seeding local state when the analysed character changes
    setVals(base)
    setTicked(new Set())
    setResult(null)
  }, [base])

  const recrafts = useMemo(() => resistanceRecrafts(analysis.recommendations.recommendations), [analysis])

  const overrides = useMemo(() => {
    const o: WhatIfOverrides = {}
    for (const t of TYPES) {
      const start = base[t]
      if (start === null || vals[t] === null) continue
      const bonus = recrafts.filter((r) => r.type === t && ticked.has(r.rec.id)).reduce((n, r) => n + r.delta, 0)
      const effective = (vals[t] as number) + bonus
      if (effective !== start) o[t] = effective
    }
    return o
  }, [base, vals, recrafts, ticked])

  const key = JSON.stringify(overrides)
  const changed = Object.keys(overrides).length > 0

  useEffect(() => {
    if (!changed) return
    let cancelled = false
    void analyzeCharacter(whatIfModel(analysis.model, overrides), options)
      .then((next) => {
        if (!cancelled) setResult({ key, analysis: next })
      })
      .catch(() => {
        if (!cancelled) setResult(null)
      })
    return () => {
      cancelled = true
    }
  }, [analysis, options, overrides, key, changed])

  // While a new estimate runs, keep showing the last one rather than dropping back to the character's own numbers.
  const after = changed && result ? result.analysis : analysis
  const pending = changed && result?.key !== key
  const d0 = analysis.defense
  const d1 = after.defense
  const f0 = analysis.recommendations.recommendations.filter((r) => r.category !== 'question')
  const f1 = after.recommendations.recommendations.filter((r) => r.category !== 'question')

  const reset = () => {
    setVals(base)
    setTicked(new Set())
    setResult(null)
  }

  return (
    <Panel
      title="What-if resistances"
      subtitle="Move a slider or tick a suggested re-craft. The estimate re-runs the same grade and findings; nothing is saved."
      action={
        // aria-disabled, not disabled: a disabled button drops keyboard focus to <body> the moment Reset runs.
        <Button size="sm" onClick={reset} aria-disabled={!changed && !ticked.size}>
          Reset
        </Button>
      }
      className="scroll-mt-24"
    >
      <div id="what-if" className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-1">
          {TYPES.map((t) => {
            const start = base[t]
            const bonus = recrafts.filter((r) => r.type === t && ticked.has(r.rec.id)).reduce((n, r) => n + r.delta, 0)
            const cap = d0.resistances.find((r) => r.type === t)?.max ?? 75
            return (
              <label key={t} className="block">
                <span className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 capitalize">
                    <span className={`size-2.5 ${COLOR[t]}`} aria-hidden />
                    {t}
                  </span>
                  <span className="tabular font-mono text-xs text-ink-dim">
                    {start === null ? (
                      'not reported'
                    ) : (
                      <>
                        {vals[t]! + bonus}% <span className="text-ink-mute">/ cap {cap}%</span>
                        {vals[t]! + bonus !== start ? <span className="text-accent"> ({start}% now)</span> : null}
                      </>
                    )}
                  </span>
                </span>
                <Range
                  min={SLIDER_MIN}
                  max={SLIDER_MAX}
                  step={1}
                  disabled={start === null}
                  value={vals[t] ?? 0}
                  aria-label={`${t} resistance`}
                  onChange={(e) => setVals((v) => ({ ...v, [t]: Number(e.target.value) }))}
                />
              </label>
            )
          })}
        </div>

        <div aria-live="polite" className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="border border-line bg-surface-sunken p-3">
              <div className="label-metric">Largest hit</div>
              <div className="mt-1 text-lg font-semibold">
                <Delta before={d0.lowestMaximumHit} after={d1.lowestMaximumHit} />
              </div>
              <div className="text-[11px] text-ink-mute capitalize">
                {d1.lowestMaximumHitType ?? 'unknown'} kills first
              </div>
            </div>
            <div className="border border-line bg-surface-sunken p-3">
              <div className="label-metric">Grade</div>
              <div className="mt-1 text-lg font-semibold">
                <span className={grade(analysis.assessment) === grade(after.assessment) ? '' : 'text-ink-mute'}>
                  {grade(analysis.assessment)}
                </span>
                {grade(analysis.assessment) !== grade(after.assessment) ? (
                  <>
                    <span className="text-accent"> → </span>
                    {/* Keyed on the letter: the pulse plays each time the grade crosses a boundary, not on every move. */}
                    <span key={grade(after.assessment)} className="whatif-pulse text-accent">
                      {grade(after.assessment)}
                    </span>
                  </>
                ) : null}
              </div>
              <div className="text-[11px] text-ink-mute tabular">
                <CountUp value={after.assessment.defence} format={fmtDefence} /> / 0.50 defence
              </div>
            </div>
            <div className="border border-line bg-surface-sunken p-3">
              <div className="label-metric">Findings</div>
              <div className="mt-1 text-lg font-semibold">
                <Delta before={f0.length} after={f1.length} />
              </div>
              <div className="text-[11px] text-ink-mute">{pending ? 'recomputing…' : 'actionable'}</div>
            </div>
          </div>

          <ul className="space-y-1 text-xs" aria-label="Largest survivable hit by damage type">
            {d1.maxHits.map((h) => {
              const was = d0.maxHits.find((m) => m.type === h.type)?.value ?? null
              const widest = Math.max(...d1.maxHits.map((m) => m.value), 1)
              return (
                <li key={h.type} className="flex items-center gap-2">
                  <span className="w-20 capitalize text-ink-dim">{h.type}</span>
                  <span className="relative h-1.5 flex-1 bg-surface-sunken">
                    <span
                      className={`block h-full transition-[width] duration-200 ease-out ${COLOR[h.type as ResType] ?? 'bg-physical'}`}
                      style={{ width: `${(h.value / widest) * 100}%` }}
                    />
                    {/* Where the bar started, so the move stays readable after the numbers settle. */}
                    {was !== null && was !== h.value ? (
                      <span
                        aria-hidden
                        className="whatif-ghost"
                        style={{ left: `${Math.min(100, (was / widest) * 100)}%` }}
                      />
                    ) : null}
                  </span>
                  <span className="w-28 text-right font-mono">
                    <Delta before={was} after={h.value} />
                  </span>
                  {h.isLowest ? <Tag tone="warn">one-shot</Tag> : null}
                </li>
              )
            })}
          </ul>

          {f1.length ? (
            <ul className="space-y-1 border-t border-line pt-2 text-xs text-ink-dim">
              {f1.slice(0, 3).map((r) => (
                <li key={r.id}>• {r.action}</li>
              ))}
              {f1.length > 3 ? <li className="text-ink-mute">+ {f1.length - 3} more in Findings</li> : null}
            </ul>
          ) : (
            <p className="border-t border-line pt-2 text-xs text-good">No actionable findings at these resistances.</p>
          )}
        </div>
      </div>

      {recrafts.length ? (
        <fieldset className="mt-5 border-t border-line pt-4">
          <legend className="eyebrow pr-2">Gear workbench — suggested re-crafts</legend>
          <ul className="grid gap-1 lg:grid-cols-2">
            {recrafts.map(({ rec, type, delta }) => (
              <li key={rec.id}>
                <label className="flex min-h-11 cursor-pointer items-start gap-2 py-1.5 text-xs">
                  {/* A 24 px cell around the checkbox, so its own target clears WCAG 2.5.8. */}
                  <span className="-mt-1 grid size-6 shrink-0 place-items-center">
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={ticked.has(rec.id)}
                      onChange={(e) =>
                        setTicked((prev) => {
                          const next = new Set(prev)
                          if (e.target.checked) next.add(rec.id)
                          else next.delete(rec.id)
                          return next
                        })
                      }
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="font-medium text-ink capitalize">
                      {delta > 0 ? '+' : ''}
                      {delta}% {type}
                    </span>
                    <span className="text-ink-dim"> · {rec.action}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      ) : null}
    </Panel>
  )
}
