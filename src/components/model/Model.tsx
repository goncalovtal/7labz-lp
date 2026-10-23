'use client'

import ApplyButton from '@/components/ui/ApplyButton'
import LiveMark from '@/components/ui/LiveMark'
import { type Mark } from '@/lib/glyphMarks'
import { revealSection } from '@/lib/reveal'
import { useEffect, useRef } from 'react'

import styles from './Model.module.scss'

// Draft copy and slot numbers: placeholders until they're real.
const STAGES: { id: Mark; title: string; body: string }[] = [
  {
    id: 'map',
    title: 'Map',
    body: 'A short run inside your business to find where the hours and the money leak',
  },
  {
    id: 'build',
    title: 'Build',
    body: 'CRMs, automations, internal tools, AI products. Built by the people who mapped it, not handed down a chain',
  },
  {
    id: 'ship',
    title: 'Ship',
    body: 'Live in weeks, not quarters. We stay until your team runs it without us',
  },
  {
    id: 'back',
    title: 'Back',
    body: 'When a founder is building something we can’t stop thinking about, we take a stake through 7labz Ventures',
  },
]

const SLOTS = 3
const SLOTS_TAKEN = 2
const QUARTER = 'Q4 2026'

export default function Model() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    return revealSection(section)
  }, [])

  return (
    <section ref={sectionRef} id="model" className={styles.model}>
      <header className={styles.header}>
        <p className={styles.eyebrow} data-reveal>
          The model
        </p>
        <h2 className={styles.title} data-reveal-lines>
          One team, four stages,
          <br />a few businesses at a time
        </h2>
      </header>

      <ol className={styles.stages}>
        {STAGES.map((stage, i) => (
          <li key={stage.id} className={styles.stage} data-reveal>
            <LiveMark
              mark={stage.id}
              cols={30}
              rows={16}
              fontSize={10}
              enter
              delay={i * 0.15}
              className={styles.mark}
            />
            <span className={styles.index}>{String(i + 1).padStart(2, '0')}</span>
            <h3 className={styles.stageTitle}>{stage.title}</h3>
            <p className={styles.body}>{stage.body}</p>
          </li>
        ))}
      </ol>

      <div className={styles.availability} data-reveal>
        <div className={styles.slots}>
          <span className={styles.pips} aria-hidden>
            {Array.from({ length: SLOTS }, (_, i) => (
              <span key={i} className={i < SLOTS_TAKEN ? styles.taken : styles.open} />
            ))}
          </span>
          <span>
            {QUARTER}: {SLOTS_TAKEN} of {SLOTS} slots taken
          </span>
        </div>
        <ApplyButton href="#apply" label="Apply for a slot" tone="gray" pixelated />
      </div>
    </section>
  )
}
