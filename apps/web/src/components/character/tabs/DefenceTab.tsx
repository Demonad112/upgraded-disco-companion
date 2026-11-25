'use client'

import { defenceAxis } from '@poe2/core'
import { DefensePanel } from '@/components/DefensePanel'
import { Headroom } from '@/components/Headroom'
import { DefenceAxisCard } from '../AxisReview'
import { DefencesGlance } from '../OverviewCards'
import { WhatIfPanel } from '../WhatIfPanel'
import { Panel } from './Panel'
import type { PanelProps } from './types'

export default function DefenceTab({ analysis: a, analysisOptions }: PanelProps) {
  return (
    <Panel id="defences" title="Defences">
      <DefenceAxisCard axis={defenceAxis(a.assessment, a.defense)} />
      <DefencesGlance analysis={a} />
      <DefensePanel d={a.defense} />
      <Headroom defense={a.defense} level={a.identity.level} />
      <WhatIfPanel analysis={a} options={analysisOptions} />
    </Panel>
  )
}
