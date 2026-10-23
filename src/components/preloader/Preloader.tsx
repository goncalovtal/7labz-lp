'use client'

import { gsap, prefersReducedMotion, registerGsap, ScrollTrigger } from '@/lib/gsap'
import { markPreloader } from '@/lib/preloader'
import NumberFlow from '@number-flow/react'
import { useLenis } from 'lenis/react'
import { useEffect, useRef, useState } from 'react'

import { LOGO_BOUNDS, LOGO_GLYPHS, STEMS } from '@/lib/logo'
import styles from './Preloader.module.scss'

/** Survives client navigation (the root layout never remounts): the intro plays once per load. */
let hasPlayed = false

const LOGO_CENTER = {
  x: LOGO_BOUNDS.x + LOGO_BOUNDS.width / 2,
  y: LOGO_BOUNDS.y + LOGO_BOUNDS.height / 2,
}

/** The stem the outro zooms through. The b sits nearest the logo's centre; `STEMS.seven` also works. */
const ZOOM_TARGET = STEMS.b

/**
 * Uneven jumps the counter rolls through, `[seconds, percent]`. Discrete steps rather
 * than a continuous count, so each change gets a full digit roll. 100 waits for the
 * page to actually be ready.
 */
const COUNT_STEPS = [
  [0.5, 14],
  [0.85, 37],
  [1.35, 58],
  [1.7, 81],
  [2.2, 93],
] as const

/** Time to let the final roll to 100% land before the outro starts. */
const FINAL_ROLL_SECONDS = 0.7

function pageReady(): Promise<unknown> {
  const load =
    document.readyState === 'complete'
      ? Promise.resolve()
      : new Promise(resolve => window.addEventListener('load', resolve, { once: true }))
  return Promise.all([load, document.fonts?.ready])
}

