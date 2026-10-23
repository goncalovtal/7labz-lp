'use client'

import { useSyncExternalStore } from 'react'

type MediaQueryStore = {
  subscribe: (onStoreChange: () => void) => () => void
  getSnapshot: () => boolean
}

/**
 * One `MediaQueryList` per query for the whole app. Components used dozens of times
 * on a page (`TextReveal`) would otherwise allocate a list object on every render and
 * a native listener per instance.
 */
const stores = new Map<string, MediaQueryStore>()

function createStore(query: string): MediaQueryStore {
  const listeners = new Set<() => void>()
  let mql: MediaQueryList | null = null
  let matches = false

  const onChange = () => {
    matches = mql?.matches ?? false
    for (const listener of listeners) listener()
  }

  const ensure = () => {
    if (mql || typeof window === 'undefined') return
    mql = window.matchMedia(query)
    matches = mql.matches
    mql.addEventListener('change', onChange)
  }

  return {
    subscribe(onStoreChange) {
      ensure()
      listeners.add(onStoreChange)
      return () => {
        listeners.delete(onStoreChange)
      }
    },
    getSnapshot() {
      ensure()
      return matches
    },
  }
}

export function getMediaQueryStore(query: string): MediaQueryStore {
  let store = stores.get(query)
  if (!store) {
    store = createStore(query)
    stores.set(query, store)
  }
  return store
}

function getServerSnapshot() {
  return false
}

export function useMediaQuery(query: string): boolean {
  const store = getMediaQueryStore(query)
  return useSyncExternalStore(store.subscribe, store.getSnapshot, getServerSnapshot)
}

/** Read once, outside React. Returns `false` during SSR. */
export function matchesMediaQuery(query: string): boolean {
  if (typeof window === 'undefined') return false
  return getMediaQueryStore(query).getSnapshot()
}
