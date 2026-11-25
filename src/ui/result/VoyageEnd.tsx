import {
  ArrowRight,
  CheckCircle,
  CloudLightning,
  FlagCheckered,
  HourglassMedium,
  Plus,
  Scroll,
  Skull,
  Stack,
} from '@phosphor-icons/react'
import { useEffect, type ReactNode } from 'react'
import { hud, type LoseReason, type VoyageResult, type VoyageState } from '../../engine/index.ts'
import { ActionBar, Button, ListRow, numeral } from '../components/index.ts'
import { useT, type Translate } from '../i18n/index.ts'
import { useNav } from '../nav.ts'
import { logCounts, useCaptainsLog, type EndedVoyage } from '../state/history.ts'
import { saveLastSettings } from '../state/lastSettings.ts'
import { voyageName } from '../log/format.ts'
import { useVoyage } from '../state/useVoyage.ts'
import { KeyFigures, type Figure } from './Figures.tsx'
import { Hero } from './Hero.tsx'
import styles from './result.module.css'

/** The ways to lose, in the order E2 lists the others (docs/automa.md → Steps and events). */
const LOSE_REASONS: readonly LoseReason[] = [
  'krakenAlone',
  'storm',
  'roundFive',
  'skull',
  'pastEnd',
]

const WAY_ICON: Readonly<Record<LoseReason, ReactNode>> = {
  krakenAlone: <Stack size={18} weight="fill" />,
  storm: <CloudLightning size={18} weight="fill" />,
  roundFive: <HourglassMedium size={18} weight="fill" />,
  skull: <Skull size={18} weight="fill" />,
  pastEnd: <FlagCheckered size={18} weight="fill" />,
}

/**
 * The voyage's end (design E1 · Land ho, E2 · The Kraken wins), route `result`. It shows the saved
 * voyage once the engine has a result, and logs it in the captain's log (idempotent, so the game
 * screen logging it too changes nothing). Leaving it ends the voyage: the saved voyage is cleared.
 */
export function VoyageEnd() {
  const { voyage, end } = useVoyage()
  const nav = useNav()
  const log = useCaptainsLog()
  const result = voyage?.state.result ?? null
  const { record } = log

  useEffect(() => {
    if (voyage && result) record(voyage)
    else nav.go('home', 'none')
    // Recording is idempotent, so running again (a new nav after leaving) logs nothing twice.
  }, [voyage, result, record, nav])

  if (!voyage || !result) return null

  const leave = (screen: 'home' | 'newVoyage' | 'log' | 'setup', motion: 'push' | 'back') => {
    end()
    nav.go(screen, motion)
  }
  const counts = logCounts(log.entries)
  return result.outcome === 'won' ? (
    <Won voyage={voyage} result={result} counts={counts} leave={leave} />
  ) : (
    <Lost
      voyage={voyage}
      result={result}
      onRetry={() => {
        // Setup starts the voyage at Set sail (#6); it reads these settings.
        saveLastSettings(voyage.settings)
        leave('setup', 'push')
      }}
      leave={leave}
    />
  )
}

type Leave = (screen: 'home' | 'newVoyage' | 'log' | 'setup', motion: 'push' | 'back') => void

/** Tricks won over the whole voyage, from the engine's log. */
function totalTricks(state: VoyageState): { you: number; bosun: number } {
  const totals = { you: 0, bosun: 0 }
  for (const entry of state.log) if (entry.kind === 'trick') totals[entry.winner]++
  return totals
}

function commonFigures(t: Translate, state: VoyageState, round: number): Figure[] {
  const tricks = totalTricks(state)
  return [
    {
      key: 'rounds',
      label: t('voyageEnd.rounds'),
      value: numeral(round),
      sub: t('voyageEnd.roundsOf'),
    },
    {
      key: 'tricks',
      label: t('voyageEnd.tricks'),
      value: `${tricks.you} · ${tricks.bosun}`,
      valueLabel: t('voyageEnd.tricksValue', tricks),
      sub: t('voyageEnd.tricksSub'),
    },
  ]
}

