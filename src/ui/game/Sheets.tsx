import {
  BookOpen,
  Check,
  CircleHalf,
  Gavel,
  Globe,
  House,
  Minus,
  Plus,
  Scroll,
  Wrench,
  XCircle,
} from '@phosphor-icons/react'
import { useState } from 'react'
import {
  canApply,
  changedRulings,
  DEFAULT_RULINGS,
  RULING_KEYS,
  TRACK,
  trackers,
  type CardSymbol,
  type Rulings,
  type Trackers,
  type TrackIndex,
  type VoyageEvent,
  type VoyageState,
} from '../../engine/index.ts'
import {
  Button,
  LanguageRow,
  ListRow,
  Picture,
  RulingRow,
  SegmentGroup,
  Sheet,
  Step,
  Steps,
  ToggleRow,
} from '../components/index.ts'
import { LANGS, useI18n, useT, type Translate } from '../i18n/index.ts'
import { usePrefs } from '../state/PrefsContext.ts'
import { THEMES, type Theme } from '../state/prefs.ts'
import styles from './game.module.css'
import { logRows } from './log.ts'
import { pairName, SYMBOL_ART } from './words.ts'

// ── D1 · Menu ──────────────────────────────────────────────────────────────────────────────

export type MenuTarget = 'home' | 'end' | 'rules' | 'rulings' | 'log' | 'fix'

/**
 * D1 · Menu: the voyage (back home, end it), the table (rules, rulings, log, fix the trackers)
 * and the device (screen awake, language, theme).
 */
export function MenuSheet({
  state,
  onClose,
  onPick,
}: {
  state: VoyageState
  onClose: () => void
  onPick: (target: MenuTarget) => void
}) {
  const t = useT()
  const { lang } = useI18n()
  const { prefs, update } = usePrefs()
  const [inner, setInner] = useState<'language' | 'theme' | null>(null)
  return (
    <>
      <Sheet title={t('gameMenu.title')} onClose={onClose}>
        {(close) => {
          const pick = (target: MenuTarget) => () => {
            close()
            onPick(target)
          }
          return (
            <>
              <div className={styles.menuGroup}>
                <ListRow
                  icon={<House size={20} weight="fill" />}
                  label={t('gameMenu.back')}
                  onClick={pick('home')}
                />
                <ListRow
                  icon={<XCircle size={20} weight="fill" className={styles.danger} />}
                  label={t('gameMenu.end')}
                  onClick={pick('end')}
                />
              </div>
              <div className={styles.menuGroup}>
                <ListRow
                  icon={<BookOpen size={20} weight="fill" />}
                  label={t('gameMenu.rules')}
                  onClick={pick('rules')}
                />
                <ListRow
                  icon={<Gavel size={20} weight="fill" />}
                  label={t('gameMenu.rulings')}
                  value={t('gameMenu.rulingsValue', { n: changedRulings(state.settings.rulings) })}
                  onClick={pick('rulings')}
                />
                <ListRow
                  icon={<Scroll size={20} weight="fill" />}
                  label={t('gameMenu.log')}
                  value={t('gameMenu.logValue', { n: state.log.length })}
                  onClick={pick('log')}
                />
                <ListRow
                  icon={<Wrench size={20} weight="fill" />}
                  label={t('gameMenu.fix')}
                  onClick={pick('fix')}
                />
              </div>
              <div className={styles.menuGroup}>
                <ToggleRow
                  label={t('gameMenu.awake')}
                  hint={t('gameMenu.awakeHint')}
                  checked={prefs.wakeLock}
                  onChange={(wakeLock) => update({ wakeLock })}
                />
                <ListRow
                  icon={<Globe size={20} weight="fill" />}
                  label={t('gameMenu.language')}
                  value={LANGS.find((l) => l.code === lang)?.name ?? lang}
                  onClick={() => setInner('language')}
                />
                <ListRow
                  icon={<CircleHalf size={20} weight="fill" />}
                  label={t('theme.label')}
                  value={t(`theme.${prefs.theme}`)}
                  onClick={() => setInner('theme')}
                />
              </div>
            </>
          )
        }}
      </Sheet>
      {inner === 'language' ? <LanguageSheet onClose={() => setInner(null)} /> : null}
      {inner === 'theme' ? <ThemeSheet onClose={() => setInner(null)} /> : null}
    </>
  )
}

