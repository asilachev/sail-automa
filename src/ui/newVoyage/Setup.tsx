import { ArrowRight } from '@phosphor-icons/react'
import { useState } from 'react'
import type { Settings } from '../../engine/index.ts'
import { ActionBar, Button, CheckItem } from '../components/index.ts'
import { useI18n } from '../i18n/index.ts'
import { useNav } from '../nav.ts'
import { usePrefs } from '../state/PrefsContext.ts'
import { saveLastSettings } from '../state/lastSettings.ts'
import { useVoyage } from '../state/useVoyage.ts'
import { requestPersistentStorage } from '../pwa/pwa.ts'
import { BackBar } from './BackBar.tsx'
import styles from './newVoyage.module.css'
import { draftSettings, setupLines } from './texts.ts'

/**
 * B2, B3 · Set up the table: tick each line as you do it at the table. Set sail stays disabled,
 * with a note, until every line is ticked. The ticks are screen-only (pwa layer → State): they
 * log nothing and aren't saved. Set sail starts the voyage, asks for persistent storage and goes
 * to the game.
 */
export function Setup() {
  const { t, lang } = useI18n()
  const nav = useNav()
  const { update } = usePrefs()
  const { start } = useVoyage()
  // The settings New voyage chose (it saved them on Next), or the last ones.
  const [settings] = useState<Settings>(draftSettings)
  const lines = setupLines(t, lang, settings)
  const [ticked, setTicked] = useState<readonly boolean[]>(() => lines.map(() => false))
  const left = ticked.filter((x) => !x).length
  const note =
    left === 0
      ? undefined
      : left === lines.length
        ? t('setup.noteAll', { n: left })
        : t('setup.note', { n: left })

  const setSail = () => {
    saveLastSettings(settings)
    start(settings)
    update({ played: true })
    // design 00 → PWA checklist: persist() at Set sail.
    requestPersistentStorage()
    nav.go('game', 'push')
  }

  return (
    <div className={styles.page}>
      <BackBar label={t('setup.back')} onBack={() => nav.go('newVoyage', 'back')} />
      <main className={styles.content} data-tight="true" aria-labelledby="setup-title">
        <div className={styles.titleBlock}>
          <h1 id="setup-title" className={styles.title}>
            {t('setup.title')}
          </h1>
          <p className={styles.sub}>
            {t('setup.sub', {
              scenario: t('newVoyage.scenarioName', { scenario: settings.scenario }),
              difficulty: settings.difficulty,
            })}
          </p>
        </div>
        <ul className={styles.checklist} aria-labelledby="setup-title">
          {lines.map((line, i) => (
            <li key={i}>
              <CheckItem
                checked={ticked[i] === true}
                onChange={(on) => setTicked((all) => all.map((x, j) => (j === i ? on : x)))}
              >
                {line.split('\n').map((part, j) => (
                  <span key={j} className={styles.line}>
                    {part}
                  </span>
                ))}
              </CheckItem>
            </li>
          ))}
        </ul>
      </main>
      <ActionBar {...(note ? { note } : {})}>
        <Button
          disabled={left > 0}
          iconEnd={<ArrowRight size={20} weight="fill" aria-hidden />}
          onClick={setSail}
        >
          {t('setup.go')}
        </Button>
      </ActionBar>
    </div>
  )
}
