import { gsap } from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

let registered = false

/** Registers plugins and the house eases once per page load. Safe to call from any client effect. */
export function registerGsap() {
  if (registered || typeof window === 'undefined') return
  gsap.registerPlugin(ScrollTrigger, CustomEase, SplitText)
  CustomEase.create('osmo', '0.625, 0.05, 0, 1')
  CustomEase.create('zoom', '0.55, 0, 0.15, 1')
  gsap.defaults({ ease: 'osmo' })
  registered = true
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export { CustomEase, gsap, ScrollTrigger, SplitText }
