'use client'

import { gsap, prefersReducedMotion, registerGsap } from '@/lib/gsap'
import { observeInView } from '@/lib/inView'
import { cellNoise, measureCellWidth, prepareCanvas, PIXEL_RAMP, rampIndex } from '@/lib/pixelField'
import { onPreloader } from '@/lib/preloader'
import { useEffect, useRef } from 'react'

import styles from './PixelPortrait.module.scss'

/**
 * Renders an image as glyph chiaroscuro: every cell of a character grid samples the
 * image's brightness, and brighter means a denser glyph in a stronger colour, so the
 * painting's light and shadow come through in type. Given a video it loops the clip,
 * re-reading every frame, so the subject moves in glyphs; it fades in as the preloader
 * opens and pauses whenever it's off screen. It repaints only when something changed: a
 * new video frame, the pointer, the entrance. Glyphs are stamped from a pre-drawn atlas
 * rather than laid out as text. The pointer works as a soft flashlight,
 * coaxing detail out of the shadows and setting the glyphs under it astir. Scrolling
 * speeds the clip up at once with the scroll's pace, easing back once it stops.
 */

const MAX_DPR = 2
const HEAT_BUCKETS = 12

/**
 * Brightness levels: below `BLACK` is background and drops out, `WHITE` is full ink.
 * The footage is graded to a true-black background, so `BLACK` can sit low enough to
 * keep the hand's shadow side; a strong gamma then lifts those shadows into faint glyphs
 * so the hand's edge fades off softly instead of being cut away.
 */
const BLACK = 0.06
const WHITE = 0.5
const GAMMA = 0.6
/** Cells dimmer than this after levels aren't drawn at all. */
const CUTOFF = 0.05

/**
 * Silhouette fill. The brightness map is blurred over `FILL_RADIUS` cells; wherever the
 * blur says "hand" (above `FILL_FROM`), a cell gets at least `FILL_FLOOR`, so the hand's
 * shadow side reads as faint glyphs instead of being cut away. Far from the hand the
 * blur is zero, so the background stays clean.
 */
const FILL_RADIUS = 2
const FILL_FROM = 0.05
const FILL_TO = 0.22
const FILL_FLOOR = 0.32
/** Below this blurred brightness a cell is a stray compression speck, not the hand. */
const SPECK_BLUR = 0.025

/** Most repaints a second that new video frames alone can trigger. */
const VIDEO_FPS = 30

/** Extra playback speed per px scrolled in a frame, and the most it can add. */
const SCROLL_BOOST = 0.4
const MAX_BOOST = 5
/** How fast the speed climbs to the scroll's pace, and how slowly it falls back. */
const BOOST_ATTACK = 0.5
const BOOST_RELEASE = 0.04

/** Share of the image's width, at each side, over which it fades out, so no edge shows. */
const EDGE_FEATHER = 0.14
/** Flashlight radius, as a share of the drawn image's height. */
const LIGHT_RADIUS = 0.16
/** How far the light lowers the black point, revealing what the shadows hide. */
const LIGHT_REVEAL = 0.18
/** Chance per frame that a glyph under the light re-picks itself. */
const LIGHT_FLICKER = 0.4
/** How far glyphs under the pointer are shoved outward at its centre, in px. */
const PUSH = 22
/** Per-frame tremble of displaced glyphs, in px at full strength. */
const JITTER = 2.5

type Rgb = readonly [number, number, number]

type Options = {
  /** Still image: shown with reduced motion, and the shape the clip settles into. */
  src: string
  /** Optional clip played once as the entrance, ending where `video` begins. */
  intro?: string
  /** First frame of `intro`, drawn while the clips load so the entrance never waits. */
  poster?: string
  /** Optional looping clip of the subject moving; `src` is its still stand-in. */
  video?: string
  color: Rgb
  /** Drawn image height as a share of the host's height; over 1 runs past the bottom. */
  heightShare: number
  /** Where the image's top edge sits, as a share of the host's height. */
  topShare: number
  /** Glyph size in px; smaller means a finer grid. */
  fontSize: number
  /** Playback speed the clip rests at; scrolling speeds it up from there. */
  speed: number
}

