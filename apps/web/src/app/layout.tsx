import type { Metadata, Viewport } from 'next'
import { Cinzel, Crimson_Pro, EB_Garamond, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import { ServiceWorker } from '@/components/ServiceWorker'
import { NavBar } from '@/components/layout/NavBar'
import { Footer } from '@/components/layout/Footer'
import { PatchVersionBanner } from '@/components/layout/PatchVersionBanner'
import { CommandPalette } from '@/components/layout/CommandPalette'
import { HashHighlight } from '@/components/layout/HashHighlight'
import { FxLayer } from '@/components/fx/FxLayer'
import { PersistedStateProvider } from '@/hooks/usePersistedState'
import { bannerBootstrap } from '@/lib/bannerDismiss'
import { COMPACT_BOOTSTRAP } from '@/lib/compactMode'
import { CURRENT_PATCH } from '@/lib/constants'

// Cinzel for headings, Crimson Pro for reading, IBM Plex Mono for labels and
// figures. next/font self-hosts them at build time (CSP: font-src 'self') with
// font-display: swap and preloads the faces used above the fold. EB Garamond
// is kept only for the home title, which is deliberately unchanged.
const cinzel = Cinzel({ variable: '--font-cinzel', subsets: ['latin'], weight: ['500', '600', '700'], display: 'swap' })
const crimson = Crimson_Pro({ variable: '--font-crimson', subsets: ['latin'], weight: ['400', '500', '600'], display: 'swap' })
const plexMono = IBM_Plex_Mono({ variable: '--font-plex', subsets: ['latin'], weight: ['400', '500'], display: 'swap' })
const garamond = EB_Garamond({ variable: '--font-garamond', subsets: ['latin'], weight: ['500', '600', '700'], display: 'swap' })

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

// Absolute base for the og/twitter image URLs, which crawlers will not resolve
// relative to the page.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://upgraded-disco-companion.pages.dev'
const title = 'PoE2 Endgame Companion'
const description =
  'Path of Exile 2 character analysis grounded in poe.ninja’s own computed data — ranked, quantified, evidence-backed findings — plus an endgame progression checklist, Atlas planner and farming dashboard.'
const ogImage = { url: `${basePath}/images/og-cover.jpg`, width: 1200, height: 630, alt: title }

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  manifest: `${basePath}/manifest.webmanifest`,
  icons: {
    icon: [
      { url: `${basePath}/icon.svg`, type: 'image/svg+xml' },
      { url: `${basePath}/icon-192.png`, sizes: '192x192', type: 'image/png' },
      { url: `${basePath}/favicon.ico`, sizes: 'any' },
    ],
    apple: [{ url: `${basePath}/apple-touch-icon.png`, sizes: '180x180', type: 'image/png' }],
  },
  openGraph: { type: 'website', siteName: title, title, description, images: [ogImage] },
  twitter: { card: 'summary_large_image', title, description, images: [ogImage.url] },
  applicationName: 'PoE2 Endgame Companion',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'PoE2 Companion' },
}

export const viewport: Viewport = {
  themeColor: '#08080a',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cinzel.variable} ${crimson.variable} ${plexMono.variable} ${garamond.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bannerBootstrap(CURRENT_PATCH) }} />
        <script dangerouslySetInnerHTML={{ __html: COMPACT_BOOTSTRAP }} />
      </head>
      <body className="antialiased">
        <ServiceWorker />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-surface-raised focus:px-3 focus:py-2 focus:text-sm"
        >
          Skip to content
        </a>
        {/* Progress for the reference routes is client-side only; the provider
            reads localStorage through useSyncExternalStore so a static export
            renders identically before and after hydration. */}
        <PersistedStateProvider>
          {/* One wrapper for the whole page, so the canvases behind it run the
              full document height. Banner, header, main and footer share the
              .shell width and side padding. */}
          <div id="fx-root" className="relative isolate flex min-h-screen flex-col">
            <FxLayer />
            <PatchVersionBanner />
            <NavBar />
            <main id="main" className="shell relative flex-1 py-8 sm:py-12">
              {children}
            </main>
            <Footer />
          </div>
          <CommandPalette />
          <HashHighlight />
        </PersistedStateProvider>
      </body>
    </html>
  )
}
