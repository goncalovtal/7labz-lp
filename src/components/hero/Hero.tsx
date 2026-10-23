'use client'

import { gsap, prefersReducedMotion, registerGsap, SplitText } from '@/lib/gsap'
import { onPreloader } from '@/lib/preloader'
import { useEffect, useRef } from 'react'
import { preload } from 'react-dom'

import ApplyButton from '@/components/ui/ApplyButton'
import PixelPortrait from '@/components/ui/PixelPortrait'

import DitherField from './DitherField'
import styles from './Hero.module.scss'

/** How far the hero lags behind the scroll, as a share of its height. */
const HERO_PARALLAX = 0.45

export default function Hero() {
  // The still gates the horse's entrance, so fetch it before the component mounts.
  preload('/hero/horse.jpg', { as: 'image' })
  const sectionRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const detailsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const heading = headingRef.current
    const details = detailsRef.current
    if (!heading || !details) return
    registerGsap()

    let split: SplitText | null = null
    let tl: gsap.core.Timeline | null = null
    let cancelled = false

    const stopWaiting = onPreloader('reveal', () => {
      if (prefersReducedMotion()) {
        gsap.set([heading, details], { autoAlpha: 1 })
        return
      }

      // Split only once the font is in, so the words are measured in the real face.
      document.fonts.ready.then(() => {
        if (cancelled) return
        split = SplitText.create(heading, { type: 'words' })
        gsap.set(heading, { autoAlpha: 1 })
        tl = gsap
          .timeline({
            delay: 0.55,
            // Hand the text back to normal layout so it reflows on resize.
            onComplete: () => {
              split?.revert()
              split = null
            },
          })
          // Each word comes into focus: blurred and faint, sharpening as it fades in.
          .from(
            split.words,
            {
              autoAlpha: 0,
              filter: 'blur(14px)',
              y: '0.15em',
              duration: 1.3,
              stagger: 0.07,
              ease: 'power3.out',
            },
            0,
          )
          .set(details, { autoAlpha: 1 }, 0)
          .from(details.children, { autoAlpha: 0, y: 24, duration: 1.2, stagger: 0.12 }, 0.35)
      })
    })

    return () => {
      cancelled = true
      stopWaiting()
      tl?.kill()
      split?.revert()
    }
  }, [])

  // The hero moves as one block, slower than the page, so the manifesto slides up over
  // it. Nothing inside drifts on its own.
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    registerGsap()

    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.to(section, {
        y: () => section.offsetHeight * HERO_PARALLAX,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
          invalidateOnRefresh: true,
        },
      })
    })
    return () => mm.revert()
  }, [])

  return (
    <section ref={sectionRef} className={styles.hero}>
      <DitherField />
      {/* A painted hand in glyphs, rising from the bottom of the hero behind the copy:
          it lifts into the rock sign as the page opens, then moves gently on a loop. */}
      <PixelPortrait
        className={styles.portrait}
        src="/hero/horse.jpg"
        video="/hero/horse-loop.mp4"
        heightShare={0.6}
        topShare={0.02}
      />

      <div className={styles.content}>
        <div className={styles.stage} />

        <div className={styles.copy}>
          <h1 ref={headingRef} className={styles.heading}>
            Boutique studio of
            <br />
            growth engineers
          </h1>
          <div ref={detailsRef} className={styles.details}>
            <p className={styles.lede}>
              We build the systems that make a business faster: CRMs, automations, internal tools,
              AI products. Live in weeks, and backed through 7labz Ventures when it is the right one
            </p>
            <ApplyButton href="#apply" label="Check availability" pixelated />
          </div>
        </div>
      </div>
    </section>
  )
}
