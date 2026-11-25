import { X } from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useT } from '../i18n/index.ts'
import { exitMs, MOTION } from '../motion.ts'
import styles from './layers.module.css'
import { ToastContext, type ToastApi, type ToastInput } from './toast.ts'

interface Live extends ToastInput {
  readonly id: number
  readonly leaving?: boolean
}

/**
 * The toast stack, 12 px above the action bar (Components → Toast; board 03 → TOAST): Undone with
 * Undo more, offline, a new version. A toast pushed again with the same key updates in place
 * instead of rising again.
 */
export function Toaster({ children }: { children: ReactNode }) {
  const t = useT()
  const [toasts, setToasts] = useState<Live[]>([])
  const next = useRef(1)
  const keyIds = useRef(new Map<string, number>())
  const timers = useRef(new Map<number, number>())
  const lastPushed = useRef<number | null>(null)

  const clearTimer = useCallback((id: number) => {
    window.clearTimeout(timers.current.get(id))
    timers.current.delete(id)
  }, [])

  const remove = useCallback(
    (id: number) => {
      clearTimer(id)
      for (const [key, value] of keyIds.current) if (value === id) keyIds.current.delete(key)
      setToasts((ts) => ts.filter((toast) => toast.id !== id))
    },
    [clearTimer],
  )

  const leave = useCallback(
    (id: number) => {
      clearTimer(id)
      const wait = exitMs(MOTION.toastOut)
      if (wait === 0) {
        remove(id)
        return
      }
      setToasts((ts) => ts.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)))
      timers.current.set(
        id,
        window.setTimeout(() => remove(id), wait),
      )
    },
    [clearTimer, remove],
  )

  useEffect(() => {
    const pending = timers.current
    return () => {
      for (const timer of pending.values()) window.clearTimeout(timer)
    }
  }, [])

  const api = useMemo<ToastApi>(
    () => ({
      push(toast) {
        const known = toast.key === undefined ? undefined : keyIds.current.get(toast.key)
        const id = known ?? next.current++
        if (toast.key !== undefined) keyIds.current.set(toast.key, id)
        lastPushed.current = id
        setToasts((ts) =>
          ts.some((live) => live.id === id)
            ? ts.map((live) => (live.id === id ? { ...toast, id } : live))
            : [...ts, { ...toast, id }].slice(-3),
        )
        clearTimer(id)
        const duration =
          toast.duration ?? (toast.action ? MOTION.toastHoldAction : MOTION.toastHold)
        if (duration > 0)
          timers.current.set(
            id,
            window.setTimeout(() => leave(id), duration),
          )
      },
      dismiss(key) {
        const id = keyIds.current.get(key)
        if (id !== undefined) leave(id)
      },
    }),
    [clearTimer, leave],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={styles.toasts} role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={styles.toast} data-leaving={toast.leaving === true}>
            {toast.icon}
            <span className={styles.toastText}>{toast.text}</span>
            {toast.action ? (
              <button
                type="button"
                className={styles.toastAction}
                onClick={() => {
                  // An action that pushes the same toast again (Undo more) keeps it in place.
                  lastPushed.current = null
                  toast.action?.run()
                  if (lastPushed.current !== toast.id) leave(toast.id)
                }}
              >
                {toast.action.label}
              </button>
            ) : null}
            {toast.duration === 0 ? (
              <button
                type="button"
                className={styles.toastClose}
                aria-label={t('common.dismiss')}
                onClick={() => leave(toast.id)}
              >
                <X size={18} weight="bold" aria-hidden />
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