/** The language picker over the menu (F2 · Language). */
function LanguageSheet({ onClose }: { onClose: () => void }) {
  const t = useT()
  const { lang, setLang } = useI18n()
  return (
    <Sheet title={t('gameMenu.languageTitle')} onClose={onClose}>
      {(close) => (
        <>
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
          <p className={styles.sheetNote}>{t('gameMenu.languageNote')}</p>
        </>
      )}
    </Sheet>
  )
}

/** Auto, day or night, over the menu (A4 · THEME). */
function ThemeSheet({ onClose }: { onClose: () => void }) {
  const t = useT()
  const { prefs, update } = usePrefs()
  return (
    <Sheet title={t('gameMenu.themeTitle')} onClose={onClose}>
      <SegmentGroup<Theme>
        label={t('theme.label')}
        options={THEMES.map((value) => ({ value, label: t(`theme.${value}`) }))}
        value={prefs.theme}
        onChange={(theme) => update({ theme })}
      />
      <p className={styles.sheetNote}>{t('gameMenu.themeNote')}</p>
    </Sheet>
  )
}

// ── B4, read-only · this voyage's rulings ──────────────────────────────────────────────────

const RULING_NUMBER: Readonly<Record<keyof Rulings, number>> = {
  pastEnd: 1,
  bosunPirate: 2,
  cannonWheel: 3,
  shortDeal: 4,
  fourthTrick: 5,
}

/** The answer's words for a ruling's value (docs/automa.md → Rulings). */
function rulingAnswer(t: Translate, key: keyof Rulings, rulings: Rulings): string {
  const n = RULING_NUMBER[key]
  const isDefault = rulings[key] === DEFAULT_RULINGS[key]
  return isDefault
    ? t(`voyageRulings.r${n}a` as 'voyageRulings.r1a')
    : t(`voyageRulings.r${n}alt` as 'voyageRulings.r1alt')
}

/** This voyage's rulings, as New voyage set them (B4, read-only: they're fixed for the voyage). */
export function RulingsSheet({ rulings, onClose }: { rulings: Rulings; onClose: () => void }) {
  const t = useT()
  return (
    <Sheet title={t('voyageRulings.title')} onClose={onClose}>
      <p className={styles.sheetLead}>{t('voyageRulings.lead')}</p>
      {RULING_KEYS.map((key) => {
        const n = RULING_NUMBER[key]
        return (
          <RulingRow
            key={key}
            question={t(`voyageRulings.r${n}q` as 'voyageRulings.r1q')}
            answer={rulingAnswer(t, key, rulings)}
            source={t(`voyageRulings.r${n}s` as 'voyageRulings.r1s')}
            isDefault={rulings[key] === DEFAULT_RULINGS[key]}
          />
        )
      })}
    </Sheet>
  )
}

// ── D4 · Ship's log ────────────────────────────────────────────────────────────────────────

