'use client'

// The character page below the import box: every panel that needs an analysis. Loaded with next/dynamic from
// app/character/page.tsx, so none of it is in the page's first load.
import { ProToggle } from '@/components/shared/ProToggle'
import type { ReactNode } from 'react'
import { snapshotKey, type Analysis, type AnalyzeOptions, type PobAnalysis } from '@poe2/core'
import { Accordion } from '@/components/shared/Accordion'
import { PanelControls } from '@/components/shared/PanelControls'
import { StatusChip } from '@/components/shared/Instruments'
import { ScrollSpyNav } from '@/components/shared/ScrollSpyNav'
import { Attribution } from '@/components/Attribution'
import { AuditPanel } from '@/components/AuditPanel'
import { BuildScore } from '@/components/BuildScore'
import { Chat } from '@/components/Chat'
import { DamageReview } from '@/components/DamageReview'
import { DefensePanel } from '@/components/DefensePanel'
import { DpsMatrix } from '@/components/DpsMatrix'
import { Headroom } from '@/components/Headroom'
import { PobAnalysisView } from '@/components/PobAnalysisView'
import { Progress } from '@/components/Progress'
import { Reconciliation } from '@/components/Reconciliation'
import { Recommendations } from '@/components/Recommendations'
import { TreePanel } from '@/components/tree/TreePanel'
import { ChangedSincePanel } from './ChangedSincePanel'
import { CharacterNotes } from './CharacterNotes'
import { CompareCharacters } from './CompareCharacters'
import { CopyLink } from './CopyLink'
import { GearTargets } from './GearTargets'
import { DefencesGlance, SpareAndChanges, TreeDataNote } from './OverviewCards'
import { ShareCard } from './ShareCard'
import { Showcase } from './Showcase'
import { TopFixes } from './TopFixes'
import { WhatIfPanel } from './WhatIfPanel'
import type { CharacterHistory } from '@/lib/useCharacterHistory'
import type { ModTiersState } from '@/lib/useModTiers'
import type { PassiveTreeState } from '@/lib/usePassiveTree'
import type { SupportCatalogState } from '@/lib/useSupportCatalog'

/** The character page's sections, in tab-bar and DOM order. */
const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'findings', label: 'Findings' },
  { id: 'defences', label: 'Defences' },
  { id: 'damage', label: 'Damage' },
  { id: 'gear', label: 'Gear' },
  { id: 'progress', label: 'Progress' },
  // "Checks", not "Advanced": the phone tab bar has no room for the longer word (it widened the page by 12 px).
  { id: 'advanced', label: 'Checks' },
]

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="page-section" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="section-title">
        {title}
      </h2>
      <div className="grid-cards">{children}</div>
    </section>
  )
}


