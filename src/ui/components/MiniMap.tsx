import { ArrowDownRight, ArrowRight, ArrowUpRight, Sailboat } from '@phosphor-icons/react'
import { useT } from '../i18n/index.ts'
import styles from './game.module.css'

/** Where an order moves the ship: forward and toward one side, or straight forward. */
export type Heading = 'bosun' | 'you' | 'straight'

const TARGET: Readonly<Record<Heading, number>> = { bosun: 1, straight: 4, you: 7 }
const SHIP = 3

/**
 * The ship's move on a 3 × 3 patch of sea (Components → Mini Map · toward the Bosun, toward you,
 * straight): the Bosun's side on top, yours below, the ship on the left, the target cell orange.
 */
export function MiniMap({ heading }: { heading: Heading }) {
  const t = useT()
  const Arrow = heading === 'bosun' ? ArrowUpRight : heading === 'you' ? ArrowDownRight : ArrowRight
  return (
    <figure className={styles.miniMap} role="img" aria-label={t(`miniMap.${heading}`)}>
      <span className={styles.miniSide} data-side="bosun" aria-hidden="true">
        {t('common.bosun')}
      </span>
      <span className={styles.grid} aria-hidden="true">
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} className={styles.miniCell} data-target={i === TARGET[heading]}>
            {i === SHIP ? <Sailboat size={18} /> : null}
            {i === TARGET[heading] ? <Arrow size={16} weight="fill" /> : null}
          </span>
        ))}
      </span>
      <span className={styles.miniSide} aria-hidden="true">
        {t('common.you')}
      </span>
    </figure>
  )
}
