'use client'

import { gsap, prefersReducedMotion } from '@/lib/gsap'
import { observeInView } from '@/lib/inView'
import { latticeHash, smoothNoise } from '@/lib/pixelField'
import { useEffect, useRef } from 'react'

import styles from './DitherField.module.scss'

/** CSS px between dot centres, and each dot's side. */
const SPACING = 9
const DOT = 1.25

function mix(hex: string, amount: number) {
  const n = Number.parseInt(hex.slice(1), 16)
  const channel = (c: number) => Math.round(255 + (c - 255) * amount)
  return `rgb(${channel(n >> 16)} ${channel((n >> 8) & 255)} ${channel(n & 255)})`
}

/** Tones from barely-there to darkest. The dither picks one per dot. */
const TONES = ['#f2f2f2', '#dcdcdc', '#bdbdbd', '#8f8f8f']

/** Near the cursor dots take these instead: indigo on the swell, green on the ring crests. */
const INDIGO = [0.22, 0.4, 0.65, 0.95].map(a => mix('#2b16a0', a))
const GREEN = [0.35, 0.55, 0.8, 1].map(a => mix('#16c784', a))
const PALETTES = [TONES, INDIGO, GREEN]

/** 4×4 Bayer matrix, normalised to [0, 1) — the ordered dither threshold per grid cell. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16)

/** Cursor influence radius in CSS px. */
const MOUSE_RADIUS = 260

/** Ambient wave field: long, overlapping sine bands drifting slowly. */
function waves(x: number, y: number, t: number) {
  return (
    Math.sin(x * 0.0042 + y * 0.0016 + t * 0.35) * 0.5 +
    Math.sin(x * -0.0021 + y * 0.0049 - t * 0.27) * 0.35 +
    Math.sin((x + y) * 0.0028 + t * 0.18) * 0.25
  )
}

/** Dither dot field that fills its parent and reacts to the pointer anywhere over it. */
export default function DitherField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const section = canvas?.parentElement
    const ctx = canvas?.getContext('2d')
    if (!section || !canvas || !ctx) return

    const reducedMotion = prefersReducedMotion()
    const levels = TONES.length - 1
    const reach = MOUSE_RADIUS * 2.5

    let width = 0
    let height = 0
    let cols = 0
    let rows = 0
    let offsetX = 0
    let offsetY = 0

    const target = { x: 0, y: 0, presence: 0 }
    const mouse = { x: 0, y: 0, presence: 0 }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = section.clientWidth
      height = section.clientHeight
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cols = Math.ceil(width / SPACING) + 1
      rows = Math.ceil(height / SPACING) + 1
      offsetX = (width - (cols - 1) * SPACING) / 2
      offsetY = (height - (rows - 1) * SPACING) / 2
    }

    const draw = (t: number) => {
      mouse.x += (target.x - mouse.x) * 0.08
      mouse.y += (target.y - mouse.y) * 0.08
      mouse.presence += (target.presence - mouse.presence) * 0.05

      ctx.clearRect(0, 0, width, height)

      // One path per palette tone keeps it to twelve fills a frame, however many dots there are.
      const paths = PALETTES.map(palette => palette.map(() => new Path2D()))
      const half = DOT / 2

      for (let row = 0; row < rows; row++) {
        const y = offsetY + row * SPACING
        for (let col = 0; col < cols; col++) {
          const x = offsetX + col * SPACING
          const threshold = BAYER[(row & 3) * 4 + (col & 3)]
          let v = waves(x, y, t)
          let palette = 0

          // The cursor swells the field into an organic patch: noise warps its edge so it
          // isn't a circle, drifting noise blotches replace concentric rings, and a little
          // per-dot flicker breaks it up further. Its reach is dithered too — the transposed
          // Bayer cell decides which dots take the tint, so the patch fades out in stipple.
          if (mouse.presence > 0.001) {
            const dx = x - mouse.x
            const dy = y - mouse.y
            const d = Math.sqrt(dx * dx + dy * dy)
            if (d < reach) {
              const warp = 0.7 + smoothNoise(x * 0.013 + t * 0.35, y * 0.013 - t * 0.3) * 1.1
              const r = d * warp
              const falloff = Math.exp(-(r * r) / (MOUSE_RADIUS * MOUSE_RADIUS)) * mouse.presence
              const blotch =
                smoothNoise(x * 0.018 + t * 0.6, y * 0.018 - t * 0.45) * 0.65 +
                smoothNoise(x * 0.045 - t * 0.9, y * 0.045 + t * 0.7) * 0.35
              const flicker = latticeHash(col + Math.floor(t * 8) * 7919, row) - 0.5
              v += falloff * (0.7 + (blotch - 0.5) * 1.6 + flicker * 0.5)

              const tintThreshold = BAYER[(col & 3) * 4 + (row & 3)]
              if (falloff * (blotch * 1.9 - 0.15) > tintThreshold) {
                const scatter = smoothNoise(x * 0.03 + t * 0.8 + 57, y * 0.03 - t * 0.6 + 91)
                const green = (scatter - 0.5) / 0.25
                palette = green > latticeHash(col, row) ? 2 : 1
              }
            }
          }

          const level = Math.min(1, Math.max(0, v * 0.42 + 0.32)) * levels
          const base = Math.floor(level)
          const tone = Math.min(levels, base + (level - base > threshold ? 1 : 0))
          paths[palette][tone].rect(x - half, y - half, DOT, DOT)
        }
      }

      paths.forEach((tones, p) =>
        tones.forEach((path, i) => {
          ctx.fillStyle = PALETTES[p][i]
          ctx.fill(path)
        }),
      )
    }

    // The ambient drift is slow enough to read the same at 30 frames a second; the cursor
    // patch, while it's there or still fading, gets 60.
    let lastDrawn = -1
    const tick = (time: number) => {
      const active = target.presence > 0 || mouse.presence > 0.01
      const interval = active ? 1 / 60 : 1 / 30
      if (time - lastDrawn < interval - 1 / 240) return
      lastDrawn = time
      draw(time)
    }

    const onPointerMove = (event: PointerEvent) => {
      const rect = section.getBoundingClientRect()
      target.x = event.clientX - rect.left
      target.y = event.clientY - rect.top
      if (target.presence === 0) {
        mouse.x = target.x
        mouse.y = target.y
      }
      target.presence = 1
    }

    const onPointerLeave = () => {
      target.presence = 0
    }

    resize()
    draw(0)

    const resizeObserver = new ResizeObserver(() => {
      resize()
      if (reducedMotion) draw(0)
    })
    resizeObserver.observe(section)

    if (reducedMotion) {
      return () => resizeObserver.disconnect()
    }

    section.addEventListener('pointermove', onPointerMove)
    section.addEventListener('pointerleave', onPointerLeave)

    let running = false
    const stopObserving = observeInView(section, '0px', visible => {
      if (visible === running) return
      running = visible
      if (visible) gsap.ticker.add(tick)
      else gsap.ticker.remove(tick)
    })

    return () => {
      stopObserving()
      gsap.ticker.remove(tick)
      resizeObserver.disconnect()
      section.removeEventListener('pointermove', onPointerMove)
      section.removeEventListener('pointerleave', onPointerLeave)
    }
  }, [])

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
}
