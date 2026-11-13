'use client'

/** Supporting cards: spare to trade (Gear), resist glance (Defence), tree-data note (Advanced). */

import { resolveAllocation, type Analysis, type PassiveTree } from '@poe2/core'
import { DefenceChecklist } from './DefenceChecklist'
import { Diamond, cap } from './dmg'
import { Empty, Tag, fmt } from '../ui'
import { ProvenanceBadge } from '../shared/ProvenanceBadge'

/** Resistances over cap. "Spare" is max(0, uncapped − cap), i.e. the existing overCap figure; labelled derived. */
function SpareToTrade({ analysis }: { analysis: Analysis }) {
  const spare = analysis.defense.resistances.filter((r) => r.overCap !== null && r.overCap > 0)
  return (
    <section aria-label="Spare to trade" className="flex min-w-0 flex-col">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="h3">Spare to trade</h3>
        <ProvenanceBadge label="derived" />
      </div>
      {spare.length ? (
        <ul className="mt-3 grid grid-cols-2 gap-3 min-[621px]:grid-cols-4">
          {spare.map((r) => (
            <li key={r.type} className="border border-line border-l-[3px] border-l-warn bg-sunken/65 px-3.5 py-3">
              <span className="flex items-center gap-2">
                <Diamond type={r.type} />
                <span className="serif-label">{cap(r.type)}</span>
              </span>
              <span className="tabular mt-2 block font-mono text-3xl leading-none text-ink">+{fmt(r.overCap)}</span>
              <span className="mt-1.5 block font-mono text-sm text-warn">over cap</span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>No resistance is over its cap, so nothing is spare.</Empty>
      )}
      <p className="mt-auto pt-3 text-xs leading-relaxed text-ink-mute">
        Over-cap points only buffer against map mods that lower resistance. Check every resistance before you trade any away.
      </p>
    </section>
  )
}

/** Spare to trade, as its own card (Gear tab). */
export function SpareToTradeCard({ analysis }: { analysis: Analysis }) {
  return (
    <div data-surface="data" className="card">
      <SpareToTrade analysis={analysis} />
    </div>
  )
}

/** Four resistance boxes with a collapsed full checklist underneath. */
export function DefencesGlance({ analysis }: { analysis: Analysis }) {
  return (
    <section data-surface="data" className="card" aria-label="Defences at a glance">
      <h3 className="h3">Defences at a glance</h3>
      <div className="mt-3 grid grid-cols-2 gap-3 min-[621px]:grid-cols-4">
        {analysis.defense.resistances.map((r) => {
          // Edge: red under cap, green capped or up to 15 over, amber more than 15 over (wasted), grey unknown.
          const under = r.underCap !== null && r.underCap > 0
          const over = r.overCap ?? 0
          const edge = r.value === null ? 'var(--line)' : under ? 'var(--danger)' : over > 15 ? 'var(--warn)' : 'var(--good)'
          return (
            <div key={r.type} className="border border-line border-l-[3px] bg-sunken/65 px-3.5 py-3" style={{ borderLeftColor: edge }}>
              <div className="flex items-center gap-2">
                <Diamond type={r.type} />
                <span className="serif-label">{cap(r.type)}</span>
              </div>
              {r.value === null ? (
                <div className="mt-2">
                  <Tag>unknown</Tag>
                </div>
              ) : (
                <>
                  <div className="tabular mt-2 font-mono text-3xl leading-none text-ink">
                    {r.value}
                    <span className="text-base text-ink-mute">/{r.max}</span>
                  </div>
                  <div className="tabular mt-1.5 font-mono text-sm" style={{ color: edge }}>
                    {under ? `−${fmt(r.underCap!)} under` : over > 0 ? `+${fmt(over)} over` : 'capped'}
                  </div>
                </>
              )}
            </div>
          )
        })}
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
    <aside data-surface="data" className="card border-warn/50" aria-label="Tree data is behind">
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
