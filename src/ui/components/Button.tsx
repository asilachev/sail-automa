import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './kit.module.css'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'text'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** primary 56 px (the one main action), secondary and danger 52 px, text 44 px. */
  variant?: ButtonVariant
  /** An icon before the label (secondary's plus). */
  icon?: ReactNode
  /** An icon after the label (primary's arrow). */
  iconEnd?: ReactNode
}

/**
 * A wooden button (Components → Button / Primary, Secondary, Danger, Text). It presses into its
 * edge on tap (03 · PRESS); the action fires on release, as a click does.
 */
export function Button({
  variant = 'primary',
  icon,
  iconEnd,
  children,
  className,
  ...props
}: ButtonProps) {
  const look =
    variant === 'text' ? styles.text : `${styles.piece} ${styles.button} ${styles[variant]}`
  return (
    <button type="button" className={`${look} ${className ?? ''}`} {...props}>
      {icon}
      <span>{children}</span>
      {iconEnd}
    </button>
  )
}
