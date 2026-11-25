import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { renderApp, savePrefsForTest, saveScript } from '../test/app.tsx'
import { startVoyage } from '../test/voyage.ts'
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

describe('the voyage at the table (#7)', () => {
  it('opens on the exchange after Set sail', async () => {
    const user = userEvent.setup()
    await renderApp()
    await user.click(screen.getByRole('button', { name: 'Start your first voyage' }))
    await startVoyage(user, { scenario: 'Scenario 3', difficulty: 'Hard' })
    expect(
      await screen.findByRole('heading', { level: 1, name: 'ROUND I · THE EXCHANGE' }),
    ).toBeInTheDocument()
  })

  it('continues the saved voyage from Home on its step', async () => {
    const user = userEvent.setup()
    saveScript('x')
    await renderApp()
    await user.click(screen.getByRole('button', { name: 'Continue · Round I' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'TRICK 1 · YOU LEAD' }),
    ).toBeInTheDocument()
  })

  it('opens the combos from Home’s Rules and rulings', async () => {
    const user = userEvent.setup()
    savePrefsForTest({ played: true })
    await renderApp()
    await user.click(screen.getByRole('button', { name: /^Rules and rulings/ }))
    expect(await screen.findByRole('dialog', { name: 'THE COMBOS' })).toBeInTheDocument()
  })
})
