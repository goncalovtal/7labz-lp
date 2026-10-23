'use client'

import { useEffect, useState, type RefObject } from 'react'

type Pool = {
  observer: IntersectionObserver
  callbacks: Map<Element, (visible: boolean) => void>
}

/**
 * One `IntersectionObserver` per root margin, shared by every subscriber. A page can
 * hold a hundred scroll reveals; a private observer for each of them is a measurable
 * cost on the main thread every time the document scrolls.
 */
const pools = new Map<string, Pool>()

function getPool(rootMargin: string): Pool {
  let pool = pools.get(rootMargin)
  if (pool) return pool

  const callbacks = new Map<Element, (visible: boolean) => void>()
  const observer = new IntersectionObserver(
    entries => {
      for (const entry of entries) callbacks.get(entry.target)?.(entry.isIntersecting)
    },
    { rootMargin },
  )

  pool = { observer, callbacks }
  pools.set(rootMargin, pool)
  return pool
}

export function observeInView(
  element: Element,
  rootMargin: string,
  onChange: (visible: boolean) => void,
): () => void {
  const pool = getPool(rootMargin)
  pool.callbacks.set(element, onChange)
  pool.observer.observe(element)

  return () => {
    pool.callbacks.delete(element)
    pool.observer.unobserve(element)
  }
}

/** Flips to `true` the first time the element intersects, then stops observing. */
export function useInViewOnce(ref: RefObject<Element | null>, rootMargin: string): boolean {
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    let stop: (() => void) | null = null
    let done = false

    // Nothing to observe with: reveal rather than leave the content invisible.
    if (typeof IntersectionObserver === 'undefined') {
      queueMicrotask(() => {
        if (!done) setInView(true)
      })
      return () => {
        done = true
      }
    }

    stop = observeInView(element, rootMargin, visible => {
      if (!visible || done) return
      done = true
      setInView(true)
      stop?.()
      stop = null
    })

    if (done) {
      stop()
      stop = null
    }

    return () => stop?.()
  }, [ref, rootMargin])

  return inView
}