export default function Preloader() {
  const [active, setActive] = useState(() => !hasPlayed)
  const [progress, setProgress] = useState(0)
  const lenis = useLenis()

  const rootRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<SVGGElement>(null)
  const holeRef = useRef<SVGGElement>(null)

  useEffect(() => {
    if (!lenis) return
    if (active) lenis.stop()
    else lenis.start()
  }, [lenis, active])

  useEffect(() => {
    if (!active) return
    registerGsap()

    const root = rootRef.current
    const logo = logoRef.current
    const hole = holeRef.current
    if (!root || !logo || !hole) return

    const page = document.querySelector<HTMLElement>('[data-page-wrap]')
    const glyphs = logo.querySelectorAll<SVGPathElement>('[data-glyph]')
    const seven = logo.querySelector<SVGPathElement>('[data-glyph="seven"]')
    const word = logo.querySelectorAll<SVGPathElement>('[data-glyph]:not([data-glyph="seven"])')
    const labels = root.querySelectorAll<HTMLElement>('[data-label]')

    /** `zoom` runs 0 → 1 through the target stem. */
    const state = { zoom: 0 }

    // Positions both logo copies in screen px. The logo rests centred; the zoom scales
    // around the target stem exactly where it sits, so nothing slides — the stem just
    // grows until it alone covers the viewport.
    const layout = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const base = Math.min(vw * 0.24, 280) / LOGO_BOUNDS.width

      const tx = vw / 2 + (ZOOM_TARGET.x - LOGO_CENTER.x) * base
      const ty = vh / 2 + (ZOOM_TARGET.y - LOGO_CENTER.y) * base
      const reachX = Math.max(tx, vw - tx)
      const reachY = Math.max(ty, vh - ty)
      const fill =
        1.15 *
        Math.max(reachX / (base * ZOOM_TARGET.halfWidth), reachY / (base * ZOOM_TARGET.halfHeight))

      const scale = base * Math.pow(fill, state.zoom)
      const transform = `translate(${tx} ${ty}) scale(${scale}) translate(${-ZOOM_TARGET.x} ${-ZOOM_TARGET.y})`
      logo.setAttribute('transform', transform)
      hole.setAttribute('transform', transform)
    }

    layout()
    window.addEventListener('resize', layout)

    const finish = () => {
      hasPlayed = true
      markPreloader('done')
      if (page) gsap.set(page, { clearProps: 'transform,transformOrigin' })
      // Anything that measured scroll positions while the page was still scaled up for
      // the reveal measured them wrong; re-measure now it's back to its real size.
      ScrollTrigger.refresh()
      setActive(false)
    }

    let cancelled = false
    const timelines: gsap.core.Animation[] = []

    if (prefersReducedMotion()) {
      gsap.set([logo, labels], { visibility: 'visible' })
      pageReady().then(() => {
        if (cancelled) return
        setProgress(100)
        markPreloader('reveal')
        timelines.push(gsap.to(root, { autoAlpha: 0, duration: 0.4, onComplete: finish }))
      })
      return () => {
        cancelled = true
        timelines.forEach(t => t.kill())
        window.removeEventListener('resize', layout)
      }
    }

    gsap.set(glyphs, { yPercent: 115 })
    gsap.set(labels, { yPercent: 130, visibility: 'visible' })
    gsap.set(logo, { visibility: 'visible' })

    const intro = gsap
      .timeline()
      .to(seven, { yPercent: 0, duration: 1.1 }, 0.15)
      .to(word, { yPercent: 0, duration: 1.1, stagger: 0.07 }, 0.4)
      .to(labels, { yPercent: 0, duration: 0.9, stagger: 0.05 }, 0.3)
    timelines.push(intro)

    const counted = new Promise<void>(resolve => {
      const steps = gsap.timeline({ onComplete: resolve })
      COUNT_STEPS.forEach(([at, value]) => steps.call(setProgress, [value], at))
      timelines.push(steps)
    })

    const outro = () => {
      const tl = gsap.timeline({ onComplete: finish })

      tl.to(labels, { yPercent: -130, duration: 0.6, ease: 'power3.in' }, 0)

      // From here the stem is a window: the hole copy cuts the dark backdrop while the
      // lavender copy on top fades, so the page appears through the letterform.
      tl.set(hole, { opacity: 1 }, 0.2)
      tl.to(state, { zoom: 1, duration: 2.2, ease: 'zoom', onUpdate: layout }, 0.2)
      tl.call(() => markPreloader('reveal'), [], 0.75)
      tl.to(logo, { opacity: 0, duration: 0.9, ease: 'sine.inOut' }, 0.7)

      if (page) {
        tl.fromTo(
          page,
          { scale: 1.1, transformOrigin: '50% 50vh' },
          { scale: 1, duration: 1.8, ease: 'power3.out' },
          1,
        )
      }

      timelines.push(tl)
    }

    Promise.all([counted, pageReady(), intro.then()]).then(() => {
      if (cancelled) return
      setProgress(100)
      timelines.push(gsap.delayedCall(FINAL_ROLL_SECONDS, outro))
    })

    return () => {
      cancelled = true
      timelines.forEach(t => t.kill())
      window.removeEventListener('resize', layout)
    }
  }, [active])

  if (!active) return null

  return (
    <div ref={rootRef} className={styles.preloader} aria-hidden="true">
      <svg className={styles.stage}>
        <defs>
          <mask
            id="preloader-hole"
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="100%"
            height="100%"
          >
            <rect width="100%" height="100%" fill="white" />
            <g ref={holeRef} opacity="0">
              {LOGO_GLYPHS.map(glyph => (
                <path key={glyph.id} d={glyph.d} fill="black" />
              ))}
            </g>
          </mask>
          <clipPath id="preloader-clip">
            <rect
              x={LOGO_BOUNDS.x - 4}
              y={LOGO_BOUNDS.y - 4}
              width={LOGO_BOUNDS.width + 8}
              height={LOGO_BOUNDS.height + 8}
            />
          </clipPath>
        </defs>

        <rect className={styles.backdrop} width="100%" height="100%" mask="url(#preloader-hole)" />

        <g ref={logoRef} className={styles.logo}>
          <g clipPath="url(#preloader-clip)">
            {LOGO_GLYPHS.map(glyph => (
              <path key={glyph.id} data-glyph={glyph.id} d={glyph.d} />
            ))}
          </g>
        </g>
      </svg>

      <div className={styles.meta}>
        <span className={styles.mask}>
          <span data-label className={styles.label}>
            <NumberFlow value={progress} suffix="%" trend={1} />
          </span>
        </span>
      </div>
    </div>
  )
}
