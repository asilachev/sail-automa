import { X } from '@phosphor-icons/react'
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { useT } from '../i18n/index.ts'
import { exitMs, MOTION } from '../motion.ts'
import { Button } from './Button.tsx'
import styles from './layers.module.css'

/** Open layers, innermost last: Escape closes only the top one (Language over the Menu). */
const escapeStack: (() => void)[] = []
const onEscapeKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') escapeStack[escapeStack.length - 1]?.()
}

function useEscape(onClose: () => void) {
  const latest = useRef(onClose)
  useEffect(() => {
    latest.current = onClose
  })
  useEffect(() => {
    const close = () => latest.current()
    if (escapeStack.push(close) === 1) window.addEventListener('keydown', onEscapeKey)
    return () => {
      escapeStack.splice(escapeStack.lastIndexOf(close), 1)
      if (escapeStack.length === 0) window.removeEventListener('keydown', onEscapeKey)
    }
  }, [])
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Moves focus into a sheet or dialog, keeps Tab inside it, and gives focus back to the opener on
 * close.
 */
function useFocusTrap(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    node.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)]
      const first = items[0]
      const last = items[items.length - 1]
      if (!first || !last) {
        e.preventDefault()
      } else if (
        e.shiftKey &&
        (document.activeElement === first || document.activeElement === node)
      ) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    node.addEventListener('keydown', onKey)
    return () => {
      node.removeEventListener('keydown', onKey)
      opener?.focus({ preventScroll: true })
    }
  }, [ref])
}

/** Plays the exit animation, then calls `onClose` (at once under reduced motion). */
function useAnimatedClose(onClose: () => void, ms: number): [closing: boolean, close: () => void] {
  const [closing, setClosing] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const close = useCallback(() => {
    const wait = exitMs(ms)
    if (wait === 0) {
      onClose()
      return
    }
    setClosing(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(onClose, wait)
  }, [onClose, ms])
  return [closing, close]
}

let scrollLocks = 0

/** Keeps the page behind a sheet or dialog still while it is open. */
function useScrollLock() {
  useEffect(() => {
    const root = document.documentElement
    if (scrollLocks++ === 0) root.style.overflow = 'hidden'
    return () => {
      if (--scrollLocks === 0) root.style.overflow = ''
    }
  }, [])
}

/**
 * A bottom sheet over a scrim (Components → Sheet Header; board 03 → SHEET): Menu, Log, Rules,
 * Rulings, Language, Credits. Escape, the scrim and the close button all close it.
 */
export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  /** Content, or a function of the animated close (to close after a pick). */
  children: ReactNode | ((close: () => void) => ReactNode)
}) {
  const t = useT()
  const titleId = useId()
  const [closing, close] = useAnimatedClose(onClose, MOTION.sheetOut)
  useEscape(close)
  useScrollLock()
  const ref = useRef<HTMLElement>(null)
  useFocusTrap(ref)
  return (
    <div className={styles.layer} data-closing={closing}>
      <button
        type="button"
        className={styles.scrim}
        aria-label={t('common.close')}
        tabIndex={-1}
        onClick={close}
      />
      <section
        ref={ref}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className={styles.sheetHead}>
          <div className={styles.handle} aria-hidden="true" />
          <div className={styles.sheetTitleRow}>
            <h2 id={titleId} className={styles.sheetTitle}>
              {title}
            </h2>
            <button
              type="button"
              className={styles.close}
              aria-label={t('common.closeTitle', { title })}
              onClick={close}
            >
              <X size={22} weight="bold" aria-hidden />
            </button>
          </div>
        </header>
        <div className={styles.sheetBody}>
          {typeof children === 'function' ? children(close) : children}
        </div>
      </section>
    </div>
  )
}

/**
 * A confirmation (Components → Dialog; board 03 → DIALOG): End this voyage?, Abandon, Clear the
 * log. An `alertdialog` with the danger action first and the safe one below it. The danger button
 * ignores taps for the first 300 ms, so a double tap on the opener can't confirm by accident.
 */
export function Dialog({
  title,
  body,
  confirmLabel,
  onConfirm,
  cancelLabel,
  onClose,
}: {
  title: string
  body?: ReactNode
  confirmLabel: string
  onConfirm: () => void
  cancelLabel: string
  onClose: () => void
}) {
  const titleId = useId()
  const bodyId = useId()
  const [closing, close] = useAnimatedClose(onClose, MOTION.dialogOut)
  useEscape(close)
  useScrollLock()
  const ref = useRef<HTMLElement>(null)
  useFocusTrap(ref)
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => setArmed(true), MOTION.dialogGuard)
    return () => window.clearTimeout(timer)
  }, [])
  return (
    <div className={styles.layer} data-center="true" data-closing={closing}>
      <button
        type="button"
        className={styles.scrim}
        aria-label={cancelLabel}
        tabIndex={-1}
        onClick={close}
      />
      <section
        ref={ref}
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={body ? bodyId : undefined}
        tabIndex={-1}
      >
        <h2 id={titleId} className={styles.dialogTitle}>
          {title}
        </h2>
        {body ? (
          <p id={bodyId} className={styles.dialogBody}>
            {body}
          </p>
        ) : null}
        <div className={styles.dialogButtons}>
          <Button
            variant="danger"
            data-armed={armed}
            onClick={() => {
              if (!armed || closing) return
              onConfirm()
            }}
          >
            {confirmLabel}
          </Button>
          <Button variant="secondary" onClick={close}>
            {cancelLabel}
          </Button>
        </div>
      </section>
    </div>
  )
}
