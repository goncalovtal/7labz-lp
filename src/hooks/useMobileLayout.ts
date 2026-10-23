'use client'

import { useMediaQuery } from '@/lib/mediaQuery'

/** Aligns with layout breakpoints (`utils.$bp-md` − 1px). */
export const MOBILE_LAYOUT_MQ = '(max-width: 767.98px)'

export function useMobileLayout() {
  return useMediaQuery(MOBILE_LAYOUT_MQ)
}
