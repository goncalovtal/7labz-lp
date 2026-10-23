import { GeistMono } from 'geist/font/mono'
import localFont from 'next/font/local'

// ALT Picaro ships in one weight only, so headings and body share it.
export const primaryFont = localFont({
  src: '../assets/fonts/ALTPicaro-Regular.woff2',
  weight: '400',
  style: 'normal',
  variable: '--font-picaro',
  display: 'swap',
})

export const monoFont = GeistMono
