'use client'

import ApplyButton from '@/components/ui/ApplyButton'
import HighlightText from '@/components/ui/HighlightText'
import { gsap, registerGsap } from '@/lib/gsap'
import { revealSection } from '@/lib/reveal'
import { useEffect, useRef } from 'react'

import styles from './Manifesto.module.scss'
import Signatures from './Signatures'
import TeamStrip from './TeamStrip'

// Draft copy: no claims about clients, numbers or history until they're real.
const PARAGRAPHS = [
  'Most studios sell hours. We would rather sell speed. 7labz is a small team of growth engineers: we find the part of a business that is slow, we build the thing that fixes it, and we stay long enough to see the hours come back',
  'We do not hand over a deck and leave. We embed inside the company, sit with the people who run it and rebuild how the work actually flows: the pipelines, the tools and the systems underneath. Restructuring from within, not advising from outside. Some of the companies we embed with have outgrown the way they run, some are AI startups that need a product shipped. Different problems, same team',
  'We keep it boutique on purpose. A handful of businesses at a time, so every one of them works with the people doing the work, not someone relaying messages. When we are full, we are full. That is why you apply instead of book',
  'We are opinionated, and we will not pretend otherwise. If something is not going to work, you will hear it before it ships, not after it gets expensive. Prove us wrong and we change our minds just as fast',
  'And every so often a founder is building something we cannot stop thinking about. That is what 7labz Ventures is for. Instead of an invoice, we take a stake: we put in the team, the time and, when it makes sense, the capital, and we build it with you like it is ours. Partly, it is',
  'Build with us, or let us build alongside you. Either way, the bar is the same',
]

/** How far behind the model section the manifesto starts, as a share of the viewport. */
const RISE = 0.3

export default function Manifesto() {
  const sectionRef = useRef<HTMLElement>(null)

  // The manifesto sits tucked up behind the section above and slides out from under it,
  // settling into place as its top reaches the top of the screen.
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    registerGsap()

    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(
        section,
        { y: () => -window.innerHeight * RISE },
        {
          y: 0,
          ease: 'none',
          // Timed off the section above: the manifesto itself is shifted, so measuring
          // it would put the range in the wrong place.
          scrollTrigger: {
            trigger: section.previousElementSibling ?? section,
            start: 'bottom bottom',
            end: 'bottom top',
            scrub: true,
            invalidateOnRefresh: true,
          },
        },
      )
    })
    return () => mm.revert()
  }, [])

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    return revealSection(section)
  }, [])

  return (
    <section ref={sectionRef} id="manifesto" className={styles.manifesto}>
      <TeamStrip />
      <div className={styles.inner}>
        <h2 className={styles.title} data-reveal-lines>
          Manifesto
        </h2>

        {PARAGRAPHS.map(text => (
          <HighlightText key={text.slice(0, 24)} className={styles.paragraph}>
            {text}
          </HighlightText>
        ))}

        <div className={styles.cta}>
          <ApplyButton href="#apply" label="Apply for a slot" pixelated />
        </div>

        <Signatures />
      </div>
    </section>
  )
}
