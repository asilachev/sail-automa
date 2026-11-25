import {
  CaretLeft,
  DownloadSimple,
  GithubLogo,
  GlobeSimple,
  UsersThree,
} from '@phosphor-icons/react'
import { useId, useState, type ReactNode } from 'react'
import { ListRow, SegmentGroup, ToggleRow } from '../components/index.ts'
import { CreditsSheet, LanguageSheet, SOURCE_URL } from '../home/Sheets.tsx'
import { LANGS, useI18n, useT } from '../i18n/index.ts'
import { useNav } from '../nav.ts'
import { useInstall } from '../pwa/install.ts'
import { usePrefs } from '../state/PrefsContext.ts'
import { THEMES } from '../state/prefs.ts'
import styles from './settings.module.css'

/** A4 · Settings: language, theme, keeping the screen awake, installing, credits and the code. */
export function Settings() {
  const t = useT()
  const nav = useNav()
  const { lang } = useI18n()
  const { prefs, update } = usePrefs()
  const install = useInstall()
  const [layer, setLayer] = useState<'language' | 'credits' | null>(null)
  const close = () => setLayer(null)
  const language = LANGS.find((l) => l.code === lang)

  return (
    <div className={styles.page}>
      <header className={styles.back}>
        <button type="button" className={styles.backButton} onClick={() => nav.go('home', 'back')}>
          <CaretLeft size={20} weight="fill" aria-hidden />
          {t('settings.back')}
        </button>
      </header>
      <main className={styles.content}>
        <h1 className={styles.title}>{t('settings.title')}</h1>
        <Group label={t('settings.language')}>
          <ListRow
            icon={<GlobeSimple size={20} weight="fill" />}
            label={language?.name ?? lang}
            value={lang.toUpperCase()}
            onClick={() => setLayer('language')}
          />
        </Group>
        <div className={`${styles.group} ${styles.theme}`}>
          <SegmentGroup
            label={t('settings.theme')}
            showLabel
            size="small"
            options={THEMES.map((theme) => ({ value: theme, label: t(`theme.${theme}`) }))}
            value={prefs.theme}
            onChange={(theme) => update({ theme })}
          />
          <p className={styles.hint}>{t('settings.themeHint')}</p>
        </div>
        <Group label={t('settings.atTable')}>
          <ToggleRow
            label={t('settings.awake')}
            hint={t('settings.awakeHint')}
            checked={prefs.wakeLock}
            onChange={(wakeLock) => update({ wakeLock })}
          />
          {install.canInstall ? (
            <ListRow
              icon={<DownloadSimple size={20} weight="fill" />}
              label={t('settings.install')}
              onClick={install.install}
            />
          ) : null}
        </Group>
        <Group label={t('settings.about')}>
          <ListRow
            icon={<UsersThree size={20} weight="fill" />}
            label={t('home.credits')}
            onClick={() => setLayer('credits')}
          />
          <ListRow
            icon={<GithubLogo size={20} weight="fill" />}
            label={t('settings.source')}
            value="MIT"
            href={SOURCE_URL}
          />
        </Group>
        <p className={styles.privacy}>{t('settings.privacy')}</p>
      </main>
      {layer === 'language' ? <LanguageSheet onClose={close} /> : null}
      {layer === 'credits' ? <CreditsSheet onClose={close} /> : null}
    </div>
  )
}

/** A labelled section: LANGUAGE, AT THE TABLE, ABOUT. */
function Group({ label, children }: { label: string; children: ReactNode }) {
  const id = useId()
  return (
    <section className={styles.group} aria-labelledby={id}>
      <h2 id={id} className={styles.label}>
        {label}
      </h2>
      <div className={styles.rows}>{children}</div>
    </section>
  )
}
