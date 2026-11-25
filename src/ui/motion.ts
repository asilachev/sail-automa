/**
 * Motion helpers. Movement only when it means something, and then short and smooth.
 *
 * The timings are the design's board 03 · Transitions and states, also in global.css as
 * `--motion-*` tokens; keep the two in step. Under reduced motion, and where `matchMedia` doesn't
 * exist (tests), exits and delayed steps happen at once; the CSS also cuts every animation to a
 * single instant frame.
 */
export const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia !== 'function' ||
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Board 03's timings, in ms. */
export const MOTION = {
  push: 240,
  fade: 160,
  sheetIn: 280,
  sheetOut: 180,
  dialogIn: 200,
  dialogOut: 140,
  /** The dialog's confirm button ignores taps this long after it opens, even under reduced motion. */
  dialogGuard: 300,
  toastIn: 200,
  toastOut: 160,
  toastHold: 2400,
  /** A toast with an action (Undo more) holds longer. */
  toastHoldAction: 4000,
  /** Push and sheet become a fade this long under reduced motion. */
  reduced: 120,
} as const

/** Length of the default exit animation (sheets), in ms. */
export const EXIT_MS = MOTION.sheetOut

/** How long an exit takes: its own length, or nothing under reduced motion. */
export const exitMs = (ms: number): number => (prefersReducedMotion() ? 0 : ms)

/** How a new screen arrives (board 03): push forward, push back, or cross-fade. */
export type ScreenMotion = 'push' | 'back' | 'fade' | 'none'
