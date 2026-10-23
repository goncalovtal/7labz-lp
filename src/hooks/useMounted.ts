'use client'

import { useEffect, useState } from 'react'

/** True only after mount — use to avoid SSR/client mismatch on scroll-dependent or time-based UI. */
export function useMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    queueMicrotask(() => setMounted(true))
  }, [])
  return mounted
}
