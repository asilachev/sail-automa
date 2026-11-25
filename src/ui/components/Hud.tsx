import { Cloud, Skull } from '@phosphor-icons/react'
import { useT } from '../i18n/index.ts'
import styles from './game.module.css'
import { KRAKEN_TRACK, NUMERALS, numeral } from './pieces.ts'

/** The rounds the design draws a storm cloud over. */
const STORM_ROUNDS: readonly number[] = [3, 5]
export interface HudProps {
  /** The round, 1 to 5. */
  round: number
  /** Tricks won this round, 0 to 4 each. */
  tricks: { you: number; bosun: number }
  /** The Kraken deck: cards above the Kraken card, and cards under it. */
  kraken: { above: number; below: number }
  /** Where the Kraken stands on its track: an index into `KRAKEN_TRACK`. */
  krakenSpace: number
}

/**
 * The play-area board at the top of every game step (Components → HUD · play area): black trick
 * cells with the yellow cube on the tricks won, the I to V diamond track, and the Kraken deck with
 * its dial. Read-only: it shows the table, it takes no taps.
 */
export function Hud({ round, tricks, kraken, krakenSpace }: HudProps) {
  const t = useT()
  const left = kraken.above + 1 + kraken.below
  const now = KRAKEN_TRACK[krakenSpace] ?? KRAKEN_TRACK[0]
  const nowText = now === 'skull' ? t('hud.skull') : String(now)
  return (
    <section className={styles.hud} aria-label={t('hud.label')}>
      <div className={styles.board}>
        <div className={styles.tricks}>
          {(['you', 'bosun'] as const).map((side) => {
            const name = t(`common.${side}`)
            const won = tricks[side]
            return (
              <div
                key={side}
                className={styles.track}
                data-side={side}
                role="img"
                aria-label={t('hud.tricks', { side: name, n: won })}
              >
                <span className={styles.trackLabel} aria-hidden="true">
                  {name}
                </span>
                {[1, 2, 3, 4].map((n) => (
                  <span key={n} className={styles.cell} data-won={n <= won} aria-hidden="true">
                    {n}
                  </span>
                ))}
              </div>
            )
          })}
        </div>
        <div className={styles.round}>
          <div className={styles.diamonds} aria-hidden="true">
            {NUMERALS.map((label, i) => {
              const r = i + 1
              const storm = STORM_ROUNDS.includes(r)
              return (
                <div
                  key={label}
                  className={styles.roundSpace}
                  data-low={r % 2 === 0}
                  data-storm={storm}
                >
                  {storm ? <Cloud size={12} weight="fill" /> : null}
                  <span
                    className={styles.diamond}
                    data-state={r < round ? 'past' : r === round ? 'now' : 'ahead'}
                  >
                    <span>{label}</span>
                  </span>
                </div>
              )
            })}
          </div>
          <p className={styles.caption}>
            <span className={styles.captionLabel}>{t('hud.round')}</span>
            <span className={styles.captionValue}>{numeral(round)}</span>
            <span>{t('hud.of')}</span>
          </p>
        </div>
      </div>
      <div className={styles.kraken}>
        <div className={styles.krakenRow}>
          <span className={styles.krakenLabel}>{t('hud.krakenDeck')}</span>
          <span className={styles.deck} aria-hidden="true">
            {Array.from({ length: kraken.above }, (_, i) => (
              <span key={`a${i}`} className={styles.card} data-kind="above" />
            ))}
            <span className={styles.card} data-kind="kraken" />
            {Array.from({ length: kraken.below }, (_, i) => (
              <span key={`b${i}`} className={styles.card} data-kind="below" />
            ))}
          </span>
          <span className={styles.left}>{t('hud.left', { n: left })}</span>
        </div>
        <div className={styles.krakenRow}>
          <span className={styles.attacksLabel}>{t('hud.attacks')}</span>
          <span className={styles.srOnly}>{nowText}</span>
          <span className={styles.dial} aria-hidden="true">
            {KRAKEN_TRACK.map((space, i) => (
              <span key={i} className={styles.dialSpace} data-now={i === krakenSpace}>
                {space === 'skull' ? <Skull size={13} weight="fill" /> : space}
              </span>
            ))}
          </span>
        </div>
      </div>
    </section>
  )
}
