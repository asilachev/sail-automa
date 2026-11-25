import { CaretDown, Info } from '@phosphor-icons/react'
import { useId, useState, type ReactNode } from 'react'
import styles from './kit.module.css'

/**
 * A rule explained where it applies (Components → Rule Tip): a sky panel with an info title.
 * Phones have no hover, so the title is a button that opens and closes the text. Wording follows
 * docs/rules.md and docs/automa.md, in our own words, with the source named.
 */
export function RuleTip({
  title,
  defaultOpen = false,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  return (
    <div className={styles.tip}>
      <button
        type="button"
        className={styles.tipHead}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        <Info size={16} weight="fill" aria-hidden />
        <span>{title}</span>
        <CaretDown className={styles.tipCaret} size={14} weight="bold" aria-hidden />
      </button>
      <p id={id} className={styles.tipText} hidden={!open}>
        {children}
      </p>
    </div>
  )
}
