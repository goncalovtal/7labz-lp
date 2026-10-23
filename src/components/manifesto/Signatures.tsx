'use client'

import { gsap, registerGsap } from '@/lib/gsap'
import { useEffect, useRef } from 'react'

import styles from './Manifesto.module.scss'
import { SIGNATURES } from './signatureData'

/** The three co-founder signatures, drawn on stroke by stroke as the row scrolls in. */
export default function Signatures() {
  const rowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const row = rowRef.current
    if (!row) return
    registerGsap()

    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: row, start: 'top 85%', once: true },
      })

      row.querySelectorAll('svg').forEach((svg, index) => {
        // Hide each stroke behind a dash as long as itself, then pull the dash away.
        const paths = Array.from(svg.querySelectorAll('path'))
        paths.forEach(path => {
          const length = path.getTotalLength()
          gsap.set(path, { strokeDasharray: length, strokeDashoffset: length })
        })
        tl.to(
          paths,
          { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut', stagger: 0.9 },
          index * 0.35,
        )
      })
    })

    return () => mm.revert()
  }, [])

  return (
    <div ref={rowRef} className={styles.signatures}>
      {SIGNATURES.map(signature => (
        <div key={signature.name} className={styles.signature}>
          <svg
            className={styles.mark}
            viewBox={signature.viewBox}
            fill="none"
            role="img"
            aria-label={`${signature.name}'s signature`}
          >
            {signature.paths.map(d => (
              <path
                key={d.slice(0, 16)}
                d={d}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </svg>
          <span className={styles.name}>{signature.name}</span>
          <span className={styles.role}>{signature.role}</span>
        </div>
      ))}
    </div>
  )
}
