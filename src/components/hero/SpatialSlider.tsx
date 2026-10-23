'use client'

import { CustomEase, gsap, prefersReducedMotion, registerGsap, ScrollTrigger } from '@/lib/gsap'
import { Draggable } from 'gsap/Draggable'
import { InertiaPlugin } from 'gsap/InertiaPlugin'
import { onPreloader } from '@/lib/preloader'
import { useEffect, useRef } from 'react'

import { runMatrixText } from './matrixText'
import styles from './SpatialSlider.module.scss'

type VideoSource = { src: string; type: string }

type Slide =
  | { kind: 'image'; src: string; alt: string }
  | { kind: 'video'; src: string; sources: VideoSource[]; poster: string; label: string }
  | { kind: 'soon' }

const SLIDES: Slide[] = [
  {
    kind: 'video',
    src: '/work/mal-ai/large-banner.mp4',
    // Smallest first: browsers take the first source they can decode.
    sources: [
      { src: '/work/mal-ai/large-banner.av1.mp4', type: 'video/mp4; codecs=av01.0.09M.08' },
      { src: '/work/mal-ai/large-banner.hevc.mp4', type: 'video/mp4; codecs=hvc1.1.6.L123.B0' },
    ],
    poster: '/work/mal-ai/large-banner-poster.jpg',
    label: 'Mal AI',
  },
  {
    kind: 'video',
    src: '/work/focal/large-banner.mp4',
    sources: [],
    poster: '/work/focal/large-banner-poster.jpg',
    label: 'Focal',
  },
  {
    kind: 'video',
    src: '/work/uhai/large-banner.mp4',
    sources: [
      { src: '/work/uhai/large-banner.av1.mp4', type: 'video/mp4; codecs=av01.0.09M.08' },
      { src: '/work/uhai/large-banner.hevc.mp4', type: 'video/mp4; codecs=hvc1.1.6.L123.B0' },
    ],
    poster: '/work/uhai/large-banner-poster.jpg',
    label: 'UHAI',
  },
  { kind: 'soon' },
  { kind: 'soon' },
  { kind: 'soon' },
]

const SOON_LABEL = 'Coming soon'

/** Off while most slides are placeholders, so the real work stays the resting focus. Drag still works. */
const AUTOPLAY = false
/** Pause between autoplay steps, on top of the slide tween itself. */
const AUTOPLAY_DELAY = 2.4
const SLIDE_DURATION = 1
/** Slide the deck rests on: Focal centred, with Mal AI and UHAI either side. */
const START_INDEX = 1
/** Slides the deck turns through while its section scrolls out of view. */
const SCROLL_SLIDES = 1.5
/** Cards to fly through on first paint before landing on the start slide. */
const INTRO_STEPS = 5
const INTRO_DURATION = 2.4

type Teardown = () => void

/**
 * Cards sit on an arc in 3D: each one is placed by its angle around a circle whose
 * radius is solved so neighbouring cards keep the CSS gap once projected. A proxy's
 * x drives the whole thing — drag, inertia, autoplay and the intro all tween it.
 */
