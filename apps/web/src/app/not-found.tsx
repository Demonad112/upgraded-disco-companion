import type { Metadata } from 'next'
import { PageHeader } from '@/components/layout/PageHeader'
import { LostLinks } from '@/components/shared/LostLinks'

// Own description, no canonical and no og:url: the root layout's `./` would point crawlers and share cards at 404.html.
export const metadata: Metadata = {
  title: 'Page not found · PoE2 Endgame Companion',
  description: 'There is no page at this address. Go back to the character analysis, checklist, Atlas or Farm pages.',
  robots: { index: false, follow: true },
  alternates: { canonical: null },
  openGraph: { title: 'Page not found · PoE2 Endgame Companion', siteName: 'PoE2 Endgame Companion' },
}

/** Exported as 404.html; Cloudflare Pages serves it for any path that has no page. */
export default function NotFound() {
  return (
    <>
      <PageHeader
        eyebrow="404"
        title="Off the"
        accent="Atlas"
        description="There&apos;s no page at this address. It may have moved, so try one of these."
      />
      <LostLinks />
    </>
  )
}
