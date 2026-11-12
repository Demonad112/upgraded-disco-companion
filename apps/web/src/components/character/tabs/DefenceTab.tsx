'use client'

import { DefensePanel } from '@/components/DefensePanel'
import { Headroom } from '@/components/Headroom'
import { DefencesGlance } from '../OverviewCards'
import { WhatIfPanel } from '../WhatIfPanel'
import { Panel } from './Panel'
import type { PanelProps } from './types'

export default function DefenceTab({ analysis: a, analysisOptions }: PanelProps) {
  return (
    <Panel id="defences" title="Defences">
      <DefencesGlance analysis={a} />
      <DefensePanel d={a.defense} />
      <Headroom defense={a.defense} level={a.identity.level} />
      <WhatIfPanel analysis={a} options={analysisOptions} />
    </Panel>
  )
}
