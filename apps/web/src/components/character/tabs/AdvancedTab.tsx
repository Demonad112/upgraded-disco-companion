'use client'

import { Accordion } from '@/components/shared/Accordion'
import { PanelControls } from '@/components/shared/PanelControls'
import { StatusChip } from '@/components/shared/Instruments'
import { Attribution } from '@/components/Attribution'
import { AuditPanel } from '@/components/AuditPanel'
import { Reconciliation } from '@/components/Reconciliation'
import { TreePanel } from '@/components/tree/TreePanel'
import { CharacterNotes } from '../CharacterNotes'
import { TreeDataNote } from '../OverviewCards'
import { Panel } from './Panel'
import type { PanelProps } from './types'

export default function AdvancedTab({ analysis: a, tiersState, treeState }: PanelProps) {
  const treeForNote = treeState.status === 'ready' ? treeState.tree : null
  const overcapped = a.attribution.stats.filter((st) => st.overcap > 0)
  return (
    <Panel id="advanced" title="Advanced">
      <TreeDataNote analysis={a} tree={treeForNote} />
      <div className="flex items-center">
        <PanelControls targetId="checks-list" />
      </div>
      <div id="checks-list" className="grid-cards">
        <Accordion id="detail-checks" title="Detail checks" summary="Sockets, gem quality, jewels and spare attributes">
          <AuditPanel model={a.model} pobStats={a.pobStats} state={tiersState} bare />
        </Accordion>
        <Accordion id="character-notes" title="Ailments and inactive weapon set" summary="Immunities, main-skill note, idle gear">
          <CharacterNotes analysis={a} />
        </Accordion>
        <Accordion id="passive-tree" title="Passive tree" summary={`${a.passives.counts.passives} points allocated`} lazy>
          <TreePanel allocation={a.passives} state={treeState} bare />
        </Accordion>
        {a.reconciliation ? (
          <Accordion
            id="reconciliation"
            title="Cross-validation"
            summary={`${a.reconciliation.matches} agree${a.reconciliation.minor ? ` · ${a.reconciliation.minor} minor` : ''}${a.reconciliation.unmapped ? ` · ${a.reconciliation.unmapped} unmapped` : ''}`}
            badge={a.reconciliation.major > 0 ? <StatusChip tone="danger">{a.reconciliation.major} major</StatusChip> : undefined}
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
    </Panel>
  )
}
