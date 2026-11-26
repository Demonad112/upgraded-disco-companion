'use client'

import { Accordion } from '@/components/shared/Accordion'
import { DamageReview } from '@/components/DamageReview'
import { DpsMatrix } from '@/components/DpsMatrix'
import { DamageEstimates } from './DamageEstimates'
import { Panel } from './Panel'
import type { PanelProps } from './types'

export default function DamageTab({ analysis: a, tiersState, catalogState, outlineInput }: PanelProps) {
  return (
    <Panel id="damage" title="Damage">
      <DpsMatrix
        dps={a.dps}
        pobConfig={a.pobConfig}
        configApplies={a.reconciliation?.checks.find((c) => c.stat.startsWith('dps:'))?.severity === 'match'}
      />
      {/* Keyed on the code: a new code starts from loading with "show anyway" off. A poe.ninja code is always the
          poe.ninja baseline; a PoB2 code under its own or no config gets exact rows only (criterion 4). */}
      <DamageEstimates
        key={outlineInput?.code ?? ''}
        code={outlineInput?.code ?? null}
        exactOnly={outlineInput?.box === 'pob' && outlineInput.config !== 'ninja'}
      />
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
    </Panel>
  )
}