function initSlider(container: HTMLElement, playIntro: boolean): Teardown {
  const collection = container.querySelector<HTMLElement>('[data-slider-collection]')
  const track = container.querySelector<HTMLElement>('[data-slider-list]')
  if (!collection || !track) return () => {}

  const originals = Array.from(track.querySelectorAll<HTMLElement>(':scope > [data-slider-item]'))
  if (!originals.length) return () => {}

  const curve =
    Math.abs(parseFloat(getComputedStyle(container).getPropertyValue('--slider-curve'))) || 30
  const gap = parseFloat(getComputedStyle(track).columnGap) || 0
  const curveRadians = (curve * Math.PI) / 180

  const itemWidth = originals[0].getBoundingClientRect().width
  const itemHeight = originals[0].getBoundingClientRect().height
  const perspective = parseFloat(getComputedStyle(track).perspective) || 1200

  const projectedEdgeX = (radius: number, angle: number, side: number) => {
    const radians = (angle * Math.PI) / 180
    const localX = (side * itemWidth) / 2
    const x = Math.sin(radians) * radius + localX * Math.cos(-radians)
    const z = radius * (1 - Math.cos(radians)) - localX * Math.sin(-radians)
    return (x * perspective) / (perspective - z)
  }

  let radius = itemWidth / Math.sin(curveRadians)
  for (let i = 0; i < 8; i++) {
    const currentGap = projectedEdgeX(radius, curve, -1) - itemWidth / 2
    radius += (gap - currentGap) / Math.sin(curveRadians)
  }

  const stepDistance = Math.sin(curveRadians) * radius
  const tangentRatio = -radius / (perspective - radius)
  const edgeAngle = (Math.acos(gsap.utils.clamp(-1, 1, tangentRatio)) * 180) / Math.PI
  const maxSideItems = Math.ceil(edgeAngle / curve)

  const positionAt = (offset: number) => {
    const angle = gsap.utils.clamp(-edgeAngle, edgeAngle, offset * curve)
    const radians = (angle * Math.PI) / 180
    return {
      x: Math.sin(radians) * radius,
      z: radius * (1 - Math.cos(radians)),
      rotationY: -angle,
    }
  }

  // Clone until the loop has enough cards to cover both sides of the arc.
  const needed = Math.max(originals.length, maxSideItems * 2 + 1)
  const total = Math.ceil(needed / originals.length) * originals.length
  for (let i = originals.length; i < total; i++) {
    const clone = originals[i % originals.length].cloneNode(true) as HTMLElement
    clone.setAttribute('data-slider-clone', '')
    clone.setAttribute('aria-hidden', 'true')
    track.appendChild(clone)
    // React sets `muted` as a property, not an attribute, so a cloned video comes out
    // unmuted and the browser refuses to autoplay it. Mute and start it by hand.
    clone.querySelectorAll('video').forEach(video => {
      video.muted = true
      video.play().catch(() => {})
    })
  }

  const items = Array.from(track.querySelectorAll<HTMLElement>(':scope > [data-slider-item]'))
  track.style.height = `${itemHeight}px`

  const proxy = document.createElement('div')
  container.appendChild(proxy)
  gsap.set(proxy, { x: 0 })

  const setX = items.map(item => gsap.quickSetter(item, 'x', 'px'))
  const setZ = items.map(item => gsap.quickSetter(item, 'z', 'px'))
  const setRotationY = items.map(item => gsap.quickSetter(item, 'rotationY', 'deg'))

  const mod = (value: number, n: number) => ((value % n) + n) % n
  const getIndex = () => -(gsap.getProperty(proxy, 'x') as number) / stepDistance
  const xForIndex = (index: number) => -index * stepDistance

  // Page scroll turns the deck on top of wherever drag, autoplay or the intro left it.
  let scrollOffset = 0

  const render = () => {
    const realIndex = getIndex() + scrollOffset
    const active = mod(Math.round(realIndex), items.length)

    items.forEach((item, index) => {
      const loop = Math.round((realIndex - index) / items.length)
      const position = positionAt(index - (realIndex - loop * items.length))
      setX[index](position.x)
      setZ[index](position.z)
      setRotationY[index](position.rotationY)
      item.toggleAttribute('data-active', index === active)
    })
  }

  const reducedMotion = prefersReducedMotion()
  let inView = true
  let interacting = false
  let intro: gsap.core.Timeline | null = null
  let autoplay: gsap.core.Tween | null = null

  const autoplayAllowed = () =>
    AUTOPLAY && !reducedMotion && inView && !interacting && !document.hidden && !intro

  const stopAutoplay = () => {
    autoplay?.kill()
    autoplay = null
  }

  const queueAutoplay = () => {
    stopAutoplay()
    if (autoplayAllowed()) autoplay = gsap.delayedCall(AUTOPLAY_DELAY, autoplayStep)
  }

  function autoplayStep() {
    if (!autoplayAllowed()) return
    gsap.to(proxy, {
      x: xForIndex(Math.round(getIndex()) + 1),
      duration: SLIDE_DURATION,
      ease: 'spatial',
      onUpdate: render,
      onComplete: queueAutoplay,
    })
  }

  const stopIntro = () => {
    if (!intro) return
    intro.kill()
    intro = null
    gsap.set(collection, { autoAlpha: 1 })
  }

  const draggable = Draggable.create(proxy, {
    type: 'x',
    trigger: collection,
    inertia: true,
    throwResistance: 2000,
    dragResistance: 0.05,
    maxDuration: 1,
    minDuration: 0.5,
    overshootTolerance: 0,
    snap: (value: number) => Math.round(value / stepDistance) * stepDistance,
    onDrag: render,
    onThrowUpdate: render,
    onPress: () => {
      interacting = true
      stopIntro()
      stopAutoplay()
      gsap.killTweensOf(proxy)
      container.setAttribute('data-drag', 'grabbing')
    },
    onRelease: () => {
      container.setAttribute('data-drag', 'grab')
      if (!draggable.isThrowing) {
        interacting = false
        queueAutoplay()
      }
    },
    onThrowComplete: () => {
      render()
      interacting = false
      queueAutoplay()
    },
  })[0]

  container.setAttribute('data-ready', '')

  if (playIntro && !reducedMotion) {
    // Start several cards back and decelerate onto the start slide: a fast spin
    // that comes to rest, instead of the deck just appearing.
    gsap.set(proxy, { x: xForIndex(START_INDEX - INTRO_STEPS) })
    render()
    gsap.set(collection, { autoAlpha: 0 })
    intro = gsap
      .timeline({
        onComplete: () => {
          intro = null
          queueAutoplay()
        },
      })
      .to(collection, { autoAlpha: 1, duration: 0.6, ease: 'power2.out' }, 0)
      .to(
        proxy,
        {
          x: xForIndex(START_INDEX),
          duration: INTRO_DURATION,
          ease: 'power3.out',
          onUpdate: render,
        },
        0,
      )
  } else {
    gsap.set(proxy, { x: xForIndex(START_INDEX) })
    render()
    queueAutoplay()
  }

  const viewObserver = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting
    if (inView) queueAutoplay()
    else stopAutoplay()
  })
  viewObserver.observe(container)

  const onVisibility = () => {
    if (!document.hidden) queueAutoplay()
  }
  document.addEventListener('visibilitychange', onVisibility)

  // How far the section has scrolled out, read from layout (`offsetTop`/`offsetHeight`)
  // rather than ScrollTrigger's measured start. Layout ignores transforms, so the turn
  // stays right while the preloader has the page scaled up for its reveal, instead of
  // landing off-centre and jumping once the page settles.
  const section = container.closest('section') ?? container
  const syncScrollTurn = () => {
    const progress = (window.scrollY - section.offsetTop) / Math.max(1, section.offsetHeight)
    scrollOffset = gsap.utils.clamp(0, 1, progress) * SCROLL_SLIDES
    render()
  }
  const scrollTurn = reducedMotion
    ? null
    : ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: 'bottom top',
        onUpdate: syncScrollTurn,
        onRefresh: syncScrollTurn,
      })
  if (scrollTurn) syncScrollTurn()
  else render()

  return () => {
    scrollTurn?.kill()
    draggable.kill()
    intro?.kill()
    stopAutoplay()
    gsap.killTweensOf(proxy)
    proxy.remove()
    viewObserver.disconnect()
    document.removeEventListener('visibilitychange', onVisibility)
    track.querySelectorAll('[data-slider-clone]').forEach(clone => clone.remove())
    items.forEach(item => gsap.set(item, { clearProps: 'transform' }))
    gsap.set(collection, { clearProps: 'opacity,visibility' })
    container.removeAttribute('data-ready')
  }
}

