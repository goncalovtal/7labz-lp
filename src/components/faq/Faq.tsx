'use client'

import { FAQ } from '@/content/faq'
import { registerGsap, ScrollTrigger } from '@/lib/gsap'
import { revealSection } from '@/lib/reveal'
import { useEffect, useRef } from 'react'

import styles from './Faq.module.scss'

export default function Faq() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    return revealSection(section)
  }, [])

  // Opening an answer pushes everything below it down, so the triggers further down the
  // page are measured again.
  const remeasure = () => {
    registerGsap()
    ScrollTrigger.refresh()
  }

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
            <details key={item.question} className={styles.item} onToggle={remeasure} data-reveal>
              <summary className={styles.question}>
                <h3>{item.question}</h3>
                <span className={styles.icon} aria-hidden />
              </summary>
              <p className={styles.answer}>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