/** D4 · Ship's log: every step so far, newest first, translated. */
export function ShipsLogSheet({ state, onClose }: { state: VoyageState; onClose: () => void }) {
  const t = useT()
  const rows = logRows(t, state)
  return (
    <Sheet title={t('shipsLog.title')} onClose={onClose}>
      <p className={styles.sheetLead}>{t('shipsLog.lead')}</p>
      {rows.length === 0 ? (
        <p className={styles.sheetNote}>{t('shipsLog.empty')}</p>
      ) : (
        <ol className={styles.logList}>
          {rows.map((row) => (
            <li key={row.key} className={styles.logRow}>
              <span className={styles.logCode}>{row.code}</span>
              <span className={styles.logText}>
                <span className={styles.logTitle}>{row.title}</span>
                <span className={styles.logDetail}>{row.detail}</span>
              </span>
              {row.symbols ? (
                <span className={styles.logSymbols} aria-hidden="true">
                  <Picture name={SYMBOL_ART[row.symbols[0]]} size={20} />
                  <Picture name={SYMBOL_ART[row.symbols[1]]} size={20} />
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </Sheet>
  )
}

// ── D5 · Fix the trackers ──────────────────────────────────────────────────────────────────

function Stepper({
  label,
  hint,
  value,
  changed,
  canLess,
  canMore,
  onLess,
  onMore,
}: {
  label: string
  hint?: string
  value: string
  changed: boolean
  canLess: boolean
  canMore: boolean
  onLess: () => void
  onMore: () => void
}) {
  const t = useT()
  return (
    <div className={styles.stepper} data-changed={changed} role="group" aria-label={label}>
      <span className={styles.stepperBody}>
        <span className={styles.stepperLabel}>{label}</span>
        {hint ? <span className={styles.stepperHint}>{hint}</span> : null}
      </span>
      <span className={styles.stepperControl}>
        <button
          type="button"
          className={styles.stepperButton}
          aria-label={t('fixTrackers.less', { label })}
          disabled={!canLess}
          onClick={onLess}
        >
          <Minus size={18} weight="bold" aria-hidden />
        </button>
        <output className={styles.stepperValue} aria-live="polite">
          {value}
        </output>
        <button
          type="button"
          className={styles.stepperButton}
          aria-label={t('fixTrackers.more', { label })}
          disabled={!canMore}
          onClick={onMore}
        >
          <Plus size={18} weight="bold" aria-hidden />
        </button>
      </span>
    </div>
  )
}

/**
 * D5 · Fix the trackers: make the app match the table when a Pirate card changed something. It
 * dispatches the engine's `fix`, which goes into the ship's log and can be undone.
 */
export function FixTrackersSheet({
  state,
  onClose,
  onSave,
}: {
  state: VoyageState
  onClose: () => void
  onSave: (event: VoyageEvent) => void
}) {
  const t = useT()
  const before = trackers(state)
  const [draft, setDraft] = useState<Trackers>(before)
  const event: VoyageEvent = { type: 'fix', ...draft }
  const same =
    draft.above === before.above &&
    draft.below === before.below &&
    draft.track === before.track &&
    draft.playerDeck === before.playerDeck
  const valid = canApply(state, event)
  const set = (change: Partial<Trackers>) => setDraft((d) => ({ ...d, ...change }))
  const total = draft.above + draft.below + draft.playerDeck
  return (
    <Sheet title={t('fixTrackers.title')} onClose={onClose}>
      {(close) => (
        <>
          <p className={styles.sheetLead}>{t('fixTrackers.lead')}</p>
          <p className={styles.labelDanger}>{t('fixTrackers.kraken')}</p>
          <Stepper
            label={t('fixTrackers.above')}
            value={String(draft.above)}
            changed={draft.above !== before.above}
            canLess={draft.above > 0}
            canMore={total < 27}
            onLess={() => set({ above: draft.above - 1 })}
            onMore={() => set({ above: draft.above + 1 })}
          />
          <Stepper
            label={t('fixTrackers.below')}
            value={String(draft.below)}
            changed={draft.below !== before.below}
            canLess={draft.below > 0}
            canMore={total < 27}
            onLess={() => set({ below: draft.below - 1 })}
            onMore={() => set({ below: draft.below + 1 })}
          />
          <Stepper
            label={t('fixTrackers.attacks')}
            hint={t('fixTrackers.attacksHint', { n: draft.track + 1 })}
            value={String(TRACK[draft.track])}
            changed={draft.track !== before.track}
            canLess={draft.track > 0}
            canMore={draft.track < 3}
            onLess={() => set({ track: (draft.track - 1) as TrackIndex })}
            onMore={() => set({ track: (draft.track + 1) as TrackIndex })}
          />
          <Stepper
            label={t('fixTrackers.deck')}
            value={String(draft.playerDeck)}
            changed={draft.playerDeck !== before.playerDeck}
            canLess={draft.playerDeck > 0}
            canMore={total < 27}
            onLess={() => set({ playerDeck: draft.playerDeck - 1 })}
            onMore={() => set({ playerDeck: draft.playerDeck + 1 })}
          />
          {!same && !valid ? <p className={styles.sheetNote}>{t('fixTrackers.invalid')}</p> : null}
          <div className={styles.sheetButtons}>
            <Button variant="secondary" onClick={close}>
              {t('common.cancel')}
            </Button>
            <Button
              disabled={same || !valid}
              onClick={() => {
                onSave(event)
                close()
              }}
            >
              {t('fixTrackers.save')}
            </Button>
          </div>
        </>
      )}
    </Sheet>
  )
}

// ── D6 · Rules · the combos ────────────────────────────────────────────────────────────────

const COMBOS: readonly {
  readonly pair: readonly [CardSymbol, CardSymbol] | null
  readonly kraken?: number
}[] = [
  { pair: ['helm', 'helm'] },
  { pair: ['helm', 'helmKraken'], kraken: 1 },
  { pair: ['helmKraken', 'helmKraken'], kraken: 2 },
  { pair: ['helmKraken', 'cannon'] },
  { pair: ['tail', 'tail'] },
  { pair: ['cannon', 'cannon'] },
  { pair: null },
]

const FLIPPED: readonly CardSymbol[] = ['helm', 'helmKraken', 'tail', 'cannon']

/** D6 · Rules · the combos (docs/rules.md → Actions, Cannon actions). */
export function CombosSheet({ onClose }: { onClose: () => void }) {
  const t = useT()
  return (
    <Sheet title={t('combos.title')} onClose={onClose}>
      <p className={styles.sheetLead}>{t('combos.lead')}</p>
      <ul className={styles.comboList}>
        {COMBOS.map((c, i) => (
          <li key={i} className={styles.comboRow}>
            {c.pair ? (
              <span
                className={styles.comboPair}
                role="img"
                aria-label={pairName(t, c.pair[0], c.pair[1])}
              >
                <Picture name={SYMBOL_ART[c.pair[0]]} size={28} />
                <span aria-hidden="true">+</span>
                <Picture name={SYMBOL_ART[c.pair[1]]} size={28} />
              </span>
            ) : (
              <span className={styles.comboPair} aria-hidden="true">
                —
              </span>
            )}
            <span className={styles.comboText} data-quiet={c.pair === null}>
              {t(`combos.r${i + 1}` as 'combos.r1')}
            </span>
            {c.kraken ? (
              <span className={styles.krakenBadge}>{t('combos.times', { n: c.kraken })}</span>
            ) : null}
          </li>
        ))}
      </ul>
      <p className={styles.label}>{t('combos.cannon')}</p>
      <ul className={styles.cannonList}>
        {FLIPPED.map((s, i) => (
          <li key={s} className={styles.cannonRow}>
            <Picture name={SYMBOL_ART[s]} size={24} alt={t(`symbols.${s}`)} />
            <span>{t(`combos.c${i + 1}` as 'combos.c1')}</span>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}

// ── C7 · The Bosun's Cannon + Wheel ────────────────────────────────────────────────────────

/**
 * C7: Sail Solitaire's special note for the Bosun's Cannon + Wheel, step by step
 * (docs/automa.md → The Bosun's Cannon + Wheel). Screen-only: the swap changes no counts.
 */
export function CannonWheelSheet({ onClose }: { onClose: () => void }) {
  const t = useT()
  return (
    <Sheet title={t('cannonWheel.title')} onClose={onClose}>
      {(close) => (
        <>
          <p className={styles.sheetLead}>{t('cannonWheel.lead')}</p>
          <Steps>
            <Step n={1}>{t('cannonWheel.s1')}</Step>
            <Step n={2}>{t('cannonWheel.s2')}</Step>
            <Step n={3}>{t('cannonWheel.s3')}</Step>
            <Step n={4}>{t('cannonWheel.s4')}</Step>
          </Steps>
          <div className={styles.sheetButtons}>
            <Button iconEnd={<Check size={20} weight="bold" aria-hidden />} onClick={close}>
              {t('cannonWheel.done')}
            </Button>
          </div>
        </>
      )}
    </Sheet>
  )
}
