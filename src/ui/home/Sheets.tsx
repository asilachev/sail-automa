import { ArrowSquareOut, GithubLogo } from '@phosphor-icons/react'
import { LanguageRow, ListRow, Sheet } from '../components/index.ts'
import { LANGS, useI18n, useT } from '../i18n/index.ts'
import styles from './sheets.module.css'

/** The app's code, MIT (Credits, Settings → Source code). */
export const SOURCE_URL = 'https://github.com/asilachev/sail-automa'
/** The publisher (AGENTS.md → Credit). */
export const ALLPLAY_URL = 'https://allplay.com'
/** Sail Solitaire, Chuck Rosselli's file on BoardGameGeek (#16). */
export const BGG_URL = 'https://boardgamegeek.com/filepage/268364/sail-solo-variant'

/**
 * F2 · Language: the five languages in their own names (languages layer order). A pick switches
 * at once and closes the sheet; Home, Settings and the game's menu open it.
 */
export function LanguageSheet({ onClose }: { onClose: () => void }) {
  const t = useT()
  const { lang, setLang } = useI18n()
  return (
    <Sheet title={t('language.title')} onClose={onClose}>
      {(close) => (
        <>
          <div className={styles.list}>
            {LANGS.map((l) => (
              <LanguageRow
                key={l.code}
                code={l.code.toUpperCase()}
                name={l.name}
                lang={l.tag}
                selected={l.code === lang}
                onSelect={() => {
                  setLang(l.code)
                  close()
                }}
              />
            ))}
          </div>
          <p className={styles.note}>{t('language.note')}</p>
        </>
      )}
    </Sheet>
  )
}

/**
 * F4 · Credits: the game's designers, its illustrator and publisher, Sail Solitaire's author
 * (AGENTS.md → Credit), and what this app is.
 */
export function CreditsSheet({ onClose }: { onClose: () => void }) {
  const t = useT()
  const sections = [
    ['credits.gameLabel', 'credits.game'],
    ['credits.variantLabel', 'credits.variant'],
    ['credits.appLabel', 'credits.app'],
  ] as const
  return (
    <Sheet title={t('credits.title')} onClose={onClose}>
      {sections.map(([label, text]) => (
        <section key={label} className={styles.credit}>
          <h3 className={styles.label}>{t(label)}</h3>
          <p className={styles.text}>{t(text)}</p>
        </section>
      ))}
      <p className={styles.fonts}>{t('credits.fonts')}</p>
      <div className={styles.list}>
        <ListRow
          icon={<ArrowSquareOut size={20} weight="fill" />}
          label={t('credits.allplay')}
          href={ALLPLAY_URL}
        />
        <ListRow
          icon={<ArrowSquareOut size={20} weight="fill" />}
          label={t('credits.bgg')}
          href={BGG_URL}
        />
        <ListRow
          icon={<GithubLogo size={20} weight="fill" />}
          label={t('credits.github')}
          value="MIT"
          href={SOURCE_URL}
        />
      </div>
    </Sheet>
  )
}
