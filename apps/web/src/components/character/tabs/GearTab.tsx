'use client'

import { useGearReview } from '@/lib/useGearReview'
import { GearReviewCard } from '../AxisReview'
import { SpareToTradeCard } from '../OverviewCards'
import { GearTargets } from '../GearTargets'
import { Panel } from './Panel'
import type { PanelProps } from './types'

export default function GearTab({ analysis: a, tiersState, catalogState }: PanelProps) {
  const { review, ready } = useGearReview(a, tiersState, catalogState)
  return (
    <Panel id="gear" title="Gear">
      <GearReviewCard review={review} ready={ready} />
      <SpareToTradeCard analysis={a} />
      <GearTargets
        analysis={a}
        items={a.items}
        defense={a.defense}
        attribution={a.attribution}
        state={tiersState}
        league={a.identity.league}
      />
    </Panel>
  )
}
