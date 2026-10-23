/** A glyph cell's width over its height. */
const CELL_ASPECT = 0.6

type Shade = (u: number, v: number) => number

type Point = readonly [number, number]

function inPolygon([x, y]: Point, polygon: readonly Point[]) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** A lit box: brightest at its top-left, darkening toward the bottom-right. */
function box(u: number, v: number, x0: number, y0: number, x1: number, y1: number, lit = 1) {
  if (u < x0 || u > x1 || v < y0 || v > y1) return 0
  const t = ((u - x0) / (x1 - x0) + (v - y0) / (y1 - y0)) / 2
  return Math.max(0.12, (0.95 - t * 0.6) * lit)
}

/** A lit ball: brightest toward the upper left, falling off into its shadow side. */
function sphere(u: number, v: number, cx: number, cy: number, r: number) {
  const x = (u - cx) / r
  const y = (v - cy) / r
  const d = x * x + y * y
  if (d > 1) return 0
  const z = Math.sqrt(1 - d)
  return Math.max(0.12, z * 0.55 + (-x - y) * 0.3 + 0.15)
}

const R = 0.92
const C30 = Math.cos(Math.PI / 6)
const TOP: Point = [0, -R]
const UPPER_RIGHT: Point = [R * C30, -R / 2]
const LOWER_RIGHT: Point = [R * C30, R / 2]
const BOTTOM: Point = [0, R]
const LOWER_LEFT: Point = [-R * C30, R / 2]
const UPPER_LEFT: Point = [-R * C30, -R / 2]
const CENTRE: Point = [0, 0]

/** Four bars climbing, each lit from the top down. */
function bars(u: number, v: number) {
  const bar = Math.floor((u + 1) * 2)
  if (bar < 0 || bar > 3) return 0
  const local = (u + 1) * 2 - bar
  if (local > 0.72) return 0
  const top = 0.5 - bar * 0.45
  if (v < top || v > 0.9) return 0
  return 0.3 + (1 - (v - top) / (0.9 - top)) * 0.65
}

/** Every mark, shaded over [-1, 1] on both axes. */
const SHADES = {
  // Map: one business, looked at whole.
  map: (u, v) => sphere(u, v, 0, 0, 0.9),
  // Build: an isometric block, three faces in three lights.
  build: (u, v) => {
    const p: Point = [u, v]
    if (inPolygon(p, [CENTRE, UPPER_LEFT, TOP, UPPER_RIGHT])) return 0.95
    if (inPolygon(p, [CENTRE, UPPER_LEFT, LOWER_LEFT, BOTTOM])) return 0.55
    if (inPolygon(p, [CENTRE, UPPER_RIGHT, LOWER_RIGHT, BOTTOM])) return 0.28
    return 0
  },
  // Ship: four bars climbing, each lit from the top down.
  ship: bars,
  // Back: two forms overlapping, brightest where they share ground.
  back: (u, v) => {
    const a = sphere(u, v, -0.33, 0.05, 0.62)
    const b = sphere(u, v, 0.33, -0.05, 0.62)
    return a && b ? Math.min(1, Math.max(a, b) + 0.3) : Math.max(a, b) * 0.75
  },
  // CRM: a funnel, wide at the top, lit down its length.
  crm: (u, v) => {
    if (v < -0.9 || v > 0.9) return 0
    const t = (v + 0.9) / 1.8
    const half = 1.2 - t * 1.0
    if (Math.abs(u) > half) return 0
    return 0.95 - t * 0.5
  },
  // Automations: three nodes on a line, each passing the light along.
  automations: (u, v) => {
    const rail = Math.abs(v) < 0.1 && Math.abs(u) < 1.15 ? 0.3 : 0
    const nodes = [-1, 0, 1].map((cx, i) => sphere(u, v, cx * 0.95, 0, 0.3) * (1 - i * 0.2))
    return Math.max(rail, ...nodes)
  },
  // Internal tools: a panel with three inner blocks, like a dashboard.
  tools: (u, v) => {
    const frame = box(u, v, -1.25, -0.85, 1.25, 0.85, 0.35)
    const a = box(u, v, -1.05, -0.65, -0.1, 0.1)
    const b = box(u, v, 0.1, -0.65, 1.05, 0.1, 0.8)
    const c = box(u, v, -1.05, 0.3, 1.05, 0.65, 0.6)
    return Math.max(frame, a, b, c)
  },
  // Websites: a browser window, bright bar on top.
  websites: (u, v) => {
    const frame = box(u, v, -1.25, -0.85, 1.25, 0.85, 0.35)
    const bar = box(u, v, -1.25, -0.85, 1.25, -0.5)
    const hero = box(u, v, -1.05, -0.3, 0.3, 0.65, 0.7)
    return Math.max(frame, bar, hero)
  },
  // AI products: a four-point star, hot at its core.
  ai: (u, v) => {
    const x = Math.abs(u) / 1.1
    const y = Math.abs(v) / 0.95
    const d = Math.sqrt(x) + Math.sqrt(y)
    if (d > 1) return 0
    return Math.max(0.15, 1 - d * 0.85)
  },
  // Growth: four bars climbing, each lit from the top down.
  growth: bars,
} satisfies Record<string, Shade>

export type Mark = keyof typeof SHADES

/** A mark's brightness at a point of [-1, 1] × [-1, 1]. */
export function markShade(mark: Mark, u: number, v: number) {
  return (SHADES[mark] as Shade)(u, v)
}

/** Horizontal sample position for a column, stretched so cells read as square. */
export function markU(col: number, cols: number, rows: number) {
  return (((col + 0.5) / cols) * 2 - 1) * ((cols * CELL_ASPECT) / rows)
}
