'use client'

/** The Overview's supporting cards: spare to trade, since last import, resist glance, tree-data note. */

import { resolveAllocation, type Analysis, type PassiveTree, type SnapshotDiff } from '@poe2/core'
import { DefenceChecklist } from './DefenceChecklist'
import { Diamond, cap } from './dmg'
import { Tag, fmt } from '../ui'
import { ProvenanceBadge } from '../shared/ProvenanceBadge'

/** Resistances over cap. "Spare" is max(0, uncapped − cap), i.e. the existing overCap figure; labelled derived. */
export function SpareToTrade({ analysis }: { analysis: Analysis }) {
  const spare = analysis.defense.resistances.filter((r) => r.overCap !== null && r.overCap > 0)
  return (
    <section className="card" aria-label="Spare to trade">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="h3">Spare to trade</h3>
        <ProvenanceBadge label="derived" />
      </div>
      {spare.length ? (
        <ul className="mt-3 space-y-2">
          {spare.map((r) => (
            <li key={r.type} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <Diamond type={r.type} />
                <span className="serif-label">{cap(r.type)}</span>
              </span>
              <span className="tabular font-mono text-sm text-ink">+{fmt(r.overCap)} over cap</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-ink-dim">No resistance is over its cap, so nothing is spare.</p>
      )}
      <p className="mt-3 text-xs leading-relaxed text-ink-mute">
        Only resistances over their cap are listed; one under cap is not. Check any trade against all resistances together
        before you make it.
      </p>
    </section>
  )
}

const shortDate = (iso: string): string => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** The three biggest moves between the two latest snapshots, from the existing comparison. */
export function SinceLastImport({ diff }: { diff: SnapshotDiff | null }) {
  const top = diff?.changes.slice(0, 3) ?? []
  return (
    <section className="card" aria-label="Since last import">
      <h3 className="h3">Since last import</h3>
      {diff && top.length ? (
        <>
          <ul className="mt-3 space-y-2.5">
            {top.map((c) => {
              const suffix = c.unit === 'percent' ? '%' : ''
              return (
                <li key={c.field} className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="text-sm text-ink">{c.label}</span>
                  <span className="tabular font-mono text-sm">
                    <span className="text-ink-mute">
                      {fmt(c.before)}
                      {suffix}
                    </span>{' '}
                    → {fmt(c.after)}
                    {suffix}{' '}
                    <span className={c.improved ? 'text-good' : 'text-warn'}>
                      {c.delta > 0 ? '+' : ''}
                      {fmt(c.delta)}
                      {suffix}
                      {c.percent !== null && c.unit !== 'percent' ? ` (${c.percent > 0 ? '+' : ''}${c.percent.toFixed(1)}%)` : ''}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="mt-3 flex flex-wrap items-baseline justify-between gap-2 text-xs">
            <span className="tabular font-mono text-ink-mute">
              {shortDate(diff.from.at)} → {shortDate(diff.to.at)}
            </span>
            <a href="#progress" className="text-accent">
              All {diff.changes.length} change{diff.changes.length === 1 ? '' : 's'}
            </a>
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-ink-dim">
          {diff ? 'No tracked figure moved.' : 'Import again after playing; two reports are needed to compare.'}
        </p>
      )}
    </section>
  )
}

/** Four resistance boxes with a collapsed full checklist underneath. */
export function DefencesGlance({ analysis }: { analysis: Analysis }) {
  return (
    <section className="card" aria-label="Defences at a glance">
      <h3 className="h3">Defences at a glance</h3>
      <div className="mt-3 grid grid-cols-2 gap-3 min-[621px]:grid-cols-4">
        {analysis.defense.resistances.map((r) => (
          <div key={r.type} className="border border-line bg-sunken/65 px-3.5 py-3">
            <div className="flex items-center gap-2">
              <Diamond type={r.type} />
              <span className="serif-label">{cap(r.type)}</span>
            </div>
            <div className="tabular mt-2 font-mono text-xl text-ink">
              {r.value === null ? 'unknown' : <>{r.value}</>}
              {r.value === null ? null : <span className="text-sm text-ink-mute">/{r.max}</span>}
            </div>
            <div className="mt-2">
              {r.value === null ? (
                <Tag>unknown</Tag>
              ) : r.underCap !== null && r.underCap > 0 ? (
                <Tag tone="danger">{fmt(r.underCap)} under</Tag>
              ) : (
                <Tag tone="good">OK</Tag>
              )}
            </div>
          </div>
        ))}
      </div>
      <DefenceChecklist analysis={analysis} />
    </section>
  )
}

/** Shown only when allocated nodes are missing from the tool's tree data. */
export function TreeDataNote({ analysis, tree }: { analysis: Analysis; tree: PassiveTree | null }) {
  if (!tree) return null
  const missing = resolveAllocation(tree, analysis.passives).unresolvedIds
  if (!missing.length) return null
  return (
    <aside className="card border-warn/50" aria-label="Tree data is behind">
      <h3 className="eyebrow text-warn">Tree data is behind</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-dim">
        {missing.length} passive node{missing.length === 1 ? '' : 's'} on this character {missing.length === 1 ? "isn't" : "aren't"} in
        the tool&rsquo;s tree data yet, so {missing.length === 1 ? 'its effect isn' : 'their effects aren'}&rsquo;t counted. Keystone and
        notable findings may be missing something.
      </p>
      <p className="tabular mt-2 font-mono text-[11px] break-words text-ink-mute">
        Node ids: {missing.join(', ')} · tree data: {tree.treeName}
      </p>
    </aside>
  )
}
