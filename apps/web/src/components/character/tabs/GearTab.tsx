'use client'

import { SpareToTradeCard } from '../OverviewCards'
import { GearTargets } from '../GearTargets'
import { Panel } from './Panel'
import type { PanelProps } from './types'

export default function GearTab({ analysis: a, tiersState }: PanelProps) {
  return (
    <Panel id="gear" title="Gear">
      <SpareToTradeCard analysis={a} />
      <GearTargets
        items={a.items}
        defense={a.defense}
        attribution={a.attribution}
        state={tiersState}
        league={a.identity.league}
      />
    </Panel>
  )
}
