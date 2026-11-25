'use client'

/**
 * The character sheet (Batch 1): the code decoded into the sections of poe.ninja's old character page. Every figure is
 * a field with its provenance, or "missing" with the reason, so no category is ever blank. The plain view lists the
 * sections; Pro detail adds roll ranges, tiers and every PlayerStat the code carries.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  buildCharacterOutline,
  analyzeItem,
  readPobSnapshotFromCode,
  type Analysis,
  type CharacterOutline,
  type ItemAnalysis,
  type OutlineConfigMode,
  type OutlineBox,
  type OutlineField,
  type OutlineItem,
  type PobSnapshot,
} from '@poe2/core'
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge'
import { ProToggle } from '@/components/shared/ProToggle'
import { usePrefs } from '@/hooks/usePrefs'
import type { ModTiersState } from '@/lib/useModTiers'
import type { PassiveTreeState } from '@/lib/usePassiveTree'

/** What the sheet needs to know about the paste behind the character. */
export interface OutlineInput {
  code: string
  box: OutlineBox
  config: OutlineConfigMode
  name: string | null
}

const fmt = (v: unknown): string =>
  typeof v === 'number' ? v.toLocaleString('en-US', { maximumFractionDigits: 2 }) : String(v)

function valueText(f: OutlineField<unknown>): string {
  if (f.provenance === 'missing') return `missing: ${(f as { reason: string }).reason}`
  const v = f.value
  if (v && typeof v === 'object' && 'min' in v) {
    const r = v as { min: number; max: number; roll: number }
    return `${r.min} to ${r.max}, rolled ${Math.round(r.roll * 100)}% of the way`
  }
  return `${fmt(v)}${f.unit ? (f.unit === '%' || f.unit === 'm' ? f.unit : ` ${f.unit}`) : ''}`
}

function Field({ f, label }: { f: OutlineField<unknown>; label?: string }) {
  const missing = f.provenance === 'missing'
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-line/60 py-1.5 text-sm last:border-b-0">
      <dt className="text-ink-dim">{label ?? f.label}</dt>
      <dd
        data-outline-field={f.key}
        data-provenance={f.provenance}
        className={`tabular flex min-w-0 flex-wrap items-center justify-end gap-2 ${missing ? 'text-ink-mute' : 'text-ink'}`}
      >
        <span className="min-w-0 break-words">{valueText(f)}</span>
        {missing ? null : <ProvenanceBadge provenance={f.provenance} />}
      </dd>
    </div>
  )
}

function Group({ id, title, note, children }: { id: string; title: string; note?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="card p-4 sm:p-5">
      <h3 id={`${id}-title`} className="text-sm font-semibold text-ink">
        {title}
      </h3>
      {note ? <p className="mt-1 text-xs leading-relaxed text-ink-dim">{note}</p> : null}
      <dl className="mt-2">{children}</dl>
    </section>
  )
}

function Fields({ fields }: { fields: OutlineField<unknown>[] }) {
  return (
    <>
      {fields.map((f) => (
        <Field key={f.key} f={f} />
      ))}
    </>
  )
}

function ItemCard({ item, pro }: { item: OutlineItem; pro: boolean }) {
  return (
    <li className="border-b border-line/60 py-2 last:border-b-0">
      <p className="text-sm text-ink">
        <span className="text-ink-dim">{item.slot}: </span>
        <span data-outline-field={item.name.key} data-provenance={item.name.provenance}>
          {valueText(item.name)}
        </span>
        {item.base.provenance !== 'missing' && item.base.value !== item.name.value ? (
          <span className="text-ink-mute"> · {valueText(item.base)}</span>
        ) : null}
        {item.corrupted ? <span className="text-danger"> · corrupted</span> : null}
      </p>
      <ul className="mt-1 space-y-0.5 pl-3 text-xs">
        {item.lines.map((l) => (
          <li key={l.text.key} className="text-ink-dim">
            <span data-outline-field={l.text.key} data-provenance={l.text.provenance}>
              {valueText(l.text)}
            </span>
            {pro ? (
              <>
                {' '}
                <span data-outline-field={l.range.key} data-provenance={l.range.provenance} className="text-ink-mute">
                  [{valueText(l.range)}]
                </span>{' '}
                <span data-outline-field={l.tier.key} data-provenance={l.tier.provenance} className="text-ink-mute">
                  [{l.tier.provenance === 'missing' ? valueText(l.tier) : `tier ${l.tier.value}`}]
                </span>
              </>
            ) : null}
          </li>
        ))}
      </ul>
    </li>
  )
}

