'use client'

import { FAQ } from '@/content/faq'
import { gsap, prefersReducedMotion, registerGsap, ScrollTrigger } from '@/lib/gsap'
import { revealSection } from '@/lib/reveal'
import { useEffect, useRef, type MouseEvent, type SyntheticEvent } from 'react'

import styles from './Faq.module.scss'

// Opening an answer pushes everything below it down, so the triggers further down the
// page are measured again once it has settled.
const remeasure = () => {
  registerGsap()
  ScrollTrigger.refresh()
}

/**
 * Takes over the summary's click so the answer slides open and shut instead of snapping.
 * The details element stays open until the close has finished, so the text never vanishes
 * mid-slide. With reduced motion the native toggle runs untouched.
 */
const toggle = (event: MouseEvent<HTMLElement>) => {
  const details = event.currentTarget.parentElement as HTMLDetailsElement
  const answer = details.querySelector<HTMLElement>('[data-answer]')
  if (!answer || prefersReducedMotion()) return
  event.preventDefault()
  registerGsap()
  gsap.killTweensOf(answer)

  if (details.hasAttribute('data-expanded')) {
    details.removeAttribute('data-expanded')
    gsap.to(answer, {
      height: 0,
      opacity: 0,
      duration: 0.45,
      ease: 'power3.inOut',
      onComplete: () => {
        details.open = false
        gsap.set(answer, { clearProps: 'all' })
      },
    })
  } else {
    details.setAttribute('data-expanded', '')
    details.open = true
    gsap.fromTo(
      answer,
      { height: 0, opacity: 0 },
      {
        height: 'auto',
        opacity: 1,
        duration: 0.55,
        ease: 'power3.out',
        clearProps: 'all',
        onComplete: remeasure,
      },
    )
  }
}

// Keeps the icon in step when the native toggle runs, and remeasures once it has.
const sync = (event: SyntheticEvent<HTMLDetailsElement>) => {
  const details = event.currentTarget
  details.toggleAttribute('data-expanded', details.open)
  remeasure()
}

export default function Faq() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    return revealSection(section)
  }, [])

  return (
    <section ref={sectionRef} id="faq" className={styles.faq}>
      <div className={styles.body}>
        <header className={styles.header}>
          <p className={styles.eyebrow} data-reveal>
            FAQ
          </p>
          <h2 className={styles.title} data-reveal-lines>
            Before you apply
          </h2>
        </header>

        {/* Native <details>, so every answer is in the HTML even while it is closed. */}
        <div className={styles.list}>
          {FAQ.map(item => (
            <details key={item.question} className={styles.item} onToggle={sync} data-reveal>
              <summary className={styles.question} onClick={toggle}>
                <h3>{item.question}</h3>
                <span className={styles.icon} aria-hidden />
              </summary>
              <div className={styles.answer} data-answer>
                <p>{item.answer}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
