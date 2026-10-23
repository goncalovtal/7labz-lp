'use client'

import type Lenis from 'lenis'
import { useLenis } from 'lenis/react'
import { usePathname, useRouter } from 'next/navigation'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

import { useDocumentBody } from '@/hooks/useDocumentBody'
import { gsap, prefersReducedMotion, registerGsap } from '@/lib/gsap'

import styles from './PageTransition.module.scss'

type Phase = 'idle' | 'cover' | 'reveal'

type PageTransitionContextValue = {
  navigate: (href: string) => void
}

const PageTransitionContext = createContext<PageTransitionContextValue | null>(null)

// ─── Shutter Config (Osmo Supply) ────────────────────────────────────────────
const shutterAmountConfig = {
  desktop: 10,
  tablet: 10,
  mobileLandscape: 10,
  mobile: 10,
}

const transitionDuration = 0.5
const shutterStaggerAmount = 0.3

function createShutter() {
  const el = document.createElement('div')
  el.setAttribute('data-transition-shutter', '')
  el.className = styles.transition__shutter
  return el
}

function generateShutters(panel: HTMLDivElement) {
  const width = window.innerWidth
  const isLandscape = window.innerWidth > window.innerHeight

  let shutterAmount = shutterAmountConfig.desktop

  if (width <= 479) {
    shutterAmount = shutterAmountConfig.mobile
  } else if (width <= 767) {
    shutterAmount = isLandscape ? shutterAmountConfig.mobileLandscape : shutterAmountConfig.mobile
  } else if (width <= 991) {
    shutterAmount = shutterAmountConfig.tablet
  }

  const shutters = panel.querySelectorAll('[data-transition-shutter]')

  if (shutters.length === shutterAmount) return

  const template = shutters[0] ?? createShutter()
  const frag = document.createDocumentFragment()

  for (let i = 0; i < shutterAmount; i++) {
    frag.appendChild(i === 0 && shutters.length === 0 ? template : template.cloneNode(true))
  }

  panel.replaceChildren(frag)
}

function runCoverAnimation(
  panel: HTMLDivElement,
  current: HTMLElement,
  onComplete: () => void,
): gsap.core.Timeline {
  generateShutters(panel)

  const allShutters = panel.querySelectorAll('[data-transition-shutter]')
  const tl = gsap.timeline({ onComplete })

  tl.set(
    panel,
    {
      opacity: 1,
      pointerEvents: 'none',
    },
    0,
  )

  tl.set(
    allShutters,
    {
      scaleY: 1.02,
      yPercent: 50,
      clipPath: 'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)',
    },
    0,
  )

  tl.to(
    allShutters,
    {
      duration: transitionDuration,
      ease: 'power3.in',
      yPercent: 0,
      clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
      stagger: {
        amount: shutterStaggerAmount,
        from: 'end',
      },
    },
    0,
  )

  tl.fromTo(
    current,
    {
      y: '0vh',
    },
    {
      y: '-15vh',
      ease: 'power3.in',
      duration: transitionDuration * 1.5,
    },
    0,
  )

  return tl
}

function runRevealAnimation(
  panel: HTMLDivElement,
  next: HTMLElement,
  onComplete: () => void,
): gsap.core.Timeline {
  const allShutters = panel.querySelectorAll('[data-transition-shutter]')
  const totalCoverDuration = transitionDuration + shutterStaggerAmount
  const tl = gsap.timeline()

  tl.set(
    next,
    {
      autoAlpha: 1,
    },
    0,
  )

  tl.to(
    allShutters,
    {
      duration: transitionDuration * 1.5,
      ease: 'expo.out',
      clipPath: 'polygon(0% 0%, 100% 0%, 100% -2%, 0% -2%)',
      yPercent: -50,
      stagger: {
        amount: shutterStaggerAmount,
        from: 'end',
      },
      overwrite: 'auto',
    },
    0,
  )

  tl.add('pageReady')
  tl.call(onComplete, [], 'pageReady')

  tl.from(
    next,
    {
      ease: 'expo.out',
      y: '20vh',
      duration: totalCoverDuration,
    },
    0,
  )

  return tl
}

export function usePageTransitionNavigate() {
  const ctx = useContext(PageTransitionContext)
  const router = useRouter()
  const fallback = useCallback(
    (href: string) => {
      router.push(href)
    },
    [router],
  )
  return ctx?.navigate ?? fallback
}

/** Runs once the shutters have cleared, so it must not move the scroll — that
 *  happens under the cover, in `scrollToTop`. */
function resetPageStyles(container: HTMLElement, lenis?: Lenis) {
  gsap.killTweensOf(container)
  gsap.set(container, { clearProps: 'all' })
  lenis?.start()
}

/** Lenis is stopped for the whole transition, and `scrollTo` is a no-op while it
 *  is stopped unless forced — without `force` only the window moved and Lenis
 *  kept its old target. */
