import type { Metadata, Viewport } from 'next'
import { EB_Garamond, Geist_Mono, Inter } from 'next/font/google'
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

// Inter for everything read, EB Garamond for display (brand, titles), Geist Mono
// for figures. next/font self-hosts them at build time (CSP: font-src 'self').
const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'], preload: false })
const garamond = EB_Garamond({ variable: '--font-garamond', subsets: ['latin'], weight: ['500', '600', '700'] })

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
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#08080a' },
    { media: '(prefers-color-scheme: light)', color: '#f7f5f0' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

/**
 * Applied before paint so a stored light preference never flashes dark.
 */
const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem('poe2-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} ${garamond.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        <script dangerouslySetInnerHTML={{ __html: bannerBootstrap(CURRENT_PATCH) }} />
        <script dangerouslySetInnerHTML={{ __html: COMPACT_BOOTSTRAP }} />
      </head>
      <body className="font-sans antialiased">
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
          <PatchVersionBanner />
          <NavBar />
          {/* One page container for every route. The analyser used to carry
              its own, which is how two halves of a merged site end up at
              different widths on the same viewport. */}
          {/* The canvases sit behind the content inside this wrapper. */}
          <div id="fx-root" className="relative isolate">
            <FxLayer />
            <main id="main" className="relative mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
              {children}
            </main>
          </div>
          <Footer />
          <CommandPalette />
          <HashHighlight />
        </PersistedStateProvider>
      </body>
    </html>
  )
}
