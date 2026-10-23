'use client'

import { gsap, prefersReducedMotion, registerGsap } from '@/lib/gsap'
import { Fragment, useEffect, useRef } from 'react'

import styles from './Manifesto.module.scss'

// Draft copy: the culture lines are placeholders until the team signs them off.
const PHRASES = ['Ship it this week', 'Say it straight', 'Home for dinner']

/**
 * One oversized line about how the studio works, running across the full width. It moves
 * with the scroll rather than on a timer, and only once it's uncovered: it starts with
 * the first phrase in view and travels just far enough to end on the last, so the whole
 * line can be read once on the way down. Between the phrases, the hero's horse gallops in
 * green, stepped through the Muybridge frames.
 */
export default function TeamStrip() {
  const stripRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const strip = stripRef.current
    const track = trackRef.current
    if (!strip || !track || prefersReducedMotion()) return
    registerGsap()

    // The manifesto is itself shifted while it rises, so measuring the strip would put the
    // range in the wrong place. The section above isn't, and the strip comes out from under
    // its bottom edge: start once it's out from under that edge, finish as it leaves the
    // top of the screen.
    const cover = strip.closest('section')?.previousElementSibling ?? strip
    const tween = gsap.fromTo(
      track,
      { x: 0 },
      {
        x: () => -(track.scrollWidth - strip.clientWidth),
        // Eases in and settles out, so it doesn't jolt into motion or stop dead on the
        // last phrase, and trails the scroll by a beat instead of locking to it.
        ease: 'power2.inOut',
        scrollTrigger: {
          trigger: cover,
          start: 'bottom 45%',
          end: 'bottom -25%',
          scrub: 1.2,
          invalidateOnRefresh: true,
        },
      },
    )
    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [])

  return (
    <div ref={stripRef} className={styles.strip}>
      <p className={styles.srOnly}>{PHRASES.join('. ')}</p>
      <div ref={trackRef} className={styles.stripTrack} aria-hidden>
        <span className={styles.stripLine}>
          <span className={styles.stripHorse} />
          {PHRASES.map(phrase => (
            <Fragment key={phrase}>
              <span>{phrase}</span>
              <span className={styles.stripHorse} />
            </Fragment>
          ))}
        </span>
      </div>
    </div>
  )
}
