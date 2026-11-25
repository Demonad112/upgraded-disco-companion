'use client'

import { CharacterSheet, type OutlineInput } from '../CharacterSheet'
import { Panel } from './Panel'
import type { PanelProps } from './types'

export default function SheetTab({ analysis, tiersState, treeState, outlineInput }: PanelProps & { outlineInput: OutlineInput | null }) {
  return (
    <Panel id="sheet" title="Sheet">
      <CharacterSheet input={outlineInput} analysis={analysis} tiersState={tiersState} treeState={treeState} />
    </Panel>
  )
}
