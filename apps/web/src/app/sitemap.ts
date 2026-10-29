import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://upgraded-disco-companion.pages.dev'

const ROUTES = ['', 'checklist', 'atlas', 'dashboard', 'character', 'methodology', 'whats-new']

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map((route) => ({ url: `${siteUrl}${basePath}/${route ? `${route}/` : ''}` }))
}
