/** Shared building blocks for character-grid effects. Ported from the verteal portfolio. */

/** ASCII density ramp, ordered faint → dense. */
export const PIXEL_RAMP = ['.', ':', '-', '+', '*', '#', '%'] as const

/** Deterministic per-index noise, so a cell's grain stays put frame to frame. */
export function cellNoise(index: number) {
  let h = Math.imul(index, 374761393) + 668265263
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** Integer hash of a lattice point to [0, 1). */
export function latticeHash(x: number, y: number) {
  let h = (x * 374761393 + y * 668265263) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** Smooth value noise in [0, 1]. */
export function smoothNoise(x: number, y: number) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const u = fx * fx * (3 - 2 * fx)
  const v = fy * fy * (3 - 2 * fy)
  const a = latticeHash(ix, iy)
  const b = latticeHash(ix + 1, iy)
  const c = latticeHash(ix, iy + 1)
  const d = latticeHash(ix + 1, iy + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

/** Index into the ramp for a heat value, biased upward so hot cells reach the densest marks. */
export function rampIndex(t: number) {
  const curved = Math.pow(t < 0 ? 0 : t > 1 ? 1 : t, 0.7)
  const index = (curved * PIXEL_RAMP.length) | 0
  return index >= PIXEL_RAMP.length ? PIXEL_RAMP.length - 1 : index
}

/** Pick the glyph for a heat value. */
export function rampGlyph(t: number) {
  return PIXEL_RAMP[rampIndex(t)]
}

/** Size a canvas to its CSS box at the device pixel ratio and apply the grid font. */
export function prepareCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dpr: number,
  fontFamily: string,
  fontSize: number,
) {
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.font = `${fontSize}px ${fontFamily}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
}

/** Measure the monospace advance so full-density glyphs tile the grid. */
export function measureCellWidth(ctx: CanvasRenderingContext2D) {
  return Math.max(4, ctx.measureText('%').width)
}