export function CharacterSheet({
  input,
  analysis,
  tiersState,
  treeState,
}: {
  input: OutlineInput | null
  analysis: Analysis
  tiersState: ModTiersState
  treeState: PassiveTreeState
}) {
  const { proDetail } = usePrefs()
  const [snap, setSnap] = useState<PobSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const code = input?.code ?? null

  useEffect(() => {
    if (!code) return
    let live = true
    void readPobSnapshotFromCode(code).then(
      (s) => live && setSnap(s),
      (e: Error) => live && setError(e.message),
    )
    return () => {
      live = false
    }
  }, [code])

  const tree = treeState.status === 'ready' ? treeState.tree : null
  const items = useMemo<ItemAnalysis[] | null>(
    () =>
      tiersState.status === 'ready'
        ? analysis.items.filter((i) => i.active).map((i) => analyzeItem(i, tiersState.tiers, analysis.defense))
        : null,
    [tiersState, analysis],
  )
  const outline = useMemo<CharacterOutline | null>(
    () => (snap && input ? buildCharacterOutline(snap, { box: input.box, config: input.config, tree, items, ...(input.name ? { name: input.name } : {}) }) : null),
    [snap, input, tree, items],
  )

  if (!input) {
    return (
      <p className="text-sm text-ink-dim" data-testid="sheet-needs-code">
        The sheet reads a Path of Building code. Paste one in either code box to see it.
      </p>
    )
  }
  if (error) return <p role="alert" className="text-sm text-danger">Could not read that code: {error}</p>
  if (!outline) return <p className="text-sm text-ink-dim">Reading the code…</p>

  const o = outline
  const unique = new Map(o.missing.map((m) => [m.key, m]))
  const missing = [...unique.values()].filter((m) => proDetail || !/\.(range|tier)$/.test(m.key))
  return (
    <div className="grid-cards" data-testid="character-sheet" data-box={o.box} data-config={o.configMode}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-ink-dim">
          {o.box === 'ninja' ? 'poe.ninja code' : 'PoB2 code'} · {o.configMode === 'ninja' ? 'poe.ninja config' : o.configMode === 'own' ? 'your own config' : 'no config'}
        </p>
        <ProToggle />
      </div>

      <Group id="sheet-identity" title="Character">
        <Fields fields={Object.values(o.identity)} />
      </Group>

      <Group id="sheet-config" title="What the numbers assume" note={o.config.statement}>
        {o.config.settings.length ? <Fields fields={o.config.settings} /> : null}
      </Group>

      <Group id="sheet-character" title="Stats: character">
        <Fields fields={o.character} />
      </Group>
      <Group id="sheet-defensive" title="Stats: defensive">
        <Fields fields={o.defensive} />
      </Group>
      <Group id="sheet-recovery" title="Stats: recovery">
        <Fields fields={o.recovery} />
      </Group>

      <Group id="sheet-main-skill" title="Main skill">
        <Fields fields={[o.mainSkill.name, ...o.mainSkill.stats, o.mainSkill.damageMix]} />
      </Group>

      <Group id="sheet-skills" title="Skills" note="DPS shows only where Path of Building computed it.">
        {o.skills.map((g) => (
          <div key={g.index} className="border-b border-line/60 py-1.5 last:border-b-0">
            <Field f={g.dps} label={g.label} />
            <p className="pb-1 text-xs text-ink-mute">
              {g.gems.map((x) => `${x.name}${x.level.value !== null ? ` ${x.level.value}` : ''}`).join(', ') || 'no gems'}
            </p>
          </div>
        ))}
      </Group>

      <section id="sheet-equipment" aria-labelledby="sheet-equipment-title" className="card p-4 sm:p-5">
        <h3 id="sheet-equipment-title" className="text-sm font-semibold text-ink">
          Equipment
        </h3>
        <ul className="mt-2">
          {o.equipment.map((it) => (
            <ItemCard key={it.slot} item={it} pro={proDetail} />
          ))}
        </ul>
      </section>
      {o.utility.length ? (
        <section id="sheet-utility" aria-labelledby="sheet-utility-title" className="card p-4 sm:p-5">
          <h3 id="sheet-utility-title" className="text-sm font-semibold text-ink">
            Flasks and charms
          </h3>
          <ul className="mt-2">
            {o.utility.map((it) => (
              <ItemCard key={it.slot} item={it} pro={proDetail} />
            ))}
          </ul>
        </section>
      ) : null}

      <Group id="sheet-tree" title="Passive tree" note="Shown, not analysed.">
        <Fields fields={[...o.tree.points, ...o.tree.keystones, ...o.tree.ascendancyNodes]} />
      </Group>
      <Group id="sheet-quests" title="Quest rewards">
        <Fields fields={o.config.questRewards} />
      </Group>

      <section id="sheet-missing" aria-labelledby="sheet-missing-title" className="card p-4 sm:p-5" data-testid="sheet-missing">
        <h3 id="sheet-missing-title" className="text-sm font-semibold text-ink">
          What&apos;s missing
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-ink-dim">A code does not carry these. None of them is guessed.</p>
        <ul className="mt-2 space-y-1 text-xs text-ink-dim">
          {missing.map((m) => (
            <li key={m.key}>
              <span className="text-ink">{m.label}:</span> {m.reason}
            </li>
          ))}
        </ul>
      </section>

      {proDetail ? (
        <section id="sheet-raw" aria-labelledby="sheet-raw-title" className="card p-4 sm:p-5">
          <h3 id="sheet-raw-title" className="text-sm font-semibold text-ink">
            Every PlayerStat in the code
          </h3>
          <dl className="mt-2 grid gap-x-6 sm:grid-cols-2">
            {Object.entries(snap!.playerStats).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-line/60 py-1 text-xs">
                <dt className="text-ink-dim">{k}</dt>
                <dd className="tabular text-ink">{fmt(v)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </div>
  )
}
