'use client'

import { gsap, prefersReducedMotion } from '@/lib/gsap'
import { markShade, markU, type Mark } from '@/lib/glyphMarks'
import { observeInView } from '@/lib/inView'
import { cellNoise, measureCellWidth, PIXEL_RAMP, prepareCanvas, rampIndex } from '@/lib/pixelField'
import { useEffect, useRef } from 'react'

import styles from './LiveMark.module.scss'

/**
 * A glyph mark drawn live on a canvas. It breathes: a slow wave of light drifts across
 * it and the odd cell flickers. When the mark changes it doesn't cut or fade: the two
 * shapes' brightness fields blend, each cell on its own slightly different clock, and
 * cells caught mid-change scatter, so one shape dithers into the next. A change that lands
 * mid-morph starts from whatever is on screen at that moment, so fast scrolling through
 * several marks flows through them instead of snapping back. With `enter` it starts
 * empty and dithers in, cell by cell, the first time it scrolls into view.
 *
 * Kept cheap: each mark's shape is sampled once and cached, glyphs are stamped from a
 * pre-drawn atlas instead of laid out as text, and at rest it redraws at 30 frames a
 * second, since the drifting light is too slow to need more. Morphs get every frame.
 */

const MAX_DPR = 2
const HEAT_BUCKETS = 10
/** How long one mark takes to become the next, in seconds. */
const MORPH = 1.1
/** Spread of the cells' clocks through the morph, as a share of it. */
const MORPH_SCATTER = 0.45
/** How far a cell caught mid-change is thrown, in px. */
const THROW = 7
/** Ambient wave: how much it brightens, and its speed. */
const WAVE = 0.1
const WAVE_SPEED = 0.9
/** Chance per frame that a lit cell sparks brighter for a frame. */
const FLICKER = 0.012
/** How long the entrance takes, in seconds. */
const ENTER = 1.6
/** Redraw rate while nothing is morphing. */
const IDLE_FPS = 30

type Rgb = readonly [number, number, number]

type Props = {
  mark: Mark
  cols?: number
  rows?: number
  fontSize?: number
  color?: Rgb
  /** Start empty and dither in on first view, after `delay` seconds. */
  enter?: boolean
  delay?: number
  className?: string
}

