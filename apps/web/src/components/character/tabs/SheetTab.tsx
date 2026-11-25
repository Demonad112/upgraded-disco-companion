'use client'

import { useGearReview } from '@/lib/useGearReview'
import { OverCapShares } from '../AxisReview'
import { CharacterSheet } from '../CharacterSheet'
import { Panel } from './Panel'
import type { PanelProps } from './types'

export default function SheetTab({ analysis, tiersState, treeState, catalogState, outlineInput = null }: PanelProps) {
  // Over-cap spending reads only the items and resistances, so it does not wait for the skill catalogue.
  const { review } = useGearReview(analysis, tiersState, catalogState)
  return (
    <Panel id="sheet" title="Sheet">
      <CharacterSheet input={outlineInput} analysis={analysis} tiersState={tiersState} treeState={treeState} />
      <OverCapShares review={review} />
    </Panel>
  )
}
