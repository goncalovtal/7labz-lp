import { gsap, prefersReducedMotion, registerGsap, SplitText } from '@/lib/gsap'

/**
 * Reveals a section once as it scrolls in. Headings marked `data-reveal-lines` come in a
 * line at a time; anything marked `data-reveal` comes in whole. Each clears from a blur as
 * it rises and fades in, in document order. Returns a cleanup.
 */
export function revealSection(section: HTMLElement, start = 'top 75%') {
  if (prefersReducedMotion()) return () => {}
  registerGsap()

  const items = Array.from(
    section.querySelectorAll<HTMLElement>('[data-reveal], [data-reveal-lines]'),
  )
  // Hidden until the fonts are in, so the lines are split on the real face.
  gsap.set(items, { autoAlpha: 0 })

  let cancelled = false
  let splits: SplitText[] = []
  let tl: gsap.core.Timeline | null = null

  document.fonts.ready.then(() => {
    if (cancelled) return
    const targets: Element[] = []
    for (const item of items) {
      if (item.hasAttribute('data-reveal-lines')) {
        const split = SplitText.create(item, { type: 'lines' })
        splits.push(split)
        targets.push(...split.lines)
      } else {
        targets.push(item)
      }
    }
    gsap.set(items, { autoAlpha: 1 })
    tl = gsap
      .timeline({
        scrollTrigger: { trigger: section, start, once: true },
        // Hand the headings back to normal layout so they reflow on resize.
        onComplete: () => {
          splits.forEach(split => split.revert())
          splits = []
        },
      })
      .from(targets, {
        autoAlpha: 0,
        y: 24,
        filter: 'blur(12px)',
        duration: 1.1,
        stagger: 0.07,
        ease: 'power3.out',
        // Leave nothing inline afterwards, so the stylesheet owns opacity again.
        clearProps: 'all',
      })
  })

  return () => {
    cancelled = true
    tl?.scrollTrigger?.kill()
    tl?.kill()
    splits.forEach(split => split.revert())
  }
}
