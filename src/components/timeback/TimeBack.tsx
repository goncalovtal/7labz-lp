'use client'

import { gsap, prefersReducedMotion, registerGsap } from '@/lib/gsap'
import { revealSection } from '@/lib/reveal'
import NumberFlow from '@number-flow/react'
import { useEffect, useRef, useState } from 'react'

import styles from './TimeBack.module.scss'

// Draft numbers: the share we take off and the timeline are placeholders until the team
// confirms what they can promise.
const TASKS = [
  { id: 'admin', label: 'Admin and data entry', initial: 6 },
  { id: 'leads', label: 'Chasing leads and follow-ups', initial: 4 },
  { id: 'questions', label: 'Answering the same questions', initial: 3 },
  { id: 'reports', label: 'Pulling numbers and reports', initial: 2 },
] as const

const MAX_HOURS = 20
/** Share of those hours a system takes off your plate. */
const SHARE = 0.6
const WORKING_WEEKS = 48
/** A weekend is two full days; an evening is the three hours after work. */
const WEEKEND_HOURS = 16
const EVENING_HOURS = 3

const STEPS = [
  { when: 'Day 1', what: 'A call. You walk us through a normal week' },
  { when: 'Week 1', what: 'We map where your hours go and pick what to fix first' },
  { when: 'Week 2', what: 'The first system is live and your team is using it' },
  { when: 'Week 4', what: 'It runs without you. The hours are yours again' },
]

type TaskId = (typeof TASKS)[number]['id']

export default function TimeBack() {
  const sectionRef = useRef<HTMLElement>(null)
  const lineRef = useRef<HTMLDivElement>(null)
  const [hours, setHours] = useState<Record<TaskId, number>>(
    () => Object.fromEntries(TASKS.map(task => [task.id, task.initial])) as Record<TaskId, number>,
  )

  const weekly = Object.values(hours).reduce((sum, value) => sum + value, 0)
  const yearly = Math.round(weekly * SHARE * WORKING_WEEKS)
  const weekends = Math.round(yearly / WEEKEND_HOURS)
  const evenings = Math.round(yearly / EVENING_HOURS)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    return revealSection(section)
  }, [])

  // The timeline's line draws across as the section scrolls through.
  useEffect(() => {
    const line = lineRef.current
    if (!line) return
    registerGsap()
    if (prefersReducedMotion()) {
      gsap.set(line, { scaleX: 1 })
      return
    }
    const tween = gsap.fromTo(
      line,
      { scaleX: 0 },
      {
        scaleX: 1,
        ease: 'none',
        scrollTrigger: { trigger: line, start: 'top 85%', end: 'top 35%', scrub: true },
      },
    )
    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [])

  return (
    <section ref={sectionRef} id="time-back" className={styles.timeBack}>
      <header className={styles.header}>
        <p className={styles.eyebrow} data-reveal>
          Time back
        </p>
        <h2 className={styles.title} data-reveal-lines>
          Get your evenings
          <br />
          back
        </h2>
        <p className={styles.lede} data-reveal>
          Most founders we work with run everything themselves. Every hour a system takes off you is
          an hour back for the people waiting at home
        </p>
      </header>

      <div className={styles.calculator}>
        <div className={styles.inputs} data-reveal>
          <p className={styles.question}>How many hours a week do you spend on</p>
          {TASKS.map(task => {
            const value = hours[task.id]
            return (
              <label key={task.id} className={styles.slider}>
                <span className={styles.sliderHead}>
                  <span>{task.label}</span>
                  <span className={styles.sliderValue}>{value} h</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={MAX_HOURS}
                  step={1}
                  value={value}
                  onChange={event =>
                    setHours(current => ({ ...current, [task.id]: Number(event.target.value) }))
                  }
                  style={{ '--fill': `${(value / MAX_HOURS) * 100}%` } as React.CSSProperties}
                />
              </label>
            )
          })}
        </div>

        <div className={styles.result} data-reveal aria-live="polite">
          <p className={styles.resultLabel}>Back with you, every year</p>
          <p className={styles.big}>
            <NumberFlow value={yearly} />
            <span className={styles.unit}>hours</span>
          </p>
          <div className={styles.equivalents}>
            <p>
              <NumberFlow value={weekends} className={styles.equivalentValue} />
              <span>full weekends off</span>
            </p>
            <p>
              <NumberFlow value={evenings} className={styles.equivalentValue} />
              <span>evenings home on time</span>
            </p>
          </div>
          <p className={styles.footnote}>
            Assumes we take {Math.round(SHARE * 100)}% of it off your plate, over {WORKING_WEEKS}{' '}
            working weeks
          </p>
        </div>
      </div>

      <div className={styles.timeline}>
        <p className={styles.timelineTitle} data-reveal>
          And how fast you get them back
        </p>
        <div className={styles.track}>
          <div ref={lineRef} className={styles.line} />
        </div>
        <ol className={styles.steps}>
          {STEPS.map(step => (
            <li key={step.when} className={styles.step} data-reveal>
              <span className={styles.when}>{step.when}</span>
              <p className={styles.what}>{step.what}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
