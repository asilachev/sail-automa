import { CheckCircle } from '@phosphor-icons/react'
import type { OrderView, Seat } from '../../engine/index.ts'
import { Picture } from '../components/index.ts'
import { useT } from '../i18n/index.ts'
import { BoardMap } from './BoardMap.tsx'
import styles from './game.module.css'
import { headingOf, pairName, SYMBOL_ART } from './words.ts'

/**
 * The order for a trick (Components → Order Card): the pair's symbols, the move on the board
 * map, what to do, and the Kraken's attacks as a red box. The texts follow docs/rules.md →
 * Actions, Cannon actions and Kraken damage, in the rulebook's order: cards to the Kraken deck,
 * the move, then the damage.
 */
export function OrderCard({ order, seat }: { order: OrderView; seat: Seat }) {
  const t = useT()
  const flips = order.cannon?.flips ?? []
  const heading = headingOf(order.move, order.winner)
  const flippedToKraken = flips.filter((s) => s === 'helmKraken').length
  const flippedDiscards = flips.length - flippedToKraken
  const cycles = order.attackEffects.some((e) => e.kind === 'krakenCard')
  return (
    <section className={styles.orderCard} aria-labelledby="order-label">
      <header className={styles.orderHead}>
        <h2 id="order-label" className={styles.orderLabel}>
          {t('order.label')}
        </h2>
        <span className={styles.pairIcons} aria-hidden="true">
          <Picture name={SYMBOL_ART[order.yours]} size={26} />
          <span>+</span>
          <Picture name={SYMBOL_ART[order.bosuns]} size={26} />
        </span>
      </header>
      {heading ? <BoardMap heading={heading} seat={seat} /> : null}
      <div className={styles.orderText}>
        <p className={styles.combo}>{pairName(t, order.yours, order.bosuns, flips)}</p>
        {order.krakenHit ? <p className={styles.orderLine}>{t('order.krakenHit')}</p> : null}
        {flippedToKraken > 0 ? (
          <p className={styles.orderLine}>{t('order.flipToKraken', { n: flippedToKraken })}</p>
        ) : null}
        {order.move === 'towardWinner' ? (
          <p className={styles.orderLine}>{t('order.moveToward', { side: order.winner })}</p>
        ) : order.move === 'straight' ? (
          <p className={styles.orderLine}>{t('order.moveStraight')}</p>
        ) : null}
        {order.cannon && flippedDiscards > 0 ? (
          <p className={styles.orderLine}>{t('order.discardFlipped', { n: flippedDiscards })}</p>
        ) : null}
        {order.cannon?.emptyDeck ? (
          <p className={styles.orderLine}>{t('order.emptyDeck')}</p>
        ) : null}
        {order.move === 'none' &&
        !order.krakenHit &&
        order.attacks === 0 &&
        flippedToKraken === 0 &&
        !order.cannon?.emptyDeck ? (
          <p className={styles.orderLine}>{t('order.noAction')}</p>
        ) : null}
        {heading ? <p className={styles.orderHint}>{t('order.blocked')}</p> : null}
      </div>
      {order.attacks > 0 ? (
        <div className={styles.attackBox}>
          <span className={styles.krakenBadge}>{t('order.attackBadge', { n: order.attacks })}</span>
          <div className={styles.attackText}>
            <p>{t('order.attacks', { n: order.attacks })}</p>
            {cycles ? <p>{t('order.attackCycle')}</p> : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}

/** "You took it · helm + helm · Change" above the order (C5, C6). */
export function TrickSummary({
  order,
  onChange,
}: {
  order: Pick<OrderView, 'winner' | 'yours' | 'bosuns'>
  onChange: () => void
}) {
  const t = useT()
  return (
    <div className={styles.summary}>
      <span className={styles.summaryIcon} data-side={order.winner} aria-hidden="true">
        <CheckCircle size={18} weight="fill" />
      </span>
      <span className={styles.summaryText}>{t('order.took', { side: order.winner })}</span>
      <span
        className={styles.pairIcons}
        role="img"
        aria-label={pairName(t, order.yours, order.bosuns)}
      >
        <Picture name={SYMBOL_ART[order.yours]} size={24} />
        <span aria-hidden="true">+</span>
        <Picture name={SYMBOL_ART[order.bosuns]} size={24} />
      </span>
      <button
        type="button"
        className={styles.linkButton}
        aria-label={t('order.changeLabel')}
        onClick={onChange}
      >
        {t('order.change')}
      </button>
    </div>
  )
}
