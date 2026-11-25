import { useEffect, useMemo, useState } from 'react'
import {
  I18nContext,
  LANGS,
  loadCatalog,
  translatorFor,
  type I18n,
  type Lang,
} from './i18n/index.ts'
import { loadPrefs, savePrefs } from './state/prefs.ts'
import { browserLanguages, detectLang } from './i18n/index.ts'
import styles from './app.module.css'

/**
 * The app shell. For now it shows the wordmark: the screens come one issue at a time, from the
 * design (~/Graphics/sail-automa.pen, sections A to F).
 */
export function App() {
  const [lang, setLangState] = useState<Lang>(
    () => loadPrefs().language ?? detectLang(browserLanguages()),
  )

  useEffect(() => {
    document.documentElement.lang = LANGS.find((l) => l.code === lang)?.tag ?? lang
  }, [lang])

  const i18n = useMemo<I18n>(
    () => ({
      lang,
      t: translatorFor(lang),
      setLang(next) {
        void loadCatalog(next).then(() => {
          savePrefs({ ...loadPrefs(), language: next })
          setLangState(next)
        })
      },
    }),
    [lang],
  )

  return (
    <I18nContext.Provider value={i18n}>
      <main className={styles.shell} aria-label={i18n.t('app.name')}>
        <h1 className={styles.wordmark}>{i18n.t('app.wordmark')}</h1>
        <p className={styles.sub}>{i18n.t('app.sub')}</p>
        <p className={styles.footer}>{i18n.t('home.footer')}</p>
      </main>
    </I18nContext.Provider>
  )
}
