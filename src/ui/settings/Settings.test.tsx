import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderApp, ROUND_III_TRICK_5, saveScript, savePrefsForTest } from '../../test/app.tsx'
import { loadPrefs } from '../state/prefs.ts'

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
})

afterEach(() => {
  Reflect.deleteProperty(navigator, 'wakeLock')
})

async function openSettings() {
  await renderApp()
  await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
  return screen.findByRole('heading', { name: 'SETTINGS' })
}

describe('Settings (A4)', () => {
  it('pins the theme, and Auto gives it back to the phone', async () => {
    await openSettings()
    const theme = screen.getByRole('group', { name: 'THEME' })
    await userEvent.click(within(theme).getByRole('button', { name: 'Night' }))
    expect(document.documentElement.dataset.theme).toBe('night')
    expect(loadPrefs().theme).toBe('night')
    await userEvent.click(within(theme).getByRole('button', { name: 'Auto' }))
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })

  it('switches keeping the screen awake', async () => {
    await openSettings()
    const awake = screen.getByRole('switch', { name: 'Keep the screen awake' })
    expect(awake).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(awake)
    expect(awake).toHaveAttribute('aria-checked', 'false')
    expect(loadPrefs().wakeLock).toBe(false)
  })

  it('opens the language sheet and the credits', async () => {
    await openSettings()
    await userEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(screen.getByRole('dialog', { name: 'LANGUAGE' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Close LANGUAGE' }))
    await userEvent.click(screen.getByRole('button', { name: 'Credits' }))
    expect(screen.getByRole('dialog', { name: 'CREDITS' })).toBeInTheDocument()
  })

  it('links the source code', async () => {
    await openSettings()
    expect(screen.getByRole('link', { name: 'Source code' })).toHaveAttribute(
      'href',
      'https://github.com/asilachev/sail-automa',
    )
  })

  it('goes back to Home', async () => {
    await openSettings()
    await userEvent.click(screen.getByRole('button', { name: 'Home' }))
    expect(await screen.findByRole('button', { name: 'Start your first voyage' })).toBeVisible()
  })
})

describe('the wake lock (PWA checklist → Screen awake while a voyage is open)', () => {
  function mockWakeLock() {
    const sentinel = { release: vi.fn(async () => undefined), addEventListener: vi.fn() }
    const request = vi.fn(async () => sentinel)
    Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true })
    return request
  }

  it('holds the screen awake once the voyage is open, not on Home', async () => {
    const request = mockWakeLock()
    saveScript(ROUND_III_TRICK_5, { scenario: 3 })
    await renderApp()
    expect(request).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Continue · Round III' }))
    expect(request).toHaveBeenCalledWith('screen')
  })

  it('leaves the screen alone when the switch is off', async () => {
    const request = mockWakeLock()
    savePrefsForTest({ wakeLock: false })
    saveScript(ROUND_III_TRICK_5, { scenario: 3 })
    await renderApp()
    await userEvent.click(screen.getByRole('button', { name: 'Continue · Round III' }))
    expect(request).not.toHaveBeenCalled()
  })
})
