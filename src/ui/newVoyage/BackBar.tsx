import { CaretLeft } from '@phosphor-icons/react'
import styles from './newVoyage.module.css'

/** The back link at the top of a pushed screen (design B1, B2: ‹ Home, ‹ New voyage). */
export function BackBar({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <div className={styles.backBar}>
      <button type="button" className={styles.back} onClick={onBack}>
        <CaretLeft size={20} weight="fill" aria-hidden />
        <span>{label}</span>
      </button>
    </div>
  )
}
