import {
  Anchor,
  ArrowFatRight,
  ArrowRight,
  BookOpen,
  GearSix,
  GlobeSimple,
  Plus,
  Scroll,
  UsersThree,
} from '@phosphor-icons/react'
import { useEffect, useId, useState } from 'react'
import { seaContours } from '../assets/art/index.ts'
import {
  ActionBar,
  Button,
  Dialog,
  InstallCard,
  ListRow,
  numeral,
  Picture,
  Step,
  Steps,
} from '../components/index.ts'
import { useI18n, useT } from '../i18n/index.ts'
import { useNav } from '../nav.ts'
import { useInstall } from '../pwa/install.ts'
import { usePrefs } from '../state/PrefsContext.ts'
import { useVoyage } from '../state/useVoyage.ts'
import styles from './home.module.css'
import { Lattice, Placed, Tile } from './Scene.tsx'
import { CreditsSheet, LanguageSheet } from './Sheets.tsx'
import { voyageSummary, type VoyageSummary } from './summary.ts'

export interface HomeProps {
  /** Opens the rules (the D6 · Rules sheet, from the game's issue). */
  onRules: () => void
  /** Voyages in the captain's log, once it exists (E3); undefined or 0 says "No voyages yet". */
  logCount?: number
}

type Layer = 'language' | 'credits' | 'end' | null

/**
 * A2 · Home · first visit and A3 · Home · voyage in progress. With a saved voyage, its summary
 * and Continue · Round N; without one, the hero, the install card and how it plays.
 */
