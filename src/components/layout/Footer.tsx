import PixelPortrait from '@/components/ui/PixelPortrait'
import RollText from '@/components/ui/RollText'
import TransitionLink from '@/components/ui/TransitionLink'
import { LOGO_BOUNDS, LOGO_GLYPHS } from '@/lib/logo'

import styles from './Footer.module.scss'

const LINKS = [
  { href: '#services', label: 'Services' },
  { href: '#apply', label: 'Ventures' },
  { href: '#manifesto', label: 'Manifesto' },
]

const PAD = 4
const VIEWBOX = `${LOGO_BOUNDS.x - PAD} ${LOGO_BOUNDS.y - PAD} ${LOGO_BOUNDS.width + PAD * 2} ${LOGO_BOUNDS.height + PAD * 2}`

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className={styles.footer}>
      <nav aria-label="Footer" className={styles.links}>
        {LINKS.map(link => (
          <TransitionLink key={link.href} href={link.href} className={styles.link}>
            <RollText>{link.label}</RollText>
          </TransitionLink>
        ))}
      </nav>

      <div className={styles.brand}>
        {/* The hero's horse again, small, running above the logo. */}
        <PixelPortrait
          className={styles.horse}
          src="/hero/horse.jpg"
          video="/hero/horse-loop.mp4"
          color={[22, 199, 132]}
          fontSize={6}
          topShare={0}
          speed={2}
        />
        <TransitionLink href="/" className={styles.home} aria-label="7labz home">
          <svg viewBox={VIEWBOX} className={styles.logo} aria-hidden="true">
            {LOGO_GLYPHS.map(glyph => (
              <path key={glyph.id} d={glyph.d} />
            ))}
          </svg>
        </TransitionLink>
      </div>

      <div className={styles.legal}>
        <p>© {year} property7</p>
        <p>All rights reserved</p>
      </div>
    </footer>
  )
}
