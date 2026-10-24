import styles from './ApplyButton.module.scss'
import RollText from './RollText'
import TransitionLink from './TransitionLink'

type Props = {
  /** Where it goes; leave out for a form's submit button. */
  href?: string
  /** Runs before the link's own navigation, such as closing a menu first. */
  onClick?: () => void
  disabled?: boolean
  label: string
  tone?: 'indigo' | 'gray'
  /** Stepped pixel corners that rebuild into square ones on hover. */
  pixelated?: boolean
  className?: string
}

/** Sharp CTA: shrinks on hover while its letters roll up one after another. */
export default function ApplyButton({
  href,
  onClick,
  disabled,
  label,
  tone = 'indigo',
  pixelated,
  className,
}: Props) {
  const classes = [styles.button, styles[tone], pixelated && styles.pixelated, className]
    .filter(Boolean)
    .join(' ')
  if (!href) {
    return (
      <button type="submit" disabled={disabled} className={classes}>
        <RollText>{label}</RollText>
      </button>
    )
  }
  return (
    <TransitionLink href={href} onClick={onClick} className={classes}>
      <RollText>{label}</RollText>
    </TransitionLink>
  )
}
