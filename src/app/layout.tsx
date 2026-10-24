import Nav from '@/components/layout/Nav'
import Preloader from '@/components/preloader/Preloader'
import PageTransition from '@/components/providers/PageTransition'
import SmoothScroll from '@/components/providers/SmoothScroll'
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from '@/content/site'
import { monoFont, primaryFont } from '@/lib/fonts'
import type { Metadata, Viewport } from 'next'
import Script from 'next/script'

import '@/styles/globals/normalize.scss'
import '@/styles/globals/globals.scss'

// The share images, icons, manifest, robots and sitemap come from files in this folder;
// Next adds their tags itself.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  category: 'business',
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${primaryFont.variable} ${monoFont.variable}`}>
      <body>
        <Script id="scroll-reset" strategy="beforeInteractive">
          {`if('scrollRestoration' in history){history.scrollRestoration='manual';}window.scrollTo(0,0);`}
        </Script>
        <Script
          defer
          src="https://analytics.7labz.ai/script.js"
          data-website-id="70c06cec-f8db-4958-9bfa-e03b10389df5"
        />
        <SmoothScroll>
          <PageTransition aside={<Nav />}>{children}</PageTransition>
          <Preloader />
        </SmoothScroll>
      </body>
    </html>
  )
}
