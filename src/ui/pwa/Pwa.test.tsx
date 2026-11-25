import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderApp } from '../../test/app.tsx'
import { loadPrefs } from '../state/prefs.ts'
import { listenForInstallPrompt, storageWorks } from './pwa.ts'

// The service worker's registration, controlled per test (vite-plugin-pwa, prompt mode).
const sw = vi.hoisted(() => ({ needRefresh: false, update: vi.fn(async () => {}) }))
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [sw.needRefresh, () => {}],
    offlineReady: [false, () => {}],
    updateServiceWorker: sw.update,
  }),
}))

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

beforeEach(() => {
  localStorage.clear()
  sw.needRefresh = false
  sw.update.mockClear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('updates (F3: prompt mode, never a reload mid-voyage)', () => {
  it('says a new version is ready and reloads only on Reload', async () => {
    sw.needRefresh = true
    await renderApp()
    expect(screen.getByText('A new version is ready.')).toBeInTheDocument()
    expect(sw.update).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Reload' }))
    expect(sw.update).toHaveBeenCalledWith(true)
  })
})

describe('offline (F3)', () => {
  it('says the app still works when the network goes, and clears it when it comes back', async () => {
    await renderApp()
    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(screen.getByText("You're offline. Everything still works.")).toBeInTheDocument()
    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    await waitFor(() =>
      expect(screen.queryByText("You're offline. Everything still works.")).not.toBeInTheDocument(),
    )
  })
})

describe('save blocked (#10)', () => {
  it('detects storage that refuses writes', () => {
    const blocked = {
      setItem: () => {
        throw new Error('QuotaExceeded')
      },
      removeItem: () => {},
    }
    expect(storageWorks(blocked as unknown as Storage)).toBe(false)
    expect(storageWorks(null)).toBe(false)
    expect(storageWorks(localStorage)).toBe(true)
  })

  it('warns that the voyage is not being saved', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    await renderApp()
    expect(
      screen.getByText("Your voyage isn't being saved: this browser blocks storage."),
    ).toBeInTheDocument()
  })
})

describe('install (A2 install card, F1 once on iPhone)', () => {
  it('shows the iPhone steps once on Home, then from the install card', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE_SAFARI)
    const { unmount } = await renderApp()
    const sheet = await screen.findByRole('dialog', { name: 'INSTALL ON IPHONE' })
    expect(within(sheet).getAllByRole('listitem').length).toBeGreaterThanOrEqual(3)
    await userEvent.click(within(sheet).getByRole('button', { name: 'Got it' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(loadPrefs().installHintSeen).toBe(true)
    unmount()

    await renderApp()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const card = screen.getByRole('region', { name: 'Install the app' })
    await userEvent.click(within(card).getByRole('button', { name: 'Install' }))
    expect(screen.getByRole('dialog', { name: 'INSTALL ON IPHONE' })).toBeInTheDocument()
  })

  it("offers Chrome's own prompt from the install card", async () => {
    listenForInstallPrompt()
    await renderApp()
    expect(screen.queryByRole('region', { name: 'Install the app' })).not.toBeInTheDocument()
    const prompt = vi.fn(async () => {})
    const event = Object.assign(new Event('beforeinstallprompt'), {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    })
    act(() => {
      window.dispatchEvent(event)
    })
    const card = await screen.findByRole('region', { name: 'Install the app' })
    await userEvent.click(within(card).getByRole('button', { name: 'Install' }))
    expect(prompt).toHaveBeenCalled()
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Install the app' })).not.toBeInTheDocument(),
    )
  })
})
