import type { Theme } from './prefs.ts'

/** The page colour of each theme, for the browser's toolbar (global.css → --bg). */
const THEME_COLOR = { day: '#ffffff', night: '#22383a' } as const

/**
 * Applies the theme: auto follows the phone (`prefers-color-scheme`); day and night pin it through
 * `data-theme` on <html>, which global.css reads. The toolbar colour follows along.
 */
export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  if (theme === 'auto') delete root.dataset.theme
  else root.dataset.theme = theme
  const night =
    theme === 'night' ||
    (theme === 'auto' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', night ? THEME_COLOR.night : THEME_COLOR.day)
}