function initPixelPortrait(host: HTMLElement, canvas: HTMLCanvasElement, options: Options) {
  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) return () => {}

  const still = prefersReducedMotion()
  const fontFamily = getComputedStyle(host).fontFamily || 'monospace'
  const [r, g, b] = options.color
  const fills = Array.from({ length: HEAT_BUCKETS }, (_, i) => {
    const t = (i + 0.5) / HEAT_BUCKETS
    return `rgba(${r},${g},${b},${(0.42 + 0.58 * t).toFixed(3)})`
  })

  let width = 0
  let height = 0
  let dpr = 1
  const fontSize = options.fontSize
  let cellW = fontSize * 0.6
  const cellH = fontSize

  /** Every glyph pre-drawn at every heat: a column per glyph, a row per heat bucket. */
  const atlas = document.createElement('canvas')
  const atlasCtx = atlas.getContext('2d')
  function buildAtlas() {
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

  // The image's grid: where it sits, and each of its cells' raw brightness.
  let imgCols = 0
  let imgRows = 0
  let originX = 0
  let originY = 0
  let luminance = new Float32Array(0)
  /** `luminance` box-blurred, used to find the hand's silhouette. */
  let blurred = new Float32Array(0)
  let blurScratch = new Float32Array(0)

  /** What's being drawn: the reveal clip while it plays, the still otherwise. */
  let source: HTMLImageElement | HTMLVideoElement | null = null
  let sourceW = 0
  let sourceH = 0
  /** True while the clip is playing and every frame needs re-reading. */
  let streaming = false
  /**
   * Entrance, 0 → 1. Glyphs don't all fade together: each cell has its own moment,
   * scattered but sweeping from the bottom of the image up, so the hand gathers out of
   * the page from wrist to fingertip while the layer as a whole eases in.
   */
  const fade = { value: still ? 1 : 0 }
  const probe = document.createElement('canvas')
  const probeCtx = probe.getContext('2d', { willReadFrequently: true })

  const pointer = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4, strength: 0, target: 0 }

  let rafId = 0
  let disposed = false
  let visible = true
  /** A fresh video frame is waiting to be read. */
  let newFrame = false

  /** Size the glyph grid to the source at its drawn size. */
  function layout() {
    if (!sourceW || !width) return
    const bandH = height * options.heightShare
    const drawH = Math.min(bandH, (width * 0.94 * sourceH) / sourceW)
    const drawW = drawH * (sourceW / sourceH)
    imgCols = Math.max(1, Math.round(drawW / cellW))
    imgRows = Math.max(1, Math.round(drawH / cellH))
    originX = (width - imgCols * cellW) / 2
    // On narrow screens the width caps the image, so it comes out shorter than its band:
    // centre it in the band rather than leave the gap all below it.
    originY = height * options.topShare + (bandH - drawH) / 2
    probe.width = imgCols
    probe.height = imgRows
    luminance = new Float32Array(imgCols * imgRows)
    blurred = new Float32Array(imgCols * imgRows)
    blurScratch = new Float32Array(imgCols * imgRows)
  }

  /** Downsample the current frame to one pixel per cell and read its brightness back. */
  function readFrame() {
    if (!source || !probeCtx || !luminance.length) return
    newFrame = false
    probeCtx.drawImage(source, 0, 0, imgCols, imgRows)
    const data = probeCtx.getImageData(0, 0, imgCols, imgRows).data
    for (let i = 0; i < luminance.length; i++) {
      luminance[i] =
        (0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]) / 255
    }
    blur()
  }

  /** Separable box blur of `luminance` into `blurred`: rows, then columns. */
  function blur() {
    const r = FILL_RADIUS
    const span = r * 2 + 1
    for (let row = 0; row < imgRows; row++) {
      const base = row * imgCols
      for (let col = 0; col < imgCols; col++) {
        let sum = 0
        for (let k = -r; k <= r; k++) {
          const c = Math.min(imgCols - 1, Math.max(0, col + k))
          sum += luminance[base + c]
        }
        blurScratch[base + col] = sum / span
      }
    }
    for (let col = 0; col < imgCols; col++) {
      for (let row = 0; row < imgRows; row++) {
        let sum = 0
        for (let k = -r; k <= r; k++) {
          const rr = Math.min(imgRows - 1, Math.max(0, row + k))
          sum += blurScratch[rr * imgCols + col]
        }
        blurred[row * imgCols + col] = sum / span
      }
    }
  }

  function adoptSource(next: HTMLImageElement | HTMLVideoElement, w: number, h: number) {
    source = next
    sourceW = w
    sourceH = h
    layout()
    readFrame()
    if (still) draw(0)
    else newFrame = true
  }

  function resize() {
    const nextW = host.clientWidth
    const nextH = host.clientHeight
    if (nextW < 1 || nextH < 1) return
    width = nextW
    height = nextH
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
    prepareCanvas(canvas, ctx!, width, height, dpr, fontFamily, fontSize)
    cellW = measureCellWidth(ctx!)
    buildAtlas()
    layout()
    readFrame()
    if (still) draw(0)
    else newFrame = true
  }

  /** A cell's ink, 0–1, with the black point pulled down by `light`; 0 for background. */
  function valueAt(index: number, col: number, light: number) {
    // A lone bright cell has dark neighbours, so its blur stays low: skip it.
    if (blurred[index] < SPECK_BLUR * (1 - light)) return 0
    const black = BLACK * (1 - LIGHT_REVEAL * light)
    let value = (luminance[index] - black) / (WHITE - black)
    value = value > 0 ? Math.pow(value, GAMMA) : 0
    // Inside the silhouette, never fall below the fill floor.
    const body = (blurred[index] - FILL_FROM) / (FILL_TO - FILL_FROM)
    if (body > 0) value = Math.max(value, FILL_FLOOR * Math.min(1, body))
    // Feathered off toward the image's sides so its rectangle never shows.
    value *= Math.min(1, Math.min(col, imgCols - 1 - col) / (imgCols * EDGE_FEATHER))
    return value > CUTOFF ? Math.min(1, value) : 0
  }

  function draw(frame: number) {
    if (streaming && newFrame) readFrame()
    ctx!.clearRect(0, 0, width, height)
    ctx!.globalAlpha = Math.min(1, fade.value * 1.6)
    const gathering = fade.value < 1
    if (!luminance.length) return
    const spriteW = cellW * dpr
    const spriteH = cellH * dpr

    // Ease the light toward the pointer so it trails a little, like a held lamp.
    pointer.x += (pointer.tx - pointer.x) * 0.14
    pointer.y += (pointer.ty - pointer.y) * 0.14
    pointer.strength += (pointer.target - pointer.strength) * 0.08

    const radius = imgRows * cellH * LIGHT_RADIUS
    const radiusSq = radius * radius

    for (let row = 0; row < imgRows; row++) {
      const y = originY + row * cellH + cellH * 0.5
      if (y > height + cellH) break
      for (let col = 0; col < imgCols; col++) {
        const index = row * imgCols + col
        const x = originX + col * cellW + cellW * 0.5

        let light = 0
        // Where the glyph is drawn: its cell, unless the pointer is shoving it aside.
        let drawX = x
        let drawY = y
        if (pointer.strength > 0.01) {
          const dx = x - pointer.x
          const dy = y - pointer.y
          const distSq = dx * dx + dy * dy
          if (distSq < radiusSq * 4) {
            light = Math.exp(-distSq / radiusSq) * pointer.strength
            // Push outward from the pointer, strongest at its centre, and tremble a
            // little, so the subject parts around it like a disturbed surface.
            const dist = Math.sqrt(distSq) || 1
            const push = PUSH * light
            const tremble = JITTER * light
            drawX += (dx / dist) * push + (cellNoise(index + frame * 131) - 0.5) * tremble * 2
            drawY += (dy / dist) * push + (cellNoise(index * 7 + frame * 173) - 0.5) * tremble * 2
          }
        }

        const value = valueAt(index, col, light)
        if (!value) continue
        if (gathering) {
          // This cell's turn: mostly by height (bottom first), loosened by noise.
          const turn = (1 - row / imgRows) * 0.65 + cellNoise(index + 7331) * 0.35
          if (turn > fade.value * 1.15) continue
        }
        const shown = Math.min(1, value * (1 + light * 0.35))

        let glyph = rampIndex(shown)
        if (light > 0.15 && cellNoise(index + frame * 7919) < light * LIGHT_FLICKER) {
          glyph = (cellNoise(index * 31 + frame) * PIXEL_RAMP.length) | 0
        }

        const bucket = Math.min(HEAT_BUCKETS - 1, (shown * HEAT_BUCKETS) | 0)
        ctx!.drawImage(
          atlas,
          glyph * spriteW,
          bucket * spriteH,
          spriteW,
          spriteH,
          drawX - cellW * 0.5,
          drawY - cellH * 0.5,
          cellW,
          cellH,
        )
      }
    }
  }

  let frameCount = 0
  let lastScroll = window.scrollY
  let lastTime = -1
  let lastPainted = 0
  let rate = options.speed
  const hasFrameCallback = 'requestVideoFrameCallback' in HTMLVideoElement.prototype
  function loop(now: number) {
    if (disposed) return
    const scroll = window.scrollY
    const boost = Math.min(MAX_BOOST, Math.abs(scroll - lastScroll) * SCROLL_BOOST)
    const target = options.speed + boost
    lastScroll = scroll
    rate += (target - rate) * (target > rate ? BOOST_ATTACK : BOOST_RELEASE)
    if (rate < options.speed + 0.01) rate = options.speed
    if (video && Math.abs(video.playbackRate - rate) >= 0.01) video.playbackRate = rate
    // Without frame callbacks, a moved playhead is the only sign of a new frame.
    if (streaming && video && !hasFrameCallback && video.currentTime !== lastTime) {
      lastTime = video.currentTime
      newFrame = true
    }
    // Nothing to repaint unless the picture, the pointer or the entrance moved. The pointer
    // gets every frame; video alone is held to `VIDEO_FPS`, so a clip sped up by scrolling
    // skips ahead between paints instead of costing more of them.
    const stirring = pointer.target > 0 || pointer.strength > 0.01
    const videoDue = newFrame && now - lastPainted >= 1000 / VIDEO_FPS - 2
    if (stirring || fade.value < 1 || videoDue) {
      lastPainted = now
      draw(frameCount++)
    }
    rafId = requestAnimationFrame(loop)
  }
  function run() {
    if (rafId || disposed || still || !visible || document.hidden) return
    if (streaming || blocked) tryPlay()
    rafId = requestAnimationFrame(loop)
  }
  function stop() {
    if (rafId) cancelAnimationFrame(rafId)
    rafId = 0
    video?.pause()
  }

  // The light follows the pointer anywhere over the host's section.
  const zone = host.closest('section') ?? host
  const onMove = (event: PointerEvent) => {
    const rect = host.getBoundingClientRect()
    pointer.tx = event.clientX - rect.left
    pointer.ty = event.clientY - rect.top
    if (pointer.target === 0) {
      pointer.x = pointer.tx
      pointer.y = pointer.ty
    }
    pointer.target = 1
  }
  const onLeave = () => {
    pointer.target = 0
  }
  if (!still) {
    zone.addEventListener('pointermove', onMove)
    zone.addEventListener('pointerleave', onLeave)
  }

  // A still is drawn first so the entrance never waits on video: the poster (the intro's
  // first frame) when there's an intro, otherwise the still itself. When the preloader
  // has opened and that still is in, the glyphs dissolve in and the clips take over: the
  // intro plays once, then the loop, which starts on the frame the intro ends on, so the
  // hand never jumps. With reduced motion only the final still is drawn.
  registerGsap()
  // Declared before the reveal subscription: if the preloader has already opened, it
  // fires immediately and reads these.
  let introClip: HTMLVideoElement | null = null
  let loopClip: HTMLVideoElement | null = null
  /** Whichever clip is on screen now, for pausing and resuming. */
  let video: HTMLVideoElement | null = null
  let fadeTween: gsap.core.Tween | null = null
  let revealed = false
  let hasSource = false
  /** Within reach of the viewport, so the clips are worth downloading. */
  let near = false
  /** The browser refused to start the clip without a gesture; retry on the first one. */
  let blocked = false

  // WebKit (every browser on iOS) decides whether a clip may autoplay inline from its
  // `muted` and `playsinline` attributes, not the matching properties, so both are set.
  const makeClip = (src: string, looping: boolean) => {
    const clip = document.createElement('video')
    clip.muted = true
    clip.defaultMuted = true
    clip.setAttribute('muted', '')
    clip.playsInline = true
    clip.setAttribute('playsinline', '')
    clip.loop = looping
    clip.preload = 'auto'
    clip.src = src
    return clip
  }

  // Low Power Mode and in-app browsers (Instagram, WhatsApp, LinkedIn) refuse autoplay until
  // the visitor touches the page. Without a retry the hero stayed a still forever, while a
  // clip further down played, because by the time it asked the visitor had already touched.
  const GESTURES = ['pointerdown', 'touchstart', 'keydown'] as const
  const onGesture = () => {
    for (const type of GESTURES) window.removeEventListener(type, onGesture, true)
    if (blocked) tryPlay()
  }
  function tryPlay() {
    const clip = video
    if (!clip || disposed || !visible || document.hidden) return
    clip
      .play()
      .then(() => {
        blocked = false
      })
      .catch(() => {
        // Autoplay refused: the current frame stays up as a still until a gesture.
        if (blocked) return
        blocked = true
        for (const type of GESTURES) {
          window.addEventListener(type, onGesture, { capture: true, passive: true })
        }
      })
  }

  /** Flag each decoded frame of the clip on screen, so only those are read and drawn. */
  const watchFrames = (clip: HTMLVideoElement) => {
    if (!hasFrameCallback) return
    const onFrame = () => {
      if (disposed || video !== clip) return
      newFrame = true
      clip.requestVideoFrameCallback(onFrame)
    }
    clip.requestVideoFrameCallback(onFrame)
  }

  /** Put a clip on screen: start it now, and draw from it once its first frame is in. */
  const playClip = (clip: HTMLVideoElement) => {
    video = clip
    const begin = () => {
      if (disposed || video !== clip) return
      adoptSource(clip, clip.videoWidth, clip.videoHeight)
      streaming = true
      watchFrames(clip)
    }
    if (clip.readyState >= 2) begin()
    else clip.addEventListener('loadeddata', begin, { once: true })
    // Asked for straight away, not after the first frame: iOS doesn't buffer a frame until a
    // clip is told to play, so waiting for one first left the hero stuck on its still.
    tryPlay()
  }

  const startEntrance = () => {
    if (!revealed || !hasSource || !near || fadeTween) return
    fadeTween = gsap.to(fade, { value: 1, duration: 2.6, ease: 'power2.inOut', delay: 0.1 })
    const first = introClip ?? loopClip
    if (first) playClip(first)
  }

  const stopWaiting = still
    ? () => {}
    : onPreloader('reveal', () => {
        revealed = true
        startEntrance()
      })

  // Clips are only fetched once the portrait is within a screen of the viewport, so one
  // far down the page doesn't compete with the hero for bandwidth on load.
  const stopApproach = still
    ? () => {}
    : observeInView(host, '100% 0px', isNear => {
        if (!isNear || near) return
        near = true
        if (options.intro) introClip = makeClip(options.intro, false)
        if (options.video) loopClip = makeClip(options.video, true)
        introClip?.addEventListener('ended', () => {
          if (loopClip) playClip(loopClip)
          else streaming = false
        })
        startEntrance()
      })

  const img = new Image()
  img.decoding = 'async'
  img.src = (!still && options.poster) || options.src
  img.onload = () => {
    if (disposed) return
    // A clip may already have taken over; don't swap back to the still.
    if (!video) adoptSource(img, img.naturalWidth, img.naturalHeight)
    hasSource = true
    startEntrance()
  }

  resize()
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  const stopObserving = observeInView(host, '10% 0px', isVisible => {
    visible = isVisible
    if (visible) run()
    else stop()
  })
  const onVisibility = () => (document.hidden ? stop() : run())
  document.addEventListener('visibilitychange', onVisibility)
  run()

  return () => {
    disposed = true
    stop()
    stopWaiting()
    stopApproach()
    fadeTween?.kill()
    for (const type of GESTURES) window.removeEventListener(type, onGesture, true)
    for (const clip of [introClip, loopClip]) {
      clip?.pause()
      clip?.removeAttribute('src')
      clip?.load()
    }
    observer.disconnect()
    stopObserving()
    document.removeEventListener('visibilitychange', onVisibility)
    zone.removeEventListener('pointermove', onMove)
    zone.removeEventListener('pointerleave', onLeave)
  }
}

type Props = {
  src: string
  intro?: string
  poster?: string
  video?: string
  className?: string
  color?: Rgb
  heightShare?: number
  topShare?: number
  fontSize?: number
  speed?: number
}

export default function PixelPortrait({
  src,
  intro,
  poster,
  video,
  className,
  color = [43, 22, 160],
  heightShare = 1,
  topShare = 0.03,
  fontSize = 10,
  speed = 1,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    if (!host || !canvas) return
    return initPixelPortrait(host, canvas, {
      src,
      intro,
      poster,
      video,
      color,
      heightShare,
      topShare,
      fontSize,
      speed,
    })
    // The colour is a tuple literal at call sites; key on its value, not its identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, intro, poster, video, color.join(), heightShare, topShare, fontSize, speed])

  return (
    <div
      ref={hostRef}
      className={[styles.portrait, className].filter(Boolean).join(' ')}
      aria-hidden
    >
      <canvas ref={canvasRef} />
    </div>
  )
}
