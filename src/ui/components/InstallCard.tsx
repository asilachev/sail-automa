import { useT } from '../i18n/index.ts'
import styles from './kit.module.css'
import { Picture } from './Picture.tsx'

/** The install offer on Home (Components → Install Card; design A2, PWA checklist → Install). */
export function InstallCard({ onInstall }: { onInstall: () => void }) {
  const t = useT()
  return (
    <section className={styles.install} aria-label={t('install.title')}>
      <Picture name="helm" size={52} />
      <span className={styles.rowBody}>
        <span className={styles.installTitle}>{t('install.title')}</span>
        <span className={styles.installSub}>{t('install.sub')}</span>
      </span>
      <button
        type="button"
        className={`${styles.piece} ${styles.installButton}`}
        onClick={onInstall}
      >
        {t('install.button')}
      </button>
    </section>
  )
}
