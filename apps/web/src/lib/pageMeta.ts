import type { Metadata } from 'next'
import { BASE_PATH } from '@/lib/basePath'

const SITE = 'PoE2 Endgame Companion'
const ogImage = { url: `${BASE_PATH}/images/og-cover.jpg`, width: 1200, height: 630, alt: SITE }

/**
 * Per-route metadata. A page-level `openGraph` replaces the root one rather than merging, so the
 * type, site name and image are restated here; otherwise a shared link shows the site title for every route.
 */
export function pageMeta(name: string, description: string): Metadata {
  const title = `${name} — ${SITE}`
  return {
    title,
    description,
    openGraph: { type: 'website', url: './', siteName: SITE, title, description, images: [ogImage] },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage.url] },
  }
}
