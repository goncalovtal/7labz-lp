import Nav from '@/components/layout/Nav'
import Preloader from '@/components/preloader/Preloader'
import PageTransition from '@/components/providers/PageTransition'
import SmoothScroll from '@/components/providers/SmoothScroll'
import { monoFont, primaryFont } from '@/lib/fonts'
import type { Metadata, Viewport } from 'next'
import Script from 'next/script'

import '@/styles/globals/normalize.scss'
import '@/styles/globals/globals.scss'

export const metadata: Metadata = {
  title: {
    default: '7labz',
    template: '%s | 7labz',
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${primaryFont.variable} ${monoFont.variable}`}>
      <body>
        <Script id="scroll-reset" strategy="beforeInteractive">
          {`if('scrollRestoration' in history){history.scrollRestoration='manual';}window.scrollTo(0,0);`}
        </Script>
        <SmoothScroll>
          <PageTransition aside={<Nav />}>{children}</PageTransition>
          <Preloader />
        </SmoothScroll>
      </body>
    </html>
  )
}
