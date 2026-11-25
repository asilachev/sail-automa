import { ArrowRight, Scales } from '@phosphor-icons/react'
import { useState } from 'react'
import {
  RULING_KEYS,
  SCENARIOS,
  bosunHasCannonWheel,
  changedRulings,
  type Difficulty,
  type ScenarioId,
  type Seat,
  type Settings,
} from '../../engine/index.ts'
import {
  ActionBar,
  Button,
  ChipGroup,
  Dialog,
  ListRow,
  OptionCards,
  SegmentGroup,
  ToggleRow,
} from '../components/index.ts'
import { useT } from '../i18n/index.ts'
import { useNav } from '../nav.ts'
import { saveLastSettings } from '../state/lastSettings.ts'
import { useCaptainsLog } from '../state/history.ts'
import { useVoyage } from '../state/useVoyage.ts'
import { BackBar } from './BackBar.tsx'
import styles from './newVoyage.module.css'
import { RulingsSheet } from './RulingsSheet.tsx'
import { draftSettings } from './texts.ts'

/**
 * B1 · New voyage (B5 on Hard): the scenario (Learning and 1 to 5, docs/decisions.md), your seat,
 * the difficulty, the Bosun's Cannon + Wheel pirate and the rulings (B4). It starts from the last
 * voyage's settings. When a voyage is saved, it first asks to abandon it (D7).
 */
export function NewVoyage() {
  const t = useT()
  const nav = useNav()
  const { voyage, end } = useVoyage()
  const { record } = useCaptainsLog()
  const [settings, setSettings] = useState<Settings>(draftSettings)
  const [rulingsOpen, setRulingsOpen] = useState(false)
  // A finished voyage needs no asking; one in progress does (design 00: ending and abandoning ask).
  const [asking, setAsking] = useState(voyage !== null && voyage.state.result === null)
  const set = (change: Partial<Settings>) => setSettings((s) => ({ ...s, ...change }))
  const hard = settings.difficulty === 'hard'
  const changed = changedRulings(settings.rulings)

  const difficulties: readonly { value: Difficulty; label: string; description: string }[] = [
    { value: 'easy', label: t('newVoyage.easy'), description: t('newVoyage.easyDesc') },
    { value: 'medium', label: t('newVoyage.medium'), description: t('newVoyage.mediumDesc') },
    { value: 'hard', label: t('newVoyage.hard'), description: t('newVoyage.hardDesc') },
  ]

  return (
    <div className={styles.page}>
      <BackBar label={t('newVoyage.back')} onBack={() => nav.go('home', 'back')} />
      <main className={styles.content} aria-labelledby="new-voyage-title">
        <div className={styles.titleBlock}>
          <h1 id="new-voyage-title" className={styles.title}>
            {t('newVoyage.title')}
          </h1>
        </div>

        <div className={`${styles.section} ${styles.scenarios}`}>
          <ChipGroup<ScenarioId>
            label={t('newVoyage.scenario')}
            showLabel
            options={SCENARIOS.map((s) => ({
              value: s.id,
              label: s.id === 'learning' ? t('newVoyage.learning') : String(s.id),
              name: t('newVoyage.scenarioName', { scenario: s.id }),
            }))}
            value={settings.scenario}
            onChange={(scenario) => set({ scenario })}
          />
          <p className={styles.hint}>{t('newVoyage.scenarioHint')}</p>
        </div>

        <div className={styles.section}>
          <SegmentGroup<Seat>
            label={t('newVoyage.seat')}
            showLabel
            size="small"
            options={[
              { value: 'left', label: t('newVoyage.seatLeft') },
              { value: 'right', label: t('newVoyage.seatRight') },
            ]}
            value={settings.seat}
            onChange={(seat) => set({ seat })}
          />
          <p className={styles.hint}>{t('newVoyage.seatHint')}</p>
        </div>

        <OptionCards<Difficulty>
          label={t('newVoyage.difficulty')}
          showLabel
          options={difficulties}
          value={settings.difficulty}
          onChange={(difficulty) => set({ difficulty })}
        />

        <div className={styles.section} role="group" aria-labelledby="new-voyage-pirate">
          <span id="new-voyage-pirate" className={styles.eyebrow}>
            {t('newVoyage.pirate')}
          </span>
          {/* On Hard the Bosun has no Pirate card (docs/automa.md → Difficulty): greyed, B5. */}
          <ToggleRow
            label={t('newVoyage.cw')}
            hint={t('newVoyage.cwHint')}
            checked={bosunHasCannonWheel(settings)}
            disabled={hard}
            onChange={(bosunCannonWheel) => set({ bosunCannonWheel })}
          />
          {hard ? (
            <p className={styles.hint} data-after="row">
              {t('newVoyage.hardNote')}
            </p>
          ) : null}
        </div>

        <ListRow
          icon={<Scales size={20} weight="fill" />}
          label={t('newVoyage.rulings')}
          value={t('newVoyage.rulingsLine', { changed, total: RULING_KEYS.length })}
          onClick={() => setRulingsOpen(true)}
        />
      </main>

      <ActionBar>
        <Button
          iconEnd={<ArrowRight size={20} weight="fill" aria-hidden />}
          onClick={() => {
            // Set up the table reads them back, also after a reload.
            saveLastSettings(settings)
            nav.go('setup', 'push')
          }}
        >
          {t('newVoyage.next')}
        </Button>
      </ActionBar>

      {rulingsOpen ? (
        <RulingsSheet
          rulings={settings.rulings}
          onChange={(rulings) => set({ rulings })}
          onClose={() => setRulingsOpen(false)}
        />
      ) : null}

      {asking ? (
        <Dialog
          title={t('abandon.title')}
          body={t('abandon.body')}
          confirmLabel={t('abandon.yes')}
          onConfirm={() => {
            // It goes into the captain's log as unfinished, as the dialog says (#8).
            if (voyage) record(voyage)
            end()
            setAsking(false)
          }}
          cancelLabel={t('abandon.keep')}
          onClose={() => nav.go('home', 'back')}
        />
      ) : null}
    </div>
  )
}
