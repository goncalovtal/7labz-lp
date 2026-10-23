'use client'

import { gsap, registerGsap, SplitText } from '@/lib/gsap'
import { useEffect, useRef, type ReactNode } from 'react'

type Props = {
  as?: 'p' | 'h2' | 'h3'
  children: ReactNode
  className?: string
  /** ScrollTrigger range the words light up across, measured on the element. */
  start?: string
  end?: string
  /** Opacity the words rest at before they're reached. */
  fade?: number
}

/**
 * Words brighten one after another as the text scrolls through the reading zone,
 * scrubbed to the scroll. Adapted from the verteal portfolio's `HighlightText`.
 */
export default function HighlightText({
  as: Tag = 'p',
  children,
  className,
  start = 'top 85%',
  end = 'bottom 55%',
  fade = 0.22,
}: Props) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    registerGsap()

    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // autoSplit re-splits on resize and font load; onSplit hands back the tween so
      // the old one is reverted with the old split.
      const split = SplitText.create(el, {
        type: 'words',
        autoSplit: true,
        onSplit: self =>
          gsap.from(self.words, {
            opacity: fade,
            stagger: 0.1,
            ease: 'none',
            scrollTrigger: { trigger: el, start, end, scrub: true },
          }),
      })
      return () => split.revert()
    })

    return () => mm.revert()
  }, [start, end, fade])

  return (
    <Tag ref={ref as React.RefObject<HTMLParagraphElement>} className={className}>
      {children}
    </Tag>
  )
}
