'use client'

import ApplyButton from '@/components/ui/ApplyButton'
import TransitionLink from '@/components/ui/TransitionLink'
import { useLenis } from 'lenis/react'
import { useEffect, useRef, useState } from 'react'

import styles from './Nav.module.scss'

type Props = {
  links: { href: string; label: string }[]
}

/**
 * The phone navigation, after Osmo's Scaling Hamburger Navigation: the button's own gray
 * background grows out of its corner into a card, the links scale up from that same corner
 * one after another, and the page dims behind. Closing plays it back into the button. It's
 * all CSS transitions on `data-open`, so it never needs measuring. The page holds still
 * while it's open; Escape, the dimmed page, a link, or the screen growing past phone width
 * all close it.
 */
export default function MobileMenu({ links }: Props) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  /** Opened from the keyboard, so focus should move into the menu. */
  const byKeyboard = useRef(false)
  const lenis = useLenis()

  useEffect(() => {
    if (open) lenis?.stop()
    else lenis?.start()
  }, [open, lenis])

  // From the keyboard, focus moves into the menu once it has grown in; a tap leaves it
  // alone, so no focus ring appears on the first link.
  useEffect(() => {
    if (!open || !byKeyboard.current) return
    const timer = window.setTimeout(
      () => cardRef.current?.querySelector<HTMLElement>('a')?.focus({ preventScroll: true }),
      300,
    )
    return () => window.clearTimeout(timer)
  }, [open])

  // Escape closes it, and so does the screen growing past phone width, where the menu
  // isn't shown and the page must be free to scroll.
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    const wide = window.matchMedia('(min-width: 768px)')
    const onWide = () => wide.matches && setOpen(false)
    window.addEventListener('keydown', onKey)
    wide.addEventListener('change', onWide)
    return () => {
      window.removeEventListener('keydown', onKey)
      wide.removeEventListener('change', onWide)
    }
  }, [open])

  // A link closes the menu first, so the page can scroll again before it glides to the section.
  const close = () => {
    lenis?.start()
    setOpen(false)
  }

  return (
    <div className={styles.menu} data-open={open}>
      <div className={styles.menuScrim} onClick={close} aria-hidden />

      <div className={styles.menuBox}>
        <div className={styles.menuBg} aria-hidden />

        <div
          ref={cardRef}
          id="mobile-menu"
          className={styles.menuGroup}
          role="dialog"
          aria-label="Menu"
          aria-hidden={!open}
          inert={!open}
        >
          <p className={styles.menuEyebrow}>Menu</p>
          <nav className={styles.menuLinks} aria-label="Main">
            {links.map((link, i) => (
              <TransitionLink
                key={link.href}
                href={link.href}
                className={styles.menuLink}
                style={{ '--i': i } as React.CSSProperties}
                onClick={close}
              >
                <span className={styles.menuIndex}>{String(i + 1).padStart(2, '0')}</span>
                {link.label}
              </TransitionLink>
            ))}
          </nav>
          <div className={styles.menuFoot}>
            <ApplyButton href="#apply" label="Apply for a slot" pixelated onClick={close} />
            <p className={styles.menuNote}>© {new Date().getFullYear()} property7</p>
          </div>
        </div>

        <button
          ref={buttonRef}
          type="button"
          className={styles.menuButton}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={event => {
            // A click from Enter or Space reports no pointer presses.
            byKeyboard.current = event.detail === 0
            setOpen(value => !value)
          }}
        >
          <span>{open ? 'Close' : 'Menu'}</span>
          <span className={styles.menuIcon} data-open={open} aria-hidden>
            <span />
            <span />
          </span>
        </button>
      </div>
    </div>
  )
}
