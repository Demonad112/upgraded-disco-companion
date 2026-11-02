import type { Metadata } from 'next'
import { PageHeader } from '@/components/layout/PageHeader'
import { ManualPriceCheck } from '@/components/trade/ManualPriceCheck'

export const metadata: Metadata = {
  title: 'Manual price check — PoE2 Endgame Companion',
  description: 'Build a trade-site search link from a base type and mod filters. Nothing is priced here.',
}

export default function TradePage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Trade"
        title="Manual price"
        accent="check"
        description="Pick a base and mods, then open the search on the trade site. This page builds the link; it does not fetch or estimate prices."
      />
      <ManualPriceCheck />
    </div>
  )
}
