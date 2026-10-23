'use client'

import LiveMark from '@/components/ui/LiveMark'
import { prefersReducedMotion, registerGsap, ScrollTrigger } from '@/lib/gsap'
import { SERVICES } from '@/content/services'
import { type Mark } from '@/lib/glyphMarks'
import { revealSection } from '@/lib/reveal'
import { useEffect, useRef, useState } from 'react'

import styles from './Services.module.scss'

export default function Services() {
  const sectionRef = useRef<HTMLElement>(null)
  const [active, setActive] = useState<Mark>(SERVICES[0].id)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const stopReveal = revealSection(section)
    if (prefersReducedMotion()) return stopReveal
    registerGsap()

    // Whichever service sits mid-screen is the one lit up, and its mark is the one shown.
    const rows = Array.from(section.querySelectorAll<HTMLElement>('[data-service]'))
    const triggers = rows.map(row =>
      ScrollTrigger.create({
        trigger: row,
        start: 'top 55%',
        end: 'bottom 55%',
        onToggle: self => self.isActive && setActive(row.dataset.service as Mark),
      }),
    )

    return () => {
      stopReveal()
      triggers.forEach(trigger => trigger.kill())
    }
  }, [])

  return (
    <section ref={sectionRef} id="services" className={styles.services}>
      <header className={styles.header}>
        <p className={styles.eyebrow} data-reveal>
          Services
        </p>
        <h2 className={styles.title} data-reveal-lines>
          What we build
        </h2>
      </header>

      <div className={styles.layout}>
        <div className={styles.stage} aria-hidden>
          <div className={styles.sticky}>
            <LiveMark mark={active} />
          </div>
        </div>

        <ol className={styles.list}>
          {SERVICES.map((service, i) => (
            <li
              key={service.id}
              className={[styles.row, service.id === active && styles.active]
                .filter(Boolean)
                .join(' ')}
              data-service={service.id}
              data-reveal
            >
              <div className={styles.inlineMark} aria-hidden>
                <LiveMark mark={service.id} fontSize={9} enter />
              </div>
              <span className={styles.index}>{String(i + 1).padStart(2, '0')}</span>
              <h3 className={styles.rowTitle}>{service.title}</h3>
              <p className={styles.body}>{service.body}</p>
              <ul className={styles.items}>
                {service.items.map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
