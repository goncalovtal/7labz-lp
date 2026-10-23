'use client'

import { useSyncExternalStore } from 'react'

/** The portal host never changes, so there is nothing to subscribe to. */
const subscribe = () => () => {}

const getSnapshot = () => document.body

const getServerSnapshot = () => null

/**
 * `document.body` on the client, `null` during the server render — for components
 * that portal into the body. Reading it through a store rather than syncing it
 * into state on mount keeps the value out of render-triggering effects.
 */
export function useDocumentBody(): HTMLElement | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