export function CharacterResults({
  analysis: a,
  sourceUrl,
  history,
  tiersState,
  treeState,
  catalogState,
  analysisOptions,
}: {
  analysis: Analysis
  sourceUrl: string | null
  history: CharacterHistory
  tiersState: ModTiersState
  treeState: PassiveTreeState
  catalogState: SupportCatalogState
  analysisOptions: AnalyzeOptions
}) {
  const treeForNote = treeState.status === 'ready' ? treeState.tree : null
  const overcapped = a.attribution.stats.filter((st) => st.overcap > 0)

  return (
    <>
      <ScrollSpyNav
        label="On this page"
        items={SECTIONS.map((s) =>
          // The findings count is the cards shown; a sound build shows a summary instead, so no count.
          s.id === 'findings' && !a.recommendations.buildIsSound
            ? { ...s, count: a.recommendations.recommendations.filter((r) => r.category !== 'question').length }
            : s
        )}
      />

      <Section id="overview" title="Overview">
        <Showcase analysis={a}>
          {sourceUrl ? <CopyLink url={sourceUrl} name={a.identity.name} /> : null}
          <ShareCard analysis={a} sourceUrl={sourceUrl} diff={history.diff} />
        </Showcase>
        <TopFixes report={a.recommendations} league={a.identity.league} />
        <ChangedSincePanel analysis={a} snapshots={history.snapshots} />
        {a.warnings.map((w) => (
          <p key={w} data-surface="data" className="card border-warn/50 text-xs leading-relaxed text-warn">
            {w}
          </p>
        ))}
        <SpareAndChanges analysis={a} diff={history.diff} />
        <DefencesGlance analysis={a} />
        <TreeDataNote analysis={a} tree={treeForNote} />
        <BuildScore assessment={a.assessment} keystones={a.keystones} />
      </Section>

      <Section id="findings" title="Findings">
        {/* Pro detail opens every finding's measured reasoning, cost and evidence by default. */}
        <div className="flex justify-end">
          <ProToggle />
        </div>
        <Recommendations report={a.recommendations} />
      </Section>

      <Section id="defences" title="Defences">
        <DefensePanel d={a.defense} />
        <Headroom defense={a.defense} level={a.identity.level} />
      </Section>

      <Section id="damage" title="Damage">
        <Accordion
          id="damage-review"
          title="Supports and gear changes for this skill"
          summary={
            a.dps.primary
              ? `Support-gem swaps and damage-mod upgrades for ${a.dps.primary.name}`
              : 'Support-gem swaps and damage-mod upgrades'
          }
          lazy
        >
          <DamageReview
            dps={a.dps}
            model={a.model}
            items={a.items}
            defense={a.defense}
            tiersState={tiersState}
            catalogState={catalogState}
            bare
          />
        </Accordion>
      </Section>

      <Section id="gear" title="Gear">
        <GearTargets
          items={a.items}
          defense={a.defense}
          attribution={a.attribution}
          state={tiersState}
          league={a.identity.league}
        />
      </Section>


      <Section id="progress" title="Progress">
        <Accordion
          id="progress-history"
          title="Trends across imports"
          summary={
            history.diff
              ? `${history.diff.changes.length} figure${history.diff.changes.length === 1 ? '' : 's'} moved since your last import`
              : 'Import again after playing to see what moved'
          }
          badge={
            history.diff?.newlyUncapped.length ? (
              <StatusChip tone="danger">Dropped below cap</StatusChip>
            ) : history.diff?.newlyCapped.length ? (
              <StatusChip tone="good">Capped</StatusChip>
            ) : undefined
          }
        >
          <Progress history={history} bare />
        </Accordion>
        <Accordion
          id="compare"
          title="Compare with another character"
          summary="Side by side with a character you imported before, from saved snapshots"
        >
          <CompareCharacters currentKey={snapshotKey(a.identity)} currentName={a.identity.name} bare />
        </Accordion>
        <Chat analysis={a} />
      </Section>

      <section id="advanced" className="page-section" aria-labelledby="advanced-title">
        <details id="advanced-fold" className="group">
          <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden className="size-3.5 shrink-0 text-ink-mute transition-transform group-open:rotate-90">
              <path d="M7.5 5l5 5-5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h2 id="advanced-title" className="section-title !mb-0">
              Advanced
            </h2>
            <span className="text-xs text-ink-mute">Damage table, what-if sliders, detail checks</span>
          </summary>
          <div className="mt-4 grid-cards">
            <DpsMatrix
              dps={a.dps}
              pobConfig={a.pobConfig}
              configApplies={a.reconciliation?.checks.find((c) => c.stat.startsWith('dps:'))?.severity === 'match'}
            />
            <WhatIfPanel analysis={a} options={analysisOptions} />
            <div className="flex items-center">
              <PanelControls targetId="checks-list" />
            </div>
            <div id="checks-list" className="grid-cards">
              <Accordion
                id="detail-checks"
                title="Detail checks"
                summary="Sockets, gem quality, jewels and spare attributes"
              >
                <AuditPanel model={a.model} pobStats={a.pobStats} state={tiersState} bare />
              </Accordion>
              <Accordion id="character-notes" title="Ailments and inactive weapon set" summary="Immunities, main-skill note, idle gear">
                <CharacterNotes analysis={a} />
              </Accordion>
              <Accordion
                id="passive-tree"
                title="Passive tree"
                summary={`${a.passives.counts.passives} points allocated`}
                lazy
              >
                <TreePanel allocation={a.passives} state={treeState} bare />
              </Accordion>
              {a.reconciliation ? (
                <Accordion
                  id="reconciliation"
                  title="Cross-validation"
                  summary={`${a.reconciliation.matches} agree${a.reconciliation.minor ? ` · ${a.reconciliation.minor} minor` : ''}${a.reconciliation.unmapped ? ` · ${a.reconciliation.unmapped} unmapped` : ''}`}
                  badge={
                    a.reconciliation.major > 0 ? <StatusChip tone="danger">{a.reconciliation.major} major</StatusChip> : undefined
                  }
                >
                  <Reconciliation report={a.reconciliation} bare />
                </Accordion>
              ) : null}
            </div>
            <Accordion
              id="attribution"
              title="What each item is holding up"
              summary={`${a.attribution.items.length} item${a.attribution.items.length === 1 ? '' : 's'} attributed`}
              badge={overcapped.length > 0 ? <StatusChip tone="muted">{overcapped.length} over cap</StatusChip> : undefined}
            >
              <Attribution report={a.attribution} bare />
            </Accordion>
          </div>
        </details>
      </section>
    </>
  )
}

/** A Path of Building import: fewer panels, every figure real. */
export function PobResults({ analysis }: { analysis: PobAnalysis }) {
  return (
    <div className="space-y-4">
      <PobAnalysisView analysis={analysis} />
      <Chat pob={analysis} />
    </div>
  )
}
