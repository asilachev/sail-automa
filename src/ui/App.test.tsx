import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from './App.tsx'
import { DEFAULT_PREFS, PREFS_KEY } from './state/prefs.ts'
import { applyTheme } from './state/theme.ts'

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
})

describe('the app shell', () => {
  it('shows the BOSUN wordmark in every language', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'BOSUN' })).toBeInTheDocument()
  })

  it('pins the saved theme on the page, and auto leaves it to the phone', () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...DEFAULT_PREFS, theme: 'night' }))
    const { unmount } = render(<App />)
    expect(document.documentElement.dataset.theme).toBe('night')
    unmount()
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...DEFAULT_PREFS, theme: 'auto' }))
    render(<App />)
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })
})

describe('the theme switch', () => {
  it('sets data-theme for day and night and clears it for auto', () => {
    applyTheme('day')
    expect(document.documentElement.dataset.theme).toBe('day')
    applyTheme('night')
    expect(document.documentElement.dataset.theme).toBe('night')
    applyTheme('auto')
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })
})
