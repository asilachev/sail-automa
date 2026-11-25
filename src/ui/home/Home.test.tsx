import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderApp, ROUND_III_TRICK_5, saveScript } from '../../test/app.tsx'
import { fixture } from '../../engine/index.ts'
import { NavContext, type Nav } from '../nav.ts'
import { loadLog, recordVoyage } from '../state/history.ts'
import { loadPrefs } from '../state/prefs.ts'
import { VOYAGE_KEY } from '../state/voyage.ts'
import { Home } from './Home.tsx'

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
})

function renderHome(props: Partial<Parameters<typeof Home>[0]> = {}) {
  const go = vi.fn<Nav['go']>()
  const onRules = vi.fn()
  render(
    <NavContext.Provider value={{ screen: 'home', go }}>
      <Home onRules={onRules} {...props} />
    </NavContext.Provider>,
  )
  return { go, onRules }
}

describe('Home · first visit (A2)', () => {
  it('shows the wordmark, the hero and how it plays', () => {
    renderHome()
    expect(screen.getByRole('heading', { name: 'BOSUN', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Play Sail solo.' })).toBeInTheDocument()
    const how = screen.getByRole('region', { name: 'HOW IT PLAYS' })
    expect(within(how).getAllByRole('listitem')).toHaveLength(3)
  })

  it('starts the first voyage on New voyage', async () => {
    const { go } = renderHome()
    await userEvent.click(screen.getByRole('button', { name: 'Start your first voyage' }))
    expect(go).toHaveBeenCalledWith('newVoyage', 'push')
  })

  it('says the log is empty', () => {
    renderHome()
    expect(screen.getByRole('button', { name: "Captain's log" })).toHaveAccessibleDescription(
      'No voyages yet',
    )
  })

  it("counts the captain's log: voyages, and those that reached land", () => {
    const date = '2026-11-20T10:00:00.000Z'
    recordVoyage(fixture('won'), date)
    recordVoyage(fixture('lostStorm'), date)
    recordVoyage(fixture('lostKrakenAlone'), date)
    renderHome()
    expect(screen.getByRole('button', { name: "Captain's log" })).toHaveAccessibleDescription(
      '3 voyages · 1 reached land',
    )
  })

  it('opens the log, the rules and Settings', async () => {
    const { go, onRules } = renderHome()
    await userEvent.click(screen.getByRole('button', { name: "Captain's log" }))
    expect(go).toHaveBeenLastCalledWith('log', 'push')
    await userEvent.click(screen.getByRole('button', { name: 'Rules and rulings' }))
    expect(onRules).toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(go).toHaveBeenLastCalledWith('settings', 'push')
  })

  it('offers no install card where the browser cannot install', () => {
    renderHome()
    expect(screen.queryByRole('region', { name: 'Install the app' })).not.toBeInTheDocument()
  })
})

describe('Home · voyage in progress (A3)', () => {
  beforeEach(() => saveScript(ROUND_III_TRICK_5, { scenario: 3, difficulty: 'medium' }))

  it("summarises the saved voyage from the engine's state", () => {
    renderHome()
    const card = screen.getByRole('region', { name: 'Scenario 3 · Medium' })
    expect(within(card).getByText('VOYAGE IN PROGRESS')).toBeInTheDocument()
    expect(within(card).getByText('Round III · trick 5 · You 2, Bosun 2')).toBeInTheDocument()
    expect(within(card).getByText('4 cards left · 4 attacks at round end')).toBeInTheDocument()
  })

  it('Continue · Round N opens the saved voyage', async () => {
    const { go } = renderHome()
    await userEvent.click(screen.getByRole('button', { name: 'Continue · Round III' }))
    expect(go).toHaveBeenCalledWith('game', 'fade')
  })

  it('New voyage goes to New voyage, which asks before replacing the saved one', async () => {
    const { go } = renderHome()
    await userEvent.click(screen.getByRole('button', { name: 'New voyage' }))
    expect(go).toHaveBeenCalledWith('newVoyage', 'push')
  })

  it('ends the voyage only after asking', async () => {
    renderHome()
    await userEvent.click(screen.getByRole('button', { name: 'End this voyage' }))
    const dialog = screen.getByRole('alertdialog', { name: 'End this voyage?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep sailing' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(localStorage.getItem(VOYAGE_KEY)).not.toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'End this voyage' }))
    // The danger button ignores taps for its first 300 ms (Components → Dialog).
    await new Promise((resolve) => setTimeout(resolve, 320))
    await userEvent.click(screen.getByRole('button', { name: 'End voyage' }))
    expect(await screen.findByRole('button', { name: 'Start your first voyage' })).toBeVisible()
    expect(localStorage.getItem(VOYAGE_KEY)).toBeNull()
    // It goes into the captain's log as unfinished (D2).
    expect(loadLog().map((e) => e.outcome)).toEqual(['unfinished'])
  })

  it('remembers that this phone has played', async () => {
    await renderApp()
    expect(loadPrefs().played).toBe(true)
  })

  it('names the Learning scenario', () => {
    saveScript('x', { scenario: 'learning', difficulty: 'easy' })
    renderHome()
    expect(screen.getByRole('region', { name: 'Learning scenario · Easy' })).toBeInTheDocument()
  })
})

describe('Credits (F4)', () => {
  it('names the designers, the illustrator, Allplay and Chuck Rosselli (AGENTS.md → Credit)', async () => {
    renderHome()
    await userEvent.click(screen.getByRole('button', { name: 'Credits' }))
    const sheet = screen.getByRole('dialog', { name: 'CREDITS' })
    for (const name of [
      'Akiyama Koryo',
      'Kozu Yusei',
      'Weberson Santiago',
      'Allplay',
      'Chuck Rosselli',
    ])
      expect(sheet).toHaveTextContent(name)
    expect(within(sheet).getByRole('link', { name: 'Source code on GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/asilachev/sail-automa',
    )
  })
})

describe('Language (F2)', () => {
  it('switches the app to the language picked, and keeps the choice', async () => {
    await renderApp()
    await userEvent.click(screen.getByRole('button', { name: 'Language: EN' }))
    const sheet = screen.getByRole('dialog', { name: 'LANGUAGE' })
    expect(within(sheet).getByRole('button', { name: 'English' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await userEvent.click(within(sheet).getByRole('button', { name: 'Deutsch' }))
    expect(await screen.findByRole('button', { name: 'Starte deine erste Fahrt' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'BOSUN', level: 1 })).toBeInTheDocument()
    expect(loadPrefs().language).toBe('de')
  })
})