function scrollToTop(lenis?: Lenis) {
  lenis?.scrollTo(0, { immediate: true, force: true })
  window.scrollTo(0, 0)
}

function splitHref(href: string) {
  const hashIndex = href.indexOf('#')
  if (hashIndex === -1) return { path: href || '/', hash: '' }
  return {
    path: href.slice(0, hashIndex) || '/',
    hash: href.slice(hashIndex + 1),
  }
}

/** Ease in-out cubic so nav jumps accelerate then settle, instead of snapping off. */
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/** Longer distances get more time; nearby sections stay snappy. */
function hashScrollDuration(distancePx: number) {
  const vh = window.innerHeight || 800
  return Math.min(2.15, Math.max(1.25, (Math.abs(distancePx) / vh) * 0.55))
}

function scrollToHash(hash: string, lenis?: Lenis, attempt = 0) {
  const id = hash.replace(/^#/, '')
  if (!id) return
  const el = document.getElementById(id)
  if (el) {
    const nextHash = `#${id}`
    if (window.location.hash !== nextHash) {
      history.pushState(
        history.state,
        '',
        `${window.location.pathname}${window.location.search}${nextHash}`,
      )
    }
    const distance = el.getBoundingClientRect().top
    if (lenis) {
      lenis.scrollTo(el, {
        immediate: prefersReducedMotion(),
        duration: hashScrollDuration(distance),
        easing: easeInOutCubic,
      })
    } else {
      const scrollMargin = Number.parseFloat(getComputedStyle(el).scrollMarginTop) || 0
      window.scrollTo({
        top: distance + window.scrollY - scrollMargin,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      })
    }
    return
  }
  if (attempt < 16) {
    requestAnimationFrame(() => scrollToHash(hash, lenis, attempt + 1))
  }
}

export default function PageTransition({
  children,
  aside,
}: {
  children: React.ReactNode
  aside?: React.ReactNode
}) {
  const lenis = useLenis()
  const pathname = usePathname()
  const router = useRouter()
  const [displayChildren, setDisplayChildren] = useState(children)
  const [phase, setPhase] = useState<Phase>('idle')
  const pageWrapRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const overlayRoot = useDocumentBody()

  const committedPathRef = useRef(pathname)
  const pendingNavRef = useRef<string | null>(null)
  const pendingHashRef = useRef<string | null>(null)
  const skipPathnameCoverRef = useRef(false)
  const coverHandledRef = useRef(false)
  const leaveTimelineRef = useRef<gsap.core.Timeline | null>(null)
  const enterTimelineRef = useRef<gsap.core.Timeline | null>(null)

  const phaseRef = useRef(phase)
  const childrenRef = useRef(children)
  const pathnameRef = useRef(pathname)

  useLayoutEffect(() => {
    phaseRef.current = phase
    childrenRef.current = children
    pathnameRef.current = pathname
  })

  useLayoutEffect(() => {
    const root = document.documentElement
    if (phase === 'idle') {
      delete root.dataset.pageTransition
      return
    }
    root.dataset.pageTransition = phase
    return () => {
      delete root.dataset.pageTransition
    }
  }, [phase])

  const attemptRevealToIdle = useCallback(() => {
    const wrap = pageWrapRef.current
    const panel = panelRef.current
    if (wrap) resetPageStyles(wrap, lenis)
    if (panel) gsap.set(panel, { opacity: 0 })
    setPhase('idle')
    committedPathRef.current = pathnameRef.current
    const hash = pendingHashRef.current || window.location.hash.replace(/^#/, '')
    pendingHashRef.current = null
    if (!hash) return
    if (window.location.hash !== `#${hash}`) {
      history.replaceState(history.state, '', `${pathnameRef.current}#${hash}`)
    }
    requestAnimationFrame(() => scrollToHash(hash, lenis))
  }, [lenis])

  const onCoverAnimationComplete = useCallback(() => {
    if (phaseRef.current !== 'cover') return
    if (coverHandledRef.current) return
    coverHandledRef.current = true

    if (pendingNavRef.current) {
      skipPathnameCoverRef.current = true
      router.push(pendingNavRef.current)
      return
    }

    setDisplayChildren(childrenRef.current)
    setPhase('reveal')
  }, [router])

  const navigate = useCallback(
    (href: string) => {
      const { path, hash } = href.startsWith('#')
        ? { path: pathnameRef.current, hash: href.slice(1) }
        : splitHref(href)
      if (path === pathnameRef.current) {
        if (hash) scrollToHash(hash, lenis)
        return
      }
      pendingNavRef.current = path
      pendingHashRef.current = hash || null
      coverHandledRef.current = false
      setPhase('cover')
    },
    [lenis],
  )

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest('a[href^="#"]')
      if (!(anchor instanceof HTMLAnchorElement)) return
      const hash = anchor.hash
      if (!hash || hash === '#') return
      event.preventDefault()
      scrollToHash(hash, lenis)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [lenis])

  useEffect(() => {
    if (phase !== 'idle') return
    if (pathname !== committedPathRef.current) return
    if (typeof window !== 'undefined' && window.location.pathname !== pathname) return
    queueMicrotask(() => setDisplayChildren(children))
  }, [children, pathname, phase])

  useLayoutEffect(() => {
    if (pathname === committedPathRef.current) return
    if (skipPathnameCoverRef.current) {
      skipPathnameCoverRef.current = false
      return
    }
    if (phaseRef.current === 'cover' || phaseRef.current === 'reveal') return
    pendingNavRef.current = null
    pendingHashRef.current = null
    coverHandledRef.current = false
    queueMicrotask(() => setPhase('cover'))
  }, [pathname])

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    const onPopState = () => {
      const nextPath = window.location.pathname
      if (nextPath === committedPathRef.current) return
      if (skipPathnameCoverRef.current) return
      if (phaseRef.current === 'cover' || phaseRef.current === 'reveal') return
      pendingNavRef.current = null
      pendingHashRef.current = null
      coverHandledRef.current = false
      setPhase('cover')
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (phase !== 'cover') return
    if (pendingNavRef.current == null) return
    const pendingPath = pendingNavRef.current || '/'
    if (pathname !== pendingPath) return
    setDisplayChildren(childrenRef.current)
    setPhase('reveal')
    pendingNavRef.current = null
  }, [pathname, phase, children])

  // Cover phase: shutters fill the screen
  useLayoutEffect(() => {
    if (phase !== 'cover') return
    if (typeof window === 'undefined') return
    registerGsap()

    const pageWrap = pageWrapRef.current
    const panel = panelRef.current
    if (!pageWrap || !panel) return

    if (enterTimelineRef.current) {
      enterTimelineRef.current.kill()
      enterTimelineRef.current = null
    }
    if (leaveTimelineRef.current) {
      leaveTimelineRef.current.kill()
      leaveTimelineRef.current = null
    }

    coverHandledRef.current = false
    lenis?.stop()

    const reducedMotion = prefersReducedMotion()
    if (reducedMotion) {
      const tl = gsap.timeline({ onComplete: onCoverAnimationComplete })
      leaveTimelineRef.current = tl
      tl.set(pageWrap, { autoAlpha: 0 })
      return () => {
        tl.kill()
        if (leaveTimelineRef.current === tl) leaveTimelineRef.current = null
      }
    }

    const tl = runCoverAnimation(panel, pageWrap, onCoverAnimationComplete)
    leaveTimelineRef.current = tl

    return () => {
      tl.kill()
      if (leaveTimelineRef.current === tl) leaveTimelineRef.current = null
    }
  }, [phase, onCoverAnimationComplete, lenis])

  // Reveal phase: shutters clear the screen
  useLayoutEffect(() => {
    if (phase !== 'reveal') return
    if (typeof window === 'undefined') return
    registerGsap()

    const pageWrap = pageWrapRef.current
    const panel = panelRef.current
    if (!pageWrap || !panel) return

    // Under the shutters: the new page is mounted but still covered, so the jump
    // to the top is never seen.
    scrollToTop(lenis)

    if (leaveTimelineRef.current) {
      leaveTimelineRef.current.kill()
      leaveTimelineRef.current = null
    }
    if (enterTimelineRef.current) {
      enterTimelineRef.current.kill()
      enterTimelineRef.current = null
    }

    const reducedMotion = prefersReducedMotion()
    if (reducedMotion) {
      const tl = gsap.timeline()
      enterTimelineRef.current = tl
      tl.set(pageWrap, { autoAlpha: 1 })
      tl.add('pageReady')
      tl.call(attemptRevealToIdle, [], 'pageReady')
      return () => {
        tl.kill()
        if (enterTimelineRef.current === tl) enterTimelineRef.current = null
      }
    }

    gsap.set(pageWrap, { autoAlpha: 1, y: 0 })
    const tl = runRevealAnimation(panel, pageWrap, attemptRevealToIdle)
    enterTimelineRef.current = tl

    return () => {
      tl.kill()
      if (enterTimelineRef.current === tl) enterTimelineRef.current = null
    }
  }, [phase, attemptRevealToIdle, lenis])

  const contextValue: PageTransitionContextValue = { navigate }

  const overlay = (
    <div
      data-transition-wrap
      data-active={phase !== 'idle' ? '' : undefined}
      className={styles.transition}
      aria-hidden={phase === 'idle'}
    >
      <div data-transition-panel ref={panelRef} className={styles.transition__panel} />
    </div>
  )

  return (
    <PageTransitionContext.Provider value={contextValue}>
      <div className={styles.wrapper}>
        {aside}
        <div ref={pageWrapRef} data-page-wrap className={styles.pageWrap}>
          {displayChildren}
        </div>
        {overlayRoot ? createPortal(overlay, overlayRoot) : overlay}
      </div>
    </PageTransitionContext.Provider>
  )
}
