'use client'

import { gsap, registerGsap, ScrollTrigger } from '@/lib/gsap'
import { ReactLenis, useLenis } from 'lenis/react'
import { useEffect, type ReactNode } from 'react'

import 'lenis/dist/lenis.css'

registerGsap()

/**
 * Lenis runs on GSAP's ticker instead of its own rAF, so scroll position and every
 * ScrollTrigger (pins especially) update in the same frame. Two loops out of phase
 * put a pinned element a frame behind the scroll, which reads as a jolt at the pin.
 */
function ScrollTriggerLenisBridge() {
  const lenis = useLenis()

  useEffect(() => {
    if (!lenis) return

    const raf = (time: number) => lenis.raf(time * 1000)

    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)

    return () => {
      lenis.off('scroll', ScrollTrigger.update)
      gsap.ticker.remove(raf)
    }
  }, [lenis])

  return null
}

export default function SmoothScroll({ children }: { children: ReactNode }) {
  return (
    <ReactLenis root options={{ lerp: 0.1, duration: 1.2, smoothWheel: true, autoRaf: false }}>
      <ScrollTriggerLenisBridge />
      {children}
    </ReactLenis>
  )
}
