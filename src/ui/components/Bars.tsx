import { ArrowCounterClockwise, BookOpen, List, Scroll } from '@phosphor-icons/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { useT } from '../i18n/index.ts'
import styles from './game.module.css'

/**
 * The bottom bar (Components → Action Bar, Action Bar · game): a note saying what's missing, the
 * one primary action, and in the game the dock under it. It tells the toasts its height
 * (`--action-bar-height`), so they rise 12 px above it.
 */
export function ActionBar({
  note,
  dock,
  children,
}: {
  /** What the primary action still waits for, above it. */
  note?: string
  /** The game's dock, under the action. */
  dock?: ReactNode
  /** The primary `Button`. */
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const root = document.documentElement
    const update = () => root.style.setProperty('--action-bar-height', `${node.offsetHeight}px`)
    update()
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null
    observer?.observe(node)
    return () => {
      observer?.disconnect()
      root.style.removeProperty('--action-bar-height')
    }
  }, [])
  return (
    <div ref={ref} className={styles.actionBar} data-dock={dock !== undefined}>
      {note ? (
        <p className={styles.note} aria-live="polite">
          {note}
        </p>
      ) : null}
      <div className={styles.action}>{children}</div>
      {dock}
    </div>
  )
}

/** The game's dock (Components → Dock): Undo, Log, Rules, Menu. */
export function Dock({
  canUndo,
  onUndo,
  onLog,
  onRules,
  onMenu,
}: {
  canUndo: boolean
  onUndo: () => void
  onLog: () => void
  onRules: () => void
  onMenu: () => void
}) {
  const t = useT()
  const items = [
    { key: 'undo', icon: <ArrowCounterClockwise size={22} weight="fill" />, onClick: onUndo },
    { key: 'log', icon: <Scroll size={22} weight="fill" />, onClick: onLog },
    { key: 'rules', icon: <BookOpen size={22} weight="fill" />, onClick: onRules },
    { key: 'menu', icon: <List size={22} weight="bold" />, onClick: onMenu },
  ] as const
  return (
    <nav className={styles.dock} aria-label={t('dock.label')}>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className={styles.dockItem}
          disabled={item.key === 'undo' && !canUndo}
          onClick={item.onClick}
        >
          <span aria-hidden="true">{item.icon}</span>
          <span>{t(`dock.${item.key}`)}</span>
        </button>
      ))}
    </nav>
  )
}
