'use client'

import { snapshotKey } from '@poe2/core'
import { Accordion } from '@/components/shared/Accordion'
import { StatusChip } from '@/components/shared/Instruments'
import { Chat } from '@/components/Chat'
import { Progress } from '@/components/Progress'
import { CompareCharacters } from '../CompareCharacters'
import { Panel } from './Panel'
import type { PanelProps } from './types'

export default function ProgressTab({ analysis: a, history }: PanelProps) {
  return (
    <Panel id="progress" title="Progress">
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
    </Panel>
  )
}
