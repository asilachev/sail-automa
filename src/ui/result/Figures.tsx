import type { ReactNode } from 'react'
import styles from './result.module.css'

export interface Figure {
  readonly key: string
  /** The small caps label: ROUNDS, TRICKS, VOYAGES. */
  readonly label: string
  readonly value: ReactNode
  /** What the value stands for, read instead of it when it's terse ("13 · 11"). */
  readonly valueLabel?: string
  readonly sub: string
  readonly tone?: 'danger' | 'gold'
}

/**
 * Three key figures side by side (design E1–E3 → Key figures): a label, a big Bitter number and a
 * line under it, in equal columns between two rules.
 */
export function KeyFigures({ figures }: { figures: readonly Figure[] }) {
  return (
    <dl className={styles.figures}>
      {figures.map((f) => (
        <div key={f.key} className={styles.figure}>
          <dt className={styles.figureLabel}>{f.label}</dt>
          <dd className={styles.figureValue} data-tone={f.tone}>
            {f.valueLabel ? (
              <>
                <span aria-hidden="true">{f.value}</span>
                <span className={styles.srOnly}>{f.valueLabel}</span>
              </>
            ) : (
              f.value
            )}
          </dd>
          <dd className={styles.figureSub}>{f.sub}</dd>
        </div>
      ))}
    </dl>
  )
}
