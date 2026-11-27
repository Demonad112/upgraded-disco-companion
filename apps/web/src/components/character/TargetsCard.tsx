'use client'

/**
 * The player's own targets (GF1-8): "Life ≥ 5000", "cold resistance at its max", checked against this
 * character's numbers as the analysis read them. A figure the analysis doesn't carry shows as missing,
 * never as failed. Saved in this browser (`poe2-targets`).
 */

import { acceptsMax, checkTargets, TARGET_STATS, type Analysis, type Target, type TargetResult, type TargetStat } from '@poe2/core'
import { useLocalStore } from '@/lib/localStore'
import { newTarget, patchTarget, removeTarget, targetsStore } from '@/lib/targets'
import { Button, Input, Select } from '@/components/shared/controls'
import { StatusChip } from '@/components/shared/Instruments'
import { fmt } from '../ui'

const show = (v: number | null, unit: TargetResult['unit']) => (v === null ? '—' : `${fmt(v)}${unit === 'percent' ? '%' : ''}`)

function Verdict({ r }: { r: TargetResult }) {
  if (r.met === 'missing') return <StatusChip tone="muted">Missing</StatusChip>
  return r.met ? <StatusChip tone="good">Met</StatusChip> : <StatusChip tone="danger">Not met</StatusChip>
}

/** "3 of 4 met", counting only the targets that could be checked. */
export function targetsSummary(results: readonly TargetResult[]): string {
  if (!results.length) return 'Set a target, like 5,000 life'
  const met = results.filter((r) => r.met === true).length
  const missing = results.filter((r) => r.met === 'missing').length
  return `${met} of ${results.length} met${missing ? `, ${missing} missing` : ''}`
}

export function useTargets(): readonly Target[] {
  return useLocalStore(targetsStore)
}

export function TargetsCard({ analysis }: { analysis: Analysis }) {
  const targets = useTargets()
  const results = checkTargets(analysis, targets)
  const edit = (id: string, patch: Partial<Omit<Target, 'id'>>) => targetsStore.set((l) => patchTarget(l, id, patch))

  return (
    <div>
      <p className="mb-3 max-w-prose text-xs text-ink-mute">
        Set the numbers you&rsquo;re aiming for. Missing means the import didn&rsquo;t carry that figure.
      </p>
      {targets.length ? (
        <div className="overflow-x-auto border border-line">
          <table className="tabular w-full text-sm">
            <thead className="border-b border-line bg-surface-sunken">
              <tr className="text-left text-xs text-ink-mute">
                <th scope="col" className="px-3 py-2 font-normal">Stat</th>
                <th scope="col" className="px-3 py-2 font-normal">Target</th>
                <th scope="col" className="px-3 py-2 text-right font-normal">Now</th>
                <th scope="col" className="px-3 py-2 font-normal">Status</th>
                <th scope="col" className="px-3 py-2 font-normal"><span className="sr-only">Remove</span></th>
              </tr>
            </thead>
            <tbody>
              {targets.map((t, i) => {
                const r = results[i]!
                return (
                  <tr key={t.id} className="border-t border-line first:border-t-0" data-target={t.stat}>
                    <td className="px-3 py-1.5">
                      <Select
                        aria-label="Stat"
                        value={t.stat}
                        onChange={(e) => edit(t.id, { stat: e.target.value as TargetStat })}
                        className="text-xs"
                      >
                        {TARGET_STATS.map((s) => (
                          <option key={s.stat} value={s.stat}>
                            {s.label}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="flex items-center gap-1">
                        <span className="text-xs text-ink-mute">{t.op === '>=' ? '≥' : '≤'}</span>
                        {acceptsMax(t.stat) ? (
                          <Select
                            aria-label="Its max or a number"
                            value={t.want === 'max' ? 'max' : 'number'}
                            onChange={(e) => edit(t.id, { want: e.target.value === 'max' ? 'max' : (r.want ?? 75) })}
                            className="text-xs"
                          >
                            <option value="max">Its max</option>
                            <option value="number">Number</option>
                          </Select>
                        ) : null}
                        {t.want !== 'max' ? (
                          <Input
                            aria-label="Target value"
                            type="number"
                            inputMode="numeric"
                            value={t.want}
                            onChange={(e) => {
                              const n = Number(e.target.value)
                              if (Number.isFinite(n)) edit(t.id, { want: n })
                            }}
                            className="w-24 text-xs"
                          />
                        ) : (
                          <span className="text-xs text-ink-mute">{show(r.want, r.unit)}</span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-right">{show(r.have, r.unit)}</td>
                    <td className="px-3 py-1.5">
                      <Verdict r={r} />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Remove ${r.label} target`}
                        onClick={() => targetsStore.set((l) => removeTarget(l, t.id))}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      <div className="mt-3">
        <Button size="sm" onClick={() => targetsStore.set((l) => [...l, newTarget()])}>
          Add target
        </Button>
      </div>
    </div>
  )
}
