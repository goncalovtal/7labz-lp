'use client'

import ApplyButton from '@/components/ui/ApplyButton'
import RollText from '@/components/ui/RollText'
import TransitionLink from '@/components/ui/TransitionLink'
import { gsap, prefersReducedMotion, registerGsap } from '@/lib/gsap'
import { LOGO_BOUNDS, LOGO_GLYPHS } from '@/lib/logo'
import { onPreloader } from '@/lib/preloader'
import { useEffect, useRef } from 'react'

import styles from './Nav.module.scss'

const LINKS = [
  { href: '#services', label: 'Services' },
  { href: '#apply', label: 'Ventures' },
  { href: '#manifesto', label: 'Manifesto' },
]

const PAD = 4
const VIEWBOX = `${LOGO_BOUNDS.x - PAD} ${LOGO_BOUNDS.y - PAD} ${LOGO_BOUNDS.width + PAD * 2} ${LOGO_BOUNDS.height + PAD * 2}`

export default function Nav() {
  const logoRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const logo = logoRef.current
    if (!logo) return
    registerGsap()

    let tl: gsap.core.Timeline | null = null

    // Same rise as the preloader intro, played once the preloader has fully cleared.
    const stopWaiting = onPreloader('done', () => {
      if (prefersReducedMotion()) {
        gsap.set(logo, { visibility: 'visible' })
        return
      }

      const seven = logo.querySelector('[data-glyph="seven"]')
      const word = logo.querySelectorAll('[data-glyph]:not([data-glyph="seven"])')

      gsap.set([seven, ...word], { yPercent: 115 })
      gsap.set(logo, { visibility: 'visible' })
      tl = gsap
        .timeline()
        .to(seven, { yPercent: 0, duration: 1.1 }, 0)
        .to(word, { yPercent: 0, duration: 1.1, stagger: 0.07 }, 0.25)
    })

    return () => {
      stopWaiting()
      tl?.kill()
    }
  }, [])

  // Two fixed layers: a fixed element isolates its children from the page, so the
  // links and logo can only blend if their own layer carries the blend mode. The
  // button sits on a separate layer so it keeps its normal look.
  return (
    <>
      <header className={styles.nav}>
        <nav aria-label="Main" className={styles.links}>
          {LINKS.map(link => (
            <TransitionLink key={link.href} href={link.href} className={styles.link}>
              <RollText>{link.label}</RollText>
            </TransitionLink>
          ))}
        </nav>

        <TransitionLink href="/" className={styles.home} aria-label="7labz home">
          <svg ref={logoRef} viewBox={VIEWBOX} className={styles.logo} aria-hidden="true">
            <defs>
              <clipPath id="nav-logo-clip">
                <rect
                  x={LOGO_BOUNDS.x - PAD}
                  y={LOGO_BOUNDS.y - PAD}
                  width={LOGO_BOUNDS.width + PAD * 2}
                  height={LOGO_BOUNDS.height + PAD * 2}
                />
              </clipPath>
            </defs>
            <g clipPath="url(#nav-logo-clip)">
              {LOGO_GLYPHS.map(glyph => (
                <path key={glyph.id} data-glyph={glyph.id} d={glyph.d} />
              ))}
            </g>
          </svg>
        </TransitionLink>
      </header>

      <div className={styles.cta}>
        <ApplyButton
          href="#apply"
          label="Apply for a slot"
          tone="gray"
          className={styles.ctaButton}
        />
      </div>
    </>
  )
}
