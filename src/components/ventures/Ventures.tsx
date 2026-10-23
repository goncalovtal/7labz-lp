'use client'

import ApplyButton from '@/components/ui/ApplyButton'
import { revealSection } from '@/lib/reveal'
import { useEffect, useRef, useState, type FormEvent } from 'react'

import styles from './Ventures.module.scss'

// Draft copy: terms and wording are placeholders until the partners sign them off.
const TERMS = ['Pre-seed to seed', 'Equity, not fees', 'Hands on, not advisory', 'A few a year']

const STAGES = ['Idea', 'Building', 'Live, no revenue', 'Live, with revenue']

const TEAM_SIZES = ['Just me', '2–5', '6–20', '21–50', '50+']

type Status = 'idle' | 'sending' | 'sent' | 'error'

export default function Ventures() {
  const sectionRef = useRef<HTMLElement>(null)
  const [status, setStatus] = useState<Status>('idle')

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    return revealSection(section)
  }, [])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = Object.fromEntries(new FormData(form))
    setStatus('sending')
    try {
      const response = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error(String(response.status))
      setStatus('sent')
      form.reset()
    } catch {
      setStatus('error')
    }
  }

  return (
    <section ref={sectionRef} id="apply" className={styles.ventures}>
      <div className={styles.body}>
        <div className={styles.pitch}>
          <header className={styles.header}>
            <p className={styles.eyebrow} data-reveal>
              7labz Ventures
            </p>
            <h2 className={styles.title} data-reveal-lines>
              Some founders we back instead of bill
            </h2>
          </header>

          <p className={styles.lede} data-reveal>
            A few times a year a founder is building something we cannot stop thinking about.
            Instead of an invoice, we take a stake: we put in the team, the time and, when it makes
            sense, the capital, and we build it with you like it is ours
          </p>

          <ul className={styles.terms} data-reveal>
            {TERMS.map(term => (
              <li key={term}>{term}</li>
            ))}
          </ul>
        </div>

        <form className={styles.form} onSubmit={submit} data-reveal>
          <div className={styles.grid}>
            <label className={styles.field}>
              <span className={styles.label}>Your name</span>
              <input name="name" type="text" autoComplete="name" required />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Email</span>
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Company</span>
              <input name="company" type="text" autoComplete="organization" required />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Website, if any</span>
              <input name="website" type="url" autoComplete="url" />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Stage</span>
              <select name="stage" defaultValue={STAGES[1]}>
                {STAGES.map(stage => (
                  <option key={stage}>{stage}</option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Team size</span>
              <select name="team" defaultValue={TEAM_SIZES[0]}>
                {TEAM_SIZES.map(size => (
                  <option key={size}>{size}</option>
                ))}
              </select>
            </label>
            <label className={`${styles.field} ${styles.wide}`}>
              <span className={styles.label}>What are you building</span>
              <textarea name="building" rows={3} required />
            </label>
            <label className={`${styles.field} ${styles.wide}`}>
              <span className={styles.label}>What would you need from us</span>
              <textarea name="need" rows={2} />
            </label>
            {/* Bots fill this; people never see it. */}
            <input
              name="fax"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              className={styles.trap}
            />
          </div>

          <div className={styles.submit}>
            <ApplyButton
              label={status === 'sending' ? 'Sending' : 'Apply to Ventures'}
              disabled={status === 'sending'}
              tone="gray"
              pixelated
            />
            <p className={styles.note} role="status">
              {status === 'sent' && 'Got it. We read everything and reply within a week'}
              {status === 'error' && 'That did not go through. Try again, or email us'}
              {(status === 'idle' || status === 'sending') &&
                'No deck needed. Short answers are fine'}
            </p>
          </div>
        </form>
      </div>
    </section>
  )
}