export default function SpatialSlider() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    registerGsap()
    gsap.registerPlugin(Draggable, InertiaPlugin)
    CustomEase.create('spatial', '0.25, 0.1, 0, 1')

    let teardown: Teardown | null = null
    let lastWidth = window.innerWidth
    let timer: ReturnType<typeof setTimeout>

    const stopMatrix = prefersReducedMotion() ? () => {} : runMatrixText(container)
    const stopWaiting = onPreloader('reveal', () => {
      teardown = initSlider(container, true)
    })

    const onResize = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        if (!teardown || window.innerWidth === lastWidth) return
        lastWidth = window.innerWidth
        teardown()
        teardown = initSlider(container, false)
      }, 200)
    }
    window.addEventListener('resize', onResize)

    return () => {
      stopWaiting()
      stopMatrix()
      clearTimeout(timer)
      window.removeEventListener('resize', onResize)
      teardown?.()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={styles.slider}
      data-drag="grab"
      role="region"
      aria-roledescription="carousel"
      aria-label="Work"
    >
      <div data-slider-collection className={styles.collection}>
        <div data-slider-list className={styles.list}>
          {SLIDES.map((slide, index) => (
            <div key={index} data-slider-item className={styles.item}>
              {slide.kind === 'image' ? (
                <div className={styles.media}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={slide.src} alt={slide.alt} draggable={false} />
                </div>
              ) : slide.kind === 'video' ? (
                <div className={styles.media}>
                  <video
                    poster={slide.poster}
                    aria-label={slide.label}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                  >
                    {slide.sources.map(source => (
                      <source key={source.src} src={source.src} type={source.type} />
                    ))}
                    <source src={slide.src} type="video/mp4" />
                  </video>
                </div>
              ) : (
                <div className={`${styles.media} ${styles.placeholder}`}>
                  <span className={styles.soon} data-matrix={SOON_LABEL}>
                    {[...SOON_LABEL].map((char, i) => (
                      <span key={i}>{char}</span>
                    ))}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
