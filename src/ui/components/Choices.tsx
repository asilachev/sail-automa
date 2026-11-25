import { Check } from '@phosphor-icons/react'
import { useId, type ReactNode } from 'react'
import { useT } from '../i18n/index.ts'
import styles from './kit.module.css'
import { Picture } from './Picture.tsx'
import { CARD_SYMBOLS, SYMBOL_ART, type CardSymbol } from './pieces.ts'

/**
 * Choices: a labelled group of toggle buttons with `aria-pressed` (pwa layer → Real roles).
 * Tapping the chosen one again keeps it chosen.
 */

export interface Choice<T> {
  readonly value: T
  readonly label: string
}

/** The group's label: visible as an eyebrow, or only for assistive technology. */
function Group({
  label,
  showLabel,
  layout,
  children,
}: {
  label: string
  showLabel: boolean
  layout: 'row' | 'stack'
  children: ReactNode
}) {
  const id = useId()
  return (
    <div className={styles.group} role="group" aria-labelledby={id}>
      <span id={id} className={showLabel ? styles.groupLabel : styles.srOnly}>
        {label}
      </span>
      <div className={layout === 'row' ? styles.row : styles.stack}>{children}</div>
    </div>
  )
}

/** Segments side by side (Components → Segment, Segment · small): You / Bosun, Yes / No. */
export function SegmentGroup<T extends string | number | boolean>({
  label,
  showLabel = false,
  options,
  value,
  onChange,
  size = 'large',
}: {
  label: string
  showLabel?: boolean
  options: readonly Choice<T>[]
  value: T | null
  onChange: (value: T) => void
  /** large 48 px, one or two words; small 52 px, two lines of 13 px. */
  size?: 'large' | 'small'
}) {
  return (
    <Group label={label} showLabel={showLabel} layout="row">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          className={`${styles.piece} ${styles.segment}`}
          data-size={size}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {size === 'large' && value === o.value ? (
            <Check size={16} weight="bold" aria-hidden />
          ) : null}
          <span>{o.label}</span>
        </button>
      ))}
    </Group>
  )
}

/**
 * Square chips (Components → Scenario Chip): the scenarios. `expansion` draws a quieter chip;
 * a label longer than a number widens it (Learning).
 */
export function ChipGroup<T extends string | number>({
  label,
  showLabel = false,
  options,
  value,
  onChange,
}: {
  label: string
  showLabel?: boolean
  options: readonly (Choice<T> & { readonly expansion?: boolean; readonly name?: string })[]
  value: T | null
  onChange: (value: T) => void
}) {
  return (
    <Group label={label} showLabel={showLabel} layout="row">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          className={`${styles.piece} ${styles.chip}`}
          data-expansion={o.expansion === true}
          data-wide={o.label.length > 2}
          aria-pressed={value === o.value}
          aria-label={o.name}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </Group>
  )
}

/** The four symbols as slate card chips (Components → Symbol Chip). */
export function SymbolPicker({
  label,
  showLabel = true,
  value,
  onChange,
}: {
  label: string
  showLabel?: boolean
  value: CardSymbol | null
  onChange: (value: CardSymbol) => void
}) {
  const t = useT()
  return (
    <Group label={label} showLabel={showLabel} layout="row">
      {CARD_SYMBOLS.map((s) => (
        <button
          key={s}
          type="button"
          className={`${styles.piece} ${styles.symbol}`}
          aria-pressed={value === s}
          onClick={() => onChange(s)}
        >
          <Picture name={SYMBOL_ART[s]} size={34} />
          <span>{t(`symbols.${s}`)}</span>
        </button>
      ))}
    </Group>
  )
}

/** Stacked option cards with a title and a line (Components → Option Card): the difficulty. */
export function OptionCards<T extends string | number>({
  label,
  showLabel = false,
  options,
  value,
  onChange,
}: {
  label: string
  showLabel?: boolean
  options: readonly (Choice<T> & { readonly description?: string })[]
  value: T | null
  onChange: (value: T) => void
}) {
  return (
    <Group label={label} showLabel={showLabel} layout="stack">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          className={`${styles.piece} ${styles.option}`}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          <span className={styles.radio} aria-hidden="true" />
          <span className={styles.optionBody}>
            <span className={styles.optionTitle}>{o.label}</span>
            {o.description ? <span className={styles.optionDesc}>{o.description}</span> : null}
          </span>
        </button>
      ))}
    </Group>
  )
}
