import styles from './RollText.module.scss'

/**
 * Text whose letters roll up one after another while its parent is hovered. Screen
 * readers get the plain label; the per-letter spans are presentational.
 */
export default function RollText({ children }: { children: string }) {
  return (
    <>
      <span className={styles.roll} aria-hidden="true">
        {[...children].map((char, index) => (
          <span key={index} className={styles.char} style={{ '--i': index } as React.CSSProperties}>
            {char === ' ' ? ' ' : char}
          </span>
        ))}
      </span>
      <span className={styles.srOnly}>{children}</span>
    </>
  )
}
