/**
 * Preloader milestones. `reveal` fires as the overlay starts opening onto the page, so
 * intros can play through the reveal; `done` fires once it has fully cleared. On later
 * client navigations both have long fired, so subscribers run immediately.
 */
type Milestone = 'reveal' | 'done'

const reached = new Set<Milestone>()
const listeners: Record<Milestone, Set<() => void>> = { reveal: new Set(), done: new Set() }

export function markPreloader(milestone: Milestone) {
  if (reached.has(milestone)) return
  reached.add(milestone)
  listeners[milestone].forEach(listener => listener())
  listeners[milestone].clear()
}

export function onPreloader(milestone: Milestone, listener: () => void): () => void {
  if (reached.has(milestone)) {
    listener()
    return () => {}
  }
  listeners[milestone].add(listener)
  return () => listeners[milestone].delete(listener)
}