export function Home({ onRules, logCount }: HomeProps) {
  const t = useT()
  const nav = useNav()
  const { voyage, end } = useVoyage()
  const { update } = usePrefs()
  const install = useInstall()
  const [layer, setLayer] = useState<Layer>(null)
  const close = () => setLayer(null)
  const summary = voyage ? voyageSummary(voyage.state) : null

  // A voyage on this device: Home no longer counts as a first visit.
  useEffect(() => {
    if (voyage) update({ played: true })
  }, [voyage, update])

  return (
    <div className={styles.page}>
      <TopBar onLanguage={() => setLayer('language')} />
      <main className={styles.content} data-saved={summary !== null}>
        {summary ? (
          <>
            <SavedVoyage summary={summary} />
            <div className={styles.saved}>
              <Button
                variant="secondary"
                icon={<Plus size={18} weight="bold" aria-hidden />}
                onClick={() => nav.go('newVoyage', 'push')}
              >
                {t('home.newVoyage')}
              </Button>
              <Button variant="text" className={styles.end} onClick={() => setLayer('end')}>
                {t('home.endVoyage')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <Hero />
            {install.canInstall ? <InstallCard onInstall={install.install} /> : null}
            <HowItPlays />
          </>
        )}
        <nav className={styles.links}>
          <ListRow
            icon={<Scroll size={20} weight="fill" />}
            label={t('home.log')}
            value={logCount ? t('home.logCount', { n: logCount }) : t('home.logEmpty')}
            onClick={() => nav.go('log', 'push')}
          />
          <ListRow
            icon={<BookOpen size={20} weight="fill" />}
            label={t('home.rules')}
            onClick={onRules}
          />
          <ListRow
            icon={<UsersThree size={20} weight="fill" />}
            label={t('home.credits')}
            onClick={() => setLayer('credits')}
          />
        </nav>
        <p className={styles.footer}>{t('home.footer')}</p>
      </main>
      <ActionBar>
        {summary ? (
          <Button
            iconEnd={<ArrowRight size={20} weight="fill" aria-hidden />}
            onClick={() => nav.go('game', 'fade')}
          >
            {t('home.continue', { round: numeral(summary.round) })}
          </Button>
        ) : (
          <Button
            iconEnd={<ArrowRight size={20} weight="fill" aria-hidden />}
            onClick={() => nav.go('newVoyage', 'push')}
          >
            {t('home.start')}
          </Button>
        )}
      </ActionBar>
      {layer === 'language' ? <LanguageSheet onClose={close} /> : null}
      {layer === 'credits' ? <CreditsSheet onClose={close} /> : null}
      {layer === 'end' ? (
        <Dialog
          title={t('home.endTitle')}
          body={t('home.endBody')}
          confirmLabel={t('home.endYes')}
          cancelLabel={t('home.endNo')}
          onConfirm={() => {
            end()
            close()
          }}
          onClose={close}
        />
      ) : null}
    </div>
  )
}

/** The app bar: the helm and BOSUN lockup, the language chip and Settings. */
function TopBar({ onLanguage }: { onLanguage: () => void }) {
  const t = useT()
  const nav = useNav()
  const { lang } = useI18n()
  return (
    <header className={styles.top}>
      <div className={styles.brand}>
        <Picture name="helm" size={45} className={styles.mark} />
        <h1 className={styles.wordmark}>{t('app.wordmark')}</h1>
      </div>
      <button
        type="button"
        className={styles.globe}
        aria-label={t('home.language', { name: lang.toUpperCase() })}
        onClick={onLanguage}
      >
        <GlobeSimple size={18} weight="fill" aria-hidden />
        <span aria-hidden="true">{lang.toUpperCase()}</span>
      </button>
      <button
        type="button"
        className={styles.iconButton}
        aria-label={t('home.settings')}
        onClick={() => nav.go('settings', 'push')}
      >
        <GearSix size={22} weight="fill" aria-hidden />
      </button>
    </header>
  )
}

/** A2's hero: the ocean board with its tokens, then what the app does. */
function Hero() {
  const t = useT()
  const titleId = useId()
  return (
    <section className={styles.hero} aria-labelledby={titleId}>
      <div className={styles.scene} aria-hidden="true">
        <img className={styles.contours} src={seaContours} alt="" draggable={false} />
        <Lattice width={358} height={150} period={80} back={-115} forward={-5} />
        <Tile kind="anchor" side={49} x={99.5} y={94.5} />
        <Placed x={86} y={81}>
          <Anchor size={29} weight="bold" color="#8fd2c8" />
        </Placed>
        <Tile kind="island" side={49} x={219.5} y={54.5} />
        <Placed x={198} y={34}>
          <Picture name="island" size={44} className={styles.island} />
        </Placed>
        <Tile kind="kraken" side={49} x={259.5} y={94.5} />
        <Placed x={241} y={67}>
          <Picture name="tentacle" size={46} className={styles.smallTentacle} />
        </Placed>
        <Placed x={278} y={6}>
          <Picture name="cloud" size={76} className={styles.cloud} />
        </Placed>
        <Placed x={298} y={62}>
          <Picture name="tentacle" size={100} className={styles.bigTentacle} />
        </Placed>
        <Placed x={52} y={-1} flip>
          <Picture name="ship" size={88} className={styles.ship} />
        </Placed>
        <Placed x={163} y={41}>
          <ArrowFatRight size={34} weight="fill" color="#f26a3d" className={styles.arrow} />
        </Placed>
      </div>
      <div className={styles.heroText}>
        <p className={styles.pennant}>{t('home.eyebrow')}</p>
        <h2 id={titleId} className={styles.heroTitle}>
          {t('home.title')}
        </h2>
        <p className={styles.lead}>{t('home.lead')}</p>
      </div>
    </section>
  )
}

/** HOW IT PLAYS: three numbered steps. */
function HowItPlays() {
  const t = useT()
  const labelId = useId()
  return (
    <section className={styles.how} aria-labelledby={labelId}>
      <h2 id={labelId} className={styles.label}>
        {t('home.how')}
      </h2>
      <Steps>
        <Step n={1}>{t('home.how1')}</Step>
        <Step n={2}>{t('home.how2')}</Step>
        <Step n={3}>{t('home.how3')}</Step>
      </Steps>
    </section>
  )
}

/** A3's card: VOYAGE IN PROGRESS, the scenario and difficulty, where it stands, the Kraken. */
function SavedVoyage({ summary }: { summary: VoyageSummary }) {
  const t = useT()
  const titleId = useId()
  const { kraken, attacks } = summary
  return (
    <section className={styles.voyage} aria-labelledby={titleId}>
      <p className={styles.eyebrow}>{t('home.inProgress')}</p>
      <h2 id={titleId} className={styles.voyageTitle}>
        {t('home.summary', {
          scenario: String(summary.scenario),
          difficulty: summary.difficulty,
        })}
      </h2>
      <p className={styles.voyageLine}>
        {t('home.line', {
          round: numeral(summary.round),
          trick: summary.trick,
          you: summary.tricks.you,
          bosun: summary.tricks.bosun,
        })}
      </p>
      <div className={styles.kraken}>
        <span className={styles.krakenLabel}>{t('home.kraken')}</span>
        <span className={styles.deck} aria-hidden="true">
          {Array.from({ length: kraken.above }, (_, i) => (
            <span key={`a${i}`} className={styles.card} />
          ))}
          <span className={styles.card} data-kind="kraken" />
          {Array.from({ length: kraken.below }, (_, i) => (
            <span key={`b${i}`} className={styles.card} data-kind="below" />
          ))}
        </span>
        <span className={styles.krakenText}>
          {attacks === null
            ? t('home.krakenSkull', { cards: kraken.cards })
            : t('home.krakenLine', { cards: kraken.cards, attacks })}
        </span>
      </div>
    </section>
  )
}