function Won({
  voyage,
  result,
  counts,
  leave,
}: {
  voyage: EndedVoyage
  result: Extract<VoyageResult, { outcome: 'won' }>
  counts: { voyages: number; reachedLand: number }
  leave: Leave
}) {
  const t = useT()
  const cards = hud(voyage.state).kraken.cards
  const figures: Figure[] = [
    ...commonFigures(t, voyage.state, result.round),
    {
      key: 'kraken',
      label: t('voyageEnd.krakenDeck'),
      value: cards,
      sub: t('voyageEnd.cardsLeft', { n: cards }),
      tone: 'danger',
    },
  ]
  return (
    <main className={styles.page}>
      <div className={styles.content} data-gap="18">
        <Hero
          outcome="won"
          title={t('voyageEnd.wonTitle')}
          sub={t('voyageEnd.wonSub', { round: numeral(result.round) })}
        />
        <KeyFigures figures={figures} />
        <p className={styles.logged}>
          <CheckCircle size={20} weight="fill" className={styles.loggedIcon} aria-hidden />
          <span>{t('voyageEnd.logged', { voyage: voyageName(t, voyage.settings) })}</span>
        </p>
        <ListRow
          icon={<Scroll size={20} weight="fill" />}
          label={t('voyageEnd.log')}
          value={t('voyageEnd.logValue', { won: counts.reachedLand, total: counts.voyages })}
          onClick={() => leave('log', 'push')}
        />
        <div className={styles.center}>
          <Button variant="text" onClick={() => leave('home', 'back')}>
            {t('voyageEnd.home')}
          </Button>
        </div>
      </div>
      <ActionBar>
        <Button
          iconEnd={<ArrowRight size={20} weight="fill" aria-hidden />}
          onClick={() => leave('newVoyage', 'push')}
        >
          {t('voyageEnd.newVoyage')}
        </Button>
      </ActionBar>
    </main>
  )
}

function Lost({
  voyage,
  result,
  onRetry,
  leave,
}: {
  voyage: EndedVoyage
  result: Extract<VoyageResult, { outcome: 'lost' }>
  onRetry: () => void
  leave: Leave
}) {
  const t = useT()
  const attacks = hud(voyage.state).attacksAtRoundEnd
  const figures: Figure[] = [
    ...commonFigures(t, voyage.state, result.round),
    {
      key: 'kraken',
      label: t('voyageEnd.kraken'),
      value:
        attacks === null ? (
          <Skull size={26} weight="fill" aria-label={t('voyageEnd.skull')} />
        ) : (
          t('voyageEnd.attacks', { n: attacks })
        ),
      sub: t('voyageEnd.atRoundEnd'),
      tone: 'danger',
    },
  ]
  const others = LOSE_REASONS.filter((r) => r !== result.reason)
  return (
    <main className={styles.page}>
      <div className={styles.content} data-gap="22">
        <Hero
          outcome="lost"
          title={t('voyageEnd.lostTitle')}
          sub={t('voyageEnd.lostSub', { reason: result.reason, round: numeral(result.round) })}
        />
        <KeyFigures figures={figures} />
        <section className={styles.ways} aria-labelledby="other-ways">
          <h2 id="other-ways" className={styles.eyebrow}>
            {t('voyageEnd.otherWays')}
          </h2>
          <ul className={styles.wayList}>
            {others.map((reason) => (
              <li key={reason} className={styles.way}>
                <span className={styles.wayIcon} aria-hidden="true">
                  {WAY_ICON[reason]}
                </span>
                {t('voyageEnd.way', { reason })}
              </li>
            ))}
          </ul>
        </section>
        <Button
          variant="secondary"
          icon={<Plus size={18} weight="bold" aria-hidden />}
          onClick={() => leave('newVoyage', 'push')}
        >
          {t('voyageEnd.newVoyage')}
        </Button>
      </div>
      <ActionBar>
        <Button iconEnd={<ArrowRight size={20} weight="fill" aria-hidden />} onClick={onRetry}>
          {t('voyageEnd.again', { scenario: String(voyage.settings.scenario) })}
        </Button>
      </ActionBar>
    </main>
  )
}
