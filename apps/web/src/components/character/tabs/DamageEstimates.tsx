'use client'

/**
 * Batch 3.3: the Damage tab's per-skill rows. The main skill shows the code's own number (provenance `pob-export`);
 * the other skills show the text mini-calc's estimate, labelled "≈ est." and scaled by how close it came on the main
 * skill (the self-check). When the main skill is off by more than 25% the estimates are hidden, with the Full DPS
 * steps instead, and "show anyway" reveals them labelled unreliable. Under own/none config (`exactOnly`) no estimate
 * is made: only the main skill and the code's Full DPS rows are listed (success criterion 4).
 */

import { useEffect, useState } from 'react'
import { SupportCatalog, activeSkillSet, estimateOffence, linkCheck, readPobSnapshotFromCode, type OffenceData, type PobSkillData, type SelfCheckReport } from '@poe2/core'
import { Empty, fmt } from '@/components/ui'
import { loadDataFile } from '@/lib/useDataFile'

async function loadOffenceData(): Promise<{ data: OffenceData; catalog: SupportCatalog }> {
  const [bases, levels, skills, tree] = await Promise.all([
    loadDataFile<{ bases: OffenceData['bases'] }>('bases.json'),
    loadDataFile<{ actives: OffenceData['skillLevels'] }>('skill-levels.json'),
    loadDataFile<PobSkillData & { supports: OffenceData['supports'] }>('pob-skills.json'),
    loadDataFile<{ nodes: OffenceData['treeNodes'] }>('passive-tree.json'),
  ])
  return { catalog: new SupportCatalog(skills), data: {
    bases: bases.bases,
    skillLevels: levels.actives,
    skillTypes: skills.actives,
    supports: skills.supports,
    treeNodes: tree.nodes,
    defaultResist: { physical: 0, lightning: 50, cold: 50, fire: 50, chaos: 0 },
  } }
}

export function DamageEstimates({ code, exactOnly = false }: { code: string | null; exactOnly?: boolean }) {
  const [showAnyway, setShowAnyway] = useState(false)
  const [state, setState] = useState<{ status: 'loading' } | { status: 'error' } | { status: 'ready'; data: OffenceData; catalog: SupportCatalog; snap: Awaited<ReturnType<typeof readPobSnapshotFromCode>> }>({ status: 'loading' })

  useEffect(() => {
    if (!code) return
    let live = true
    Promise.all([readPobSnapshotFromCode(code), loadOffenceData()]).then(
      ([snap, { data, catalog }]) => live && setState({ status: 'ready', data, catalog, snap }),
      () => live && setState({ status: 'error' }),
    )
    return () => {
      live = false
    }
  }, [code])

  if (!code) return null
  if (state.status === 'loading') return <p className="text-sm text-ink-dim" data-estimates="loading">Reading every skill…</p>
  if (state.status === 'error') return <Empty>Skill estimates could not be read from this code.</Empty>
  const report: SelfCheckReport = estimateOffence(state.snap, state.data, { showAnyway, exactOnly })
  const links = linkCheck(activeSkillSet(state.snap)?.groups ?? [], state.catalog).findings
  return (
    <section className="card p-4 sm:p-5" data-estimates={report.state} aria-labelledby="skill-estimates-title">
      <h3 id="skill-estimates-title" className="h3">Damage per skill</h3>
      <ul className="mt-2">
        {report.skills.map((s) => (
          <li key={s.group} className="flex items-start justify-between gap-3 border-b border-line/60 py-1.5 last:border-b-0" data-skill-row={s.name} data-main={s.group === report.mainGroup || undefined}>
            <div className="min-w-0">
              <div className="text-sm text-ink">{s.name}</div>
              {s.value === null && s.reason ? <p className="text-xs leading-relaxed text-ink-mute">{s.reason}</p> : null}
              {s.value !== null && s.mix?.length ? (
                <p className="tabular text-xs leading-relaxed text-ink-mute" data-damage-mix data-provenance="estimate">
                  {s.mix.map((m) => `${m.type[0]!.toUpperCase()}${m.type.slice(1)} ${Math.round(m.percent)}%`).join(' · ')} <span>(≈ est. mix)</span>
                </p>
              ) : null}
            </div>
            <div className="text-right">
              {s.value !== null ? <div className="tabular font-mono text-sm text-ink" data-outline-field data-provenance={s.label ? 'estimate' : 'pob-export'}>{fmt(Math.round(s.value))}</div> : <div className="text-xs text-ink-mute">not shown</div>}
              {s.label ? <div className="text-[length:var(--fs-11)] text-ink-mute">{s.label}</div> : null}
            </div>
          </li>
        ))}
      </ul>
      {links.length ? (
        <ul className="mt-3 space-y-1" aria-label="Gem links to fix" data-link-check>
          {links.map((f) => (
            <li key={`${f.group}-${f.support}`} className="text-sm leading-relaxed text-ink">{f.text}</li>
          ))}
        </ul>
      ) : null}
      {report.fullDpsHint ? (
        <div className="mt-3 text-xs leading-relaxed text-ink-dim" data-full-dps-hint>
          <p>{report.fullDpsHint}</p>
          {report.state === 'hidden' ? <button type="button" className="mt-1 underline" onClick={() => setShowAnyway(true)}>Show anyway</button> : null}
        </div>
      ) : null}
    </section>
  )
}
