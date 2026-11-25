import { createContext, useContext, type ReactNode } from 'react'

export interface ToastInput {
  /** An 18 px Phosphor icon, e.g. `<ArrowCounterClockwise size={18} weight="fill" />`. */
  readonly icon?: ReactNode
  readonly text: string
  /** A word to tap at the end (Undo more, Reload). */
  readonly action?: { readonly label: string; readonly run: () => void }
  /**
   * Milliseconds on screen; 0 keeps it, with a dismiss button, until dismissed or replaced.
   * Default: 2.4 s, or 4 s with an action (board 03 → TOAST).
   */
  readonly duration?: number
  /** Toasts with the same key replace each other in place. */
  readonly key?: string
}

export interface ToastApi {
  push(toast: ToastInput): void
  dismiss(key: string): void
}

export const ToastContext = createContext<ToastApi>({ push: () => {}, dismiss: () => {} })

export const useToasts = (): ToastApi => useContext(ToastContext)
