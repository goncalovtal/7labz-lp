'use client'

import { usePageTransitionNavigate } from '@/components/providers/PageTransition'
import { useLenis } from 'lenis/react'
import Link from 'next/link'
import type { ComponentProps, MouseEventHandler } from 'react'

type Props = Omit<ComponentProps<typeof Link>, 'onClick'> & {
  href: string
  onClick?: MouseEventHandler<HTMLAnchorElement>
}

/**
 * An element's place in the page's layout, ignoring transforms. Sections that slide on
 * scroll sit somewhere else mid-slide, and measuring them there would aim short.
 */
function layoutTop(element: HTMLElement) {
  let top = 0
  for (let node: HTMLElement | null = element; node; node = node.offsetParent as HTMLElement) {
    top += node.offsetTop
  }
  return top
}

export default function TransitionLink({ href, children, onClick, ...props }: Props) {
  const navigate = usePageTransitionNavigate()
  const lenis = useLenis()

  // In-page links glide to their section through Lenis instead of jumping.
  if (href.startsWith('#')) {
    return (
      <a
        href={href}
        {...props}
        onClick={e => {
          onClick?.(e)
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
          const target = document.querySelector<HTMLElement>(href)
          if (!target || !lenis) return
          e.preventDefault()
          lenis.scrollTo(layoutTop(target))
        }}
      >
        {children}
      </a>
    )
  }

  return (
    <Link
      href={href}
      {...props}
      onClick={e => {
        onClick?.(e)
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        if (e.button !== 0) return
        e.preventDefault()
        navigate(href)
      }}
    >
      {children}
    </Link>
  )
}
