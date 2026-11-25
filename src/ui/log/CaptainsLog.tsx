import { ArrowRight, Check, Scroll } from '@phosphor-icons/react'
import { useState } from 'react'
import { ActionBar, Button, Dialog } from '../components/index.ts'
import { useI18n } from '../i18n/index.ts'
import { useNav } from '../nav.ts'
import { BackBar } from '../newVoyage/BackBar.tsx'
import { KeyFigures, type Figure } from '../result/Figures.tsx'
import {
  logStats,
  scenarioGrid,
  useCaptainsLog,
  type GridCell,
  type VoyageRecord,
} from '../state/history.ts'
import { outcomeTag, percent, shortDate, voyageDate, voyageName } from './format.ts'
import styles from './log.module.css'

/** How many voyages "Recent voyages" lists. */
const RECENT = 10

/**
 * The captain's log (design E3; E5 when empty), route `log`: voyages, landfalls and the win rate,
 * every scenario by difficulty, and the recent voyages. "Clear the log" asks first (E4).
 */
export function CaptainsLog() {
  const { t, lang } = useI18n()
  const nav = useNav()
  const log = useCaptainsLog()
  const [asking, setAsking] = useState(false)
  const { entries } = log
  const stats = logStats(entries)

  const figures: Figure[] = [
    {
      key: 'voyages',
      label: t('captainsLog.voyages'),
      value: stats.voyages,
      sub: stats.since ? t('captainsLog.since', { date: shortDate(lang, stats.since) }) : '',
    },
    {
      key: 'reached',
      label: t('captainsLog.reached'),
      value: stats.reachedLand,
      sub: t('captainsLog.reachedSub', { n: stats.reachedLand }),
      tone: 'gold',
    },
    {
      key: 'rate',
      label: t('captainsLog.rate'),
      value: stats.winRate === null ? '—' : percent(lang, stats.winRate),
      sub: t('captainsLog.rateSub'),
    },
  ]

  return (
    <main className={styles.page} aria-labelledby="captains-log-title">
      <BackBar label={t('captainsLog.back')} onBack={() => nav.go('home', 'back')} />
      <div className={styles.content}>
        <h1 id="captains-log-title" className={styles.title}>
          {t('captainsLog.title')}
        </h1>
        {entries.length === 0 ? (
          <div className={styles.empty}>
            <Scroll size={32} weight="fill" className={styles.emptyIcon} aria-hidden />
            <h2 className={styles.emptyTitle}>{t('captainsLog.emptyTitle')}</h2>
            <p className={styles.emptyWhy}>{t('captainsLog.emptyWhy')}</p>
          </div>
        ) : (
          <>
            <KeyFigures figures={figures} />
            <Grid entries={entries} />
            <Recent entries={entries.slice(0, RECENT)} />
            <div className={styles.center}>
              <Button variant="text" className={styles.clear} onClick={() => setAsking(true)}>
                {t('captainsLog.clear')}
              </Button>
            </div>
          </>
        )}
      </div>
      {entries.length === 0 ? (
        <ActionBar>
          <Button
            iconEnd={<ArrowRight size={20} weight="fill" aria-hidden />}
            onClick={() => nav.go('newVoyage', 'push')}
          >
            {t('captainsLog.start')}
          </Button>
        </ActionBar>
      ) : null}
      {asking ? (
        <Dialog
          title={t('captainsLog.clearTitle')}
          body={t('captainsLog.clearBody', { n: entries.length })}
          confirmLabel={t('captainsLog.clearYes')}
          onConfirm={() => {
            log.clear()
            setAsking(false)
          }}
          cancelLabel={t('captainsLog.clearNo')}
          onClose={() => setAsking(false)}
        />
      ) : null}
    </main>
  )
}

/** Scenarios by difficulty: gold where land was reached, the tries elsewhere, a dash if unplayed. */
function Grid({ entries }: { entries: readonly VoyageRecord[] }) {
  const { t } = useI18n()
  const rows = scenarioGrid(entries)
  const difficulties = rows[0]?.cells.map((c) => c.difficulty) ?? []
  return (
    <section className={styles.section} aria-labelledby="log-grid">
      <h2 id="log-grid" className={styles.eyebrow}>
        {t('captainsLog.grid')}
      </h2>
      <table className={styles.grid} aria-labelledby="log-grid">
        <thead>
          <tr>
            <td />
            {difficulties.map((d) => (
              <th key={d} scope="col" className={styles.colHead}>
                {t('captainsLog.difficulty', { difficulty: d })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.scenario}>
              <th
                scope="row"
                className={styles.rowHead}
                data-learning={row.scenario === 'learning'}
              >
                {row.scenario === 'learning' ? t('captainsLog.learning') : row.scenario}
              </th>
              {row.cells.map((cell) => (
                <td key={cell.difficulty}>
                  <Cell cell={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className={styles.legend}>{t('captainsLog.legend')}</p>
    </section>
  )
}

function Cell({ cell }: { cell: GridCell }) {
  const { t } = useI18n()
  if (cell.reached)
    return (
      <span className={styles.cell} data-state="reached">
        <Check size={16} weight="bold" aria-hidden />
        <span className={styles.srOnly}>{t('captainsLog.reachedCell')}</span>
      </span>
    )
  if (cell.tries > 0)
    return (
      <span className={styles.cell} data-state="tried">
        {t('captainsLog.tried', { n: cell.tries })}
      </span>
    )
  return (
    <span className={styles.cell} data-state="none">
      <span aria-hidden="true">—</span>
      <span className={styles.srOnly}>{t('captainsLog.notPlayed')}</span>
    </span>
  )
}

function Recent({ entries }: { entries: readonly VoyageRecord[] }) {
  const { t, lang } = useI18n()
  return (
    <section className={styles.recentSection} aria-labelledby="log-recent">
      <h2 id="log-recent" className={styles.eyebrow}>
        {t('captainsLog.recent')}
      </h2>
      <ul className={styles.recent}>
        {entries.map((entry) => (
          <li key={entry.id} className={styles.voyage}>
            <div className={styles.voyageText}>
              <time className={styles.date} dateTime={entry.date}>
                {voyageDate(lang, entry.date)}
              </time>
              <span className={styles.what}>{voyageName(t, entry.settings)}</span>
            </div>
            <span className={styles.tag} data-tone={tone(entry)}>
              <span className={styles.dot} aria-hidden="true" />
              {outcomeTag(t, entry)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** The tag's colour: gold for land, the storm's teal, danger for the Kraken, grey unfinished. */
function tone(entry: VoyageRecord): 'gold' | 'storm' | 'danger' | 'plain' {
  if (entry.outcome === 'won') return 'gold'
  if (entry.outcome === 'unfinished') return 'plain'
  return entry.reason === 'storm' ? 'storm' : 'danger'
}
