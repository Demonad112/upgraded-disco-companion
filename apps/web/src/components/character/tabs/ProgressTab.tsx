'use client'

import { snapshotKey } from '@poe2/core'
import { Accordion } from '@/components/shared/Accordion'
import { StatusChip } from '@/components/shared/Instruments'
import { Chat } from '@/components/Chat'
import { Progress } from '@/components/Progress'
import { CompareCharacters } from '../CompareCharacters'
import { Panel } from './Panel'
import type { PanelProps } from './types'
import type { CharacterHistory } from '@/lib/useCharacterHistory'
import { Stat } from '../../ui'
import { ImportTrail } from '../ImportTrail'

/** What moved since the last import, as four tiles. Opens the tab the way Defences opens with its glance card. */
function SinceLastImport({ history }: { history: CharacterHistory }) {
  const { snapshots, diff } = history
  const better = diff?.changes.filter((c) => c.improved).length ?? 0
  const worse = diff ? diff.changes.length - better : 0
  return (
    <section data-surface="data" className="card min-w-0" aria-labelledby="since-last-title">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 id="since-last-title" className="h3">
          Since last import
        </h3>
        <span className="text-xs text-ink-mute">Saved in this browser</span>
      </div>
      <div className="mt-4">
        <ImportTrail history={history} />
      </div>
      <div className="progress-tiles mt-4">
        <Stat label="Imports saved" value={String(snapshots.length)} />
        <Stat label="Figures moved" value={diff ? String(diff.changes.length) : '—'} />
        <Stat label="Got better" value={diff ? String(better) : '—'} tone={better ? 'good' : 'default'} />
        <Stat label="Got worse" value={diff ? String(worse) : '—'} tone={worse ? 'danger' : 'default'} />
      </div>
      {!diff ? (
        <p className="mt-3 text-sm text-ink-dim">Play a while, then import again to see what moved.</p>
      ) : null}
    </section>
  )
}

export default function ProgressTab({ analysis: a, history }: PanelProps) {
  return (
    <Panel id="progress" title="Progress">
      <SinceLastImport history={history} />
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
