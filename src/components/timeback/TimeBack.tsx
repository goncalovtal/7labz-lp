'use client'

import { PROCESS } from '@/content/site'
import { gsap, prefersReducedMotion, registerGsap } from '@/lib/gsap'
import { revealSection } from '@/lib/reveal'
import NumberFlow from '@number-flow/react'
import { useEffect, useRef, useState } from 'react'

import styles from './TimeBack.module.scss'

// Draft numbers: an illustrative week, labelled as such on the card, until the team has a
// real one from a client it can show.
// Each task says what takes it over, so the drop reads as work moved into a system rather
// than hours that simply vanish.
const WEEK = [
  { label: 'Admin and data entry', fix: 'Synced by the CRM', before: 9, after: 2 },
  { label: 'Chasing leads and follow-ups', fix: 'Automatic follow-ups', before: 6, after: 1 },
  { label: 'Answering the same questions', fix: 'An AI assistant answers', before: 5, after: 1 },
  { label: 'Quotes and invoicing', fix: 'Generated from the job', before: 4, after: 1 },
  { label: 'Pulling numbers and reports', fix: 'A live dashboard', before: 3, after: 0 },
]

/** The tallest bar's hours, so every bar is drawn against the same scale. */
const SCALE = Math.max(...WEEK.map(task => task.before))
const TOTAL_BEFORE = WEEK.reduce((sum, task) => sum + task.before, 0)
const TOTAL_AFTER = WEEK.reduce((sum, task) => sum + task.after, 0)

/**
 * Where the chart is: hidden until reached; the week as it is; switching, from the moment
 * the bars start to drop; then after, once they're near the new hours and the figures change.
 */
type Stage = 'hidden' | 'before' | 'switching' | 'after'

/** Point in the scrubbed timeline where the bars start to drop, after a hold at full height. */
const DROP_AT = 0.75

export default function TimeBack() {
  const sectionRef = useRef<HTMLElement>(null)
  const chartRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<HTMLDivElement>(null)
  const [stage, setStage] = useState<Stage>('hidden')

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    return revealSection(section)
  }, [])

  // No input: the chart tells it as you scroll, scrubbed to the scroll rather than played
  // on a timer, so it only moves while you do and runs backwards when you scroll back up.
  // Over the first part the bars grow, one after another, to the week as it is; they hold;
  // then they drop to the week with 7labz, the old heights left behind as ghosts. The
  // figures and labels follow which of those the bars are showing.
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    registerGsap()
    const areas = Array.from(chart.querySelectorAll<HTMLElement>('[data-before]'))
    const ratio = (area: HTMLElement, key: 'before' | 'after') => Number(area.dataset[key]) / SCALE

    const tl = gsap.timeline({
      scrollTrigger: {
        // Timed off the bars, not the card: it starts as soon as they're fully on screen and
        // ends with them just above the middle, so every step plays where it can be seen and
        // the total lands in view below them.
        trigger: chart.querySelector('[data-bars]') ?? chart,
        start: 'bottom bottom',
        end: 'bottom 58%',
        scrub: 0.6,
        invalidateOnRefresh: true,
        onUpdate: self => {
          const time = self.progress * tl.duration()
          // The switch flips as the drop begins; the figures follow halfway through it, when
          // the bars are nearer the new hours.
          setStage(
            time < 0.02
              ? 'hidden'
              : time < DROP_AT
                ? 'before'
                : time < DROP_AT + 0.2
                  ? 'switching'
                  : 'after',
          )
        },
      },
    })
    tl.to(areas, {
      '--h': (_: number, area: HTMLElement) => ratio(area, 'before'),
      duration: 0.4,
      stagger: 0.04,
      ease: 'power2.out',
    })
      .set(areas, { '--g': (_: number, area: HTMLElement) => ratio(area, 'before') }, DROP_AT)
      .to(
        areas,
        {
          '--h': (_: number, area: HTMLElement) => ratio(area, 'after'),
          duration: 0.35,
          stagger: 0.04,
          ease: 'power2.inOut',
        },
        DROP_AT,
      )

    return () => {
      tl.scrollTrigger?.kill()
      tl.kill()
    }
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

  const showing = stage === 'after' ? 'after' : 'before'
  const switched = stage === 'switching' || stage === 'after'
  const saved = stage === 'after' ? TOTAL_BEFORE - TOTAL_AFTER : 0

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
          When we embed with a company, the first thing we find is the hours lost to admin, chasing
          and reporting. Every hour a system takes off your team is an hour back for the work, and
          for the people waiting at home
        </p>
      </header>

      <div className={styles.panel}>
        <div ref={chartRef} className={styles.card} data-stage={stage}>
          <aside className={styles.rail}>
            <p className={styles.railTitle}>A week, mapped</p>
            <p className={styles.note}>Illustrative week</p>
          </aside>

          <div className={styles.chartBody}>
            <div className={styles.chartHead}>
              <h3 className={styles.chartTitle}>Where a founder’s week goes</h3>
              <p className={styles.chartLede}>
                Hours a week spent on work a system could do. Keep scrolling to watch that work move
                off your team and into systems
              </p>
            </div>

            {/* Which week the bars show, as a switch that visibly flips. */}
            <div className={styles.switch} data-on={switched} aria-live="polite">
              <span className={styles.switchKnob} aria-hidden />
              <span className={styles.switchOption} data-option="today">
                Your week today
              </span>
              <span className={styles.switchOption} data-option="with">
                With 7labz systems
              </span>
            </div>

            <ol className={styles.bars} data-bars>
              {WEEK.map(task => {
                const value = stage === 'hidden' ? 0 : task[showing]
                return (
                  <li key={task.label} className={styles.column}>
                    <span className={styles.columnHead}>
                      <span className={styles.columnLabel}>{task.label}</span>
                      <span className={styles.fix}>{task.fix}</span>
                    </span>
                    <span
                      className={styles.barArea}
                      data-before={task.before}
                      data-after={task.after}
                    >
                      {/* The old height stays as a ghost, so the drop reads as hours taken off. */}
                      <span className={styles.ghost} />
                      <span className={styles.bar} />
                      <span className={styles.delta}>−{task.before - task.after}h</span>
                      <span className={styles.figure}>
                        <NumberFlow value={value} suffix="h" />
                      </span>
                    </span>
                  </li>
                )
              })}
            </ol>

            <p className={styles.total} aria-live="polite">
              <span className={styles.totalValue}>
                <NumberFlow value={saved} />
              </span>
              <span className={styles.totalText}>
                hours back every week,
                <br />
                moved from people to systems
              </span>
            </p>
          </div>
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
          {PROCESS.map(step => (
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
