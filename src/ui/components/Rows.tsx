import { BookOpen, CaretRight, Check } from '@phosphor-icons/react'
import { useId, type ReactNode } from 'react'
import { useT } from '../i18n/index.ts'
import styles from './kit.module.css'

/** A numbered list of steps. */
export function Steps({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <ol className={styles.steps} aria-label={label}>
      {children}
    </ol>
  )
}

/** A numbered instruction (Components → Step): what to do at the table, nothing to tick. */
export function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className={styles.step}>
      <span className={styles.badge} aria-hidden="true">
        {n}
      </span>
      <span className={styles.stepText}>{children}</span>
    </li>
  )
}

/**
 * A line of a checklist (Components → Check Item, Check Item · done). Checklists mirror the
 * table (companion layer): the user ticks what they did, and a ticked line turns gold with a
 * check. Ticking changes colours only, never the size.
 */
export function CheckItem({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      className={`${styles.piece} ${styles.check}`}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.box} aria-hidden="true">
        {checked ? <Check size={15} weight="bold" /> : null}
      </span>
      <span className={styles.checkText}>{children}</span>
    </button>
  )
}

/** A setting that is on or off (Components → Toggle Row): Keep the screen awake. */
export function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const id = useId()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={`${id}-l`}
      aria-describedby={hint ? `${id}-h` : undefined}
      className={`${styles.piece} ${styles.surfaceRow} ${styles.toggle}`}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.rowBody}>
        <span id={`${id}-l`} className={styles.rowLabel}>
          {label}
        </span>
        {hint ? (
          <span id={`${id}-h`} className={styles.rowHint}>
            {hint}
          </span>
        ) : null}
      </span>
      <span className={styles.switch} aria-hidden="true" />
    </button>
  )
}

/** A row that opens something (Components → List Row): Captain's log · 7 voyages ›. */
export function ListRow({
  icon,
  label,
  value,
  onClick,
}: {
  /** A 20 px Phosphor icon, e.g. `<Scroll size={20} weight="fill" />`. */
  icon?: ReactNode
  label: string
  value?: string
  onClick: () => void
}) {
  const id = useId()
  return (
    <button
      type="button"
      className={`${styles.piece} ${styles.surfaceRow}`}
      aria-labelledby={`${id}-l`}
      aria-describedby={value ? `${id}-v` : undefined}
      onClick={onClick}
    >
      {icon ? (
        <span className={styles.listIcon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span id={`${id}-l`} className={styles.listLabel}>
        {label}
      </span>
      {value ? (
        <span id={`${id}-v`} className={styles.listValue}>
          {value}
        </span>
      ) : null}
      <CaretRight className={styles.chevron} size={16} weight="fill" aria-hidden />
    </button>
  )
}

/** One language in the picker (Components → Language Row): the code, its own name, a check. */
export function LanguageRow({
  code,
  name,
  lang,
  selected,
  onSelect,
}: {
  /** Shown as written, e.g. EN. */
  code: string
  /** The language's name in itself. */
  name: string
  /** BCP 47 tag, so screen readers say the name in its own language. */
  lang?: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className={`${styles.piece} ${styles.surfaceRow} ${styles.language}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className={styles.langCode} aria-hidden="true">
        {code}
      </span>
      <span className={styles.langName} lang={lang}>
        {name}
      </span>
      {selected ? <Check className={styles.langCheck} size={18} weight="bold" aria-hidden /> : null}
    </button>
  )
}

/**
 * A ruling: where the rules are silent, a setting with a default (Components → Ruling Row;
 * docs/automa.md → rulings table). `onChange` adds the Change button.
 */
export function RulingRow({
  question,
  answer,
  source,
  isDefault = true,
  onChange,
}: {
  question: string
  answer: string
  source: string
  isDefault?: boolean
  onChange?: () => void
}) {
  const t = useT()
  return (
    <section className={styles.ruling} aria-label={question}>
      <p className={styles.rulingQ}>{question}</p>
      <div className={styles.rulingValue}>
        {isDefault ? <span className={styles.eyebrow}>{t('ruling.default')}</span> : null}
        <span className={styles.pill}>{answer}</span>
      </div>
      <div className={styles.rulingSource}>
        <BookOpen size={14} weight="fill" aria-hidden />
        <span>{source}</span>
        {onChange ? (
          <button
            type="button"
            className={styles.change}
            aria-label={`${t('ruling.change')}: ${question}`}
            onClick={onChange}
          >
            {t('ruling.change')}
          </button>
        ) : null}
      </div>
    </section>
  )
}
