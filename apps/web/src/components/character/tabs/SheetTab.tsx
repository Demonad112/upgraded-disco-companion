'use client'

import { CharacterSheet } from '../CharacterSheet'
import { Panel } from './Panel'
import type { PanelProps } from './types'

export default function SheetTab({ analysis, tiersState, treeState, outlineInput = null }: PanelProps) {
  return (
    <Panel id="sheet" title="Sheet">
      <CharacterSheet input={outlineInput} analysis={analysis} tiersState={tiersState} treeState={treeState} />
    </Panel>
  )
}
