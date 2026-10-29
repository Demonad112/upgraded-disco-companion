import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://upgraded-disco-companion.pages.dev'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${siteUrl}${basePath}/sitemap.xml`,
  }
}