export default function LiveMark({
  mark,
  cols = 44,
  rows = 24,
  fontSize = 13,
  color = [202, 193, 255],
  enter = false,
  delay = 0,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const draw = useRef<((frame: number) => void) | null>(null)
  /** Snapshot the field as it is now into `from`, so the next morph starts from it. */
  const freeze = useRef<(() => void) | null>(null)
  /** `from` is a sampled field, not a mark, so it can hold a half-finished blend. */
  const state = useRef({ from: null as Float32Array | null, to: mark, mix: 1 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const still = prefersReducedMotion()
    const fontFamily = getComputedStyle(canvas).fontFamily || 'monospace'
    const [r, g, b] = color
    const fills = Array.from({ length: HEAT_BUCKETS }, (_, i) => {
      const t = (i + 0.5) / HEAT_BUCKETS
      return `rgba(${r},${g},${b},${(0.3 + 0.7 * t).toFixed(3)})`
    })

    const cellH = fontSize
    let cellW = fontSize * 0.6
    let dpr = 1

    /** Every glyph pre-drawn at every heat: a column per glyph, a row per heat bucket. */
    const atlas = document.createElement('canvas')
    const atlasCtx = atlas.getContext('2d')
    const buildAtlas = () => {
      if (!atlasCtx) return
      prepareCanvas(
        atlas,
        atlasCtx,
        PIXEL_RAMP.length * cellW,
        HEAT_BUCKETS * cellH,
        dpr,
        fontFamily,
        fontSize,
      )
      for (let bucket = 0; bucket < HEAT_BUCKETS; bucket++) {
        atlasCtx.fillStyle = fills[bucket]
        for (let i = 0; i < PIXEL_RAMP.length; i++) {
          atlasCtx.fillText(PIXEL_RAMP[i], (i + 0.5) * cellW, (bucket + 0.5) * cellH)
        }
      }
    }

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      // Measure the advance first so the canvas is sized to a whole number of cells.
      ctx.font = `${fontSize}px ${fontFamily}`
      cellW = measureCellWidth(ctx)
      prepareCanvas(canvas, ctx, cellW * cols, cellH * rows, dpr, fontFamily, fontSize)
      buildAtlas()
    }

    /** Each mark's brightness field, sampled once and reused every frame after. */
    const fields = new Map<Mark, Float32Array>()
    const fieldFor = (target: Mark) => {
      let field = fields.get(target)
      if (field) return field
      field = new Float32Array(cols * rows)
      for (let row = 0; row < rows; row++) {
        const v = ((row + 0.5) / rows) * 2 - 1
        for (let col = 0; col < cols; col++) {
          field[row * cols + col] = markShade(target, markU(col, cols, rows), v)
        }
      }
      fields.set(target, field)
      return field
    }

    /** A cell's blend between `from` and `to`, eased on that cell's own clock. */
    const blendAt = (index: number, mix: number) => {
      const offset = cellNoise(index + 911) * MORPH_SCATTER
      const local = Math.min(1, Math.max(0, (mix - offset) / (1 - MORPH_SCATTER)))
      return local * local * (3 - 2 * local)
    }

    freeze.current = () => {
      const { from, to, mix } = state.current
      const target = fieldFor(to)
      const field = new Float32Array(cols * rows)
      for (let index = 0; index < field.length; index++) {
        if (!from || mix >= 1) {
          field[index] = target[index]
        } else {
          const eased = blendAt(index, mix)
          field[index] = from[index] * (1 - eased) + target[index] * eased
        }
      }
      state.current.from = field
    }

    draw.current = (frame: number) => {
      const { from, to, mix } = state.current
      const morphing = from !== null && mix < 1
      const target = fieldFor(to)
      const t = performance.now() / 1000
      const spriteW = cellW * dpr
      const spriteH = cellH * dpr
      ctx.clearRect(0, 0, cellW * cols, cellH * rows)

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const index = row * cols + col
          let value = target[index]
          let x = (col + 0.5) * cellW
          let y = (row + 0.5) * cellH

          if (morphing) {
            // Each cell crosses over at its own moment within the morph, so the change
            // dithers through the shape rather than sweeping it in one go.
            const eased = blendAt(index, mix)
            value = from![index] * (1 - eased) + value * eased
            // Cells caught in the middle are thrown a little, and settle as they land.
            const unrest = Math.sin(eased * Math.PI)
            x += (cellNoise(index * 3 + frame * 131) - 0.5) * THROW * unrest * 2
            y += (cellNoise(index * 7 + frame * 173) - 0.5) * THROW * unrest * 2
          }
          if (value <= 0.05) continue

          if (!still) {
            value *= 1 + WAVE * Math.sin(col * 0.35 + row * 0.2 - t * WAVE_SPEED * 2)
            if (cellNoise(index + frame * 7919) < FLICKER) value = Math.min(1, value + 0.35)
          }
          value = Math.min(1, value)
          const bucket = Math.min(HEAT_BUCKETS - 1, (value * HEAT_BUCKETS) | 0)
          ctx.drawImage(
            atlas,
            rampIndex(value) * spriteW,
            bucket * spriteH,
            spriteW,
            spriteH,
            x - cellW * 0.5,
            y - cellH * 0.5,
            cellW,
            cellH,
          )
        }
      }
    }

    // An entrance is a morph from an empty field.
    const entering = enter && !still && state.current.mix >= 1
    if (entering) {
      state.current.from = new Float32Array(cols * rows)
      state.current.mix = 0
    }

    resize()
    draw.current(0)
    if (still) return

    let entrance: gsap.core.Tween | null = null
    const stopWaiting = entering
      ? observeInView(canvas, '0px 0px -15% 0px', visible => {
          if (!visible || entrance) return
          entrance = gsap.to(state.current, {
            mix: 1,
            duration: ENTER,
            delay,
            ease: 'power2.out',
          })
        })
      : () => {}

    let rafId = 0
    let frame = 0
    let lastDrawn = 0
    const loop = (now: number) => {
      const current = state.current
      const morphing = current.from !== null && current.mix < 1
      if (morphing || now - lastDrawn >= 1000 / IDLE_FPS - 2) {
        lastDrawn = now
        draw.current?.(frame++)
      }
      rafId = requestAnimationFrame(loop)
    }
    const stopObserving = observeInView(canvas, '10% 0px', visible => {
      if (visible && !rafId) rafId = requestAnimationFrame(loop)
      if (!visible && rafId) {
        cancelAnimationFrame(rafId)
        rafId = 0
      }
    })
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    return () => {
      cancelAnimationFrame(rafId)
      stopWaiting()
      entrance?.kill()
      stopObserving()
      observer.disconnect()
      draw.current = null
      freeze.current = null
    }
    // The colour is a tuple literal at call sites; key on its value, not its identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cols, rows, fontSize, color.join(), enter, delay])

  // A new mark starts a morph from whatever is on screen right now, so quick changes
  // blend rather than snap.
  useEffect(() => {
    const current = state.current
    if (current.to === mark) return
    freeze.current?.()
    current.to = mark
    if (prefersReducedMotion()) {
      current.mix = 1
      draw.current?.(0)
      return
    }
    current.mix = 0
    const tween = gsap.to(current, { mix: 1, duration: MORPH, ease: 'power2.inOut' })
    return () => {
      tween.kill()
    }
  }, [mark])

  return <canvas ref={canvasRef} className={[styles.mark, className].filter(Boolean).join(' ')} />
}
