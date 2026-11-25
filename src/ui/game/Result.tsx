import { currentStep } from '../../engine/index.ts'
import { Button } from '../components/index.ts'
import { useT } from '../i18n/index.ts'
import { useNav } from '../nav.ts'
import { useVoyageContext } from '../state/VoyageContext.ts'
import styles from './game.module.css'

/**
 * Stands in for the voyage's end (design E1 · Land ho, E2 · The Kraken wins) until #8 builds it:
 * the heading and a way home.
 */
export function Result() {
  const t = useT()
  const nav = useNav()
  const { voyage } = useVoyageContext()
  const step = voyage ? currentStep(voyage.state) : null
  return (
    <main className={styles.result}>
      <h1 className={styles.title}>{t(step?.kind === 'won' ? 'result.won' : 'result.lost')}</h1>
      <Button variant="secondary" onClick={() => nav.go('home', 'back')}>
        {t('result.home')}
      </Button>
    </main>
  )
}
