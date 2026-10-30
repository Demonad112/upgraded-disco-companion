import type { Metadata } from 'next'
import { PageHeader } from '@/components/layout/PageHeader'
import { LostLinks } from '@/components/shared/LostLinks'

export const metadata: Metadata = { title: 'Page not found · PoE2 Endgame Companion', robots: { index: false } }

/** Exported as 404.html; Cloudflare Pages serves it for any path that has no page. */
export default function NotFound() {
  return (
    <>
      <PageHeader
        eyebrow="404"
        title="Off the"
        accent="Atlas"
        description="There is no page at this address. It may have moved when the site was reorganised; one of these is probably what you were after."
      />
      <LostLinks />
    </>
  )
}
