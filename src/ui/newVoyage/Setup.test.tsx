import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, firstLeader, type Settings } from '../../engine/index.ts'
import { createTranslator } from '../i18n/index.ts'
import en from '../i18n/locales/en.json'
import ru from '../i18n/locales/ru.json'
import { NavContext, type Nav } from '../nav.ts'
import { loadLastSettings, saveLastSettings } from '../state/lastSettings.ts'
import { loadVoyage } from '../state/voyage.ts'
import { App } from '../App.tsx'
import { startVoyage } from '../../test/voyage.ts'
import { Setup } from './Setup.tsx'
import { setupLines } from './texts.ts'

beforeEach(() => {
  localStorage.clear()
  window.history.replaceState(null, '', '/')
})

function renderSetup(settings?: Settings) {
  if (settings) saveLastSettings(settings)
  const go = vi.fn<Nav['go']>()
  render(
    <NavContext.Provider value={{ screen: 'setup', go }}>
      <Setup />
    </NavContext.Provider>,
  )
  return { go, user: userEvent.setup() }
}

const lines = (settings: Partial<Settings>) =>
  setupLines(createTranslator('en', en), 'en', { ...DEFAULT_SETTINGS, ...settings })

describe('Set up the table: the lines (docs/rules.md → Setup; docs/automa.md → Setup)', () => {
  it('has nine lines to tick', () => {
    renderSetup()
    expect(screen.getAllByRole('checkbox')).toHaveLength(9)
    expect(screen.getByText('Learning scenario · Medium · tick each line as you do it'))
  })

  it('lists the chosen scenario’s tokens from the Scenario Book on line 2', () => {
    expect(lines({ scenario: 3 })[1]).toBe(
      'Place scenario 3’s tokens:\nIslands: D3, G6, G8, A10, E10, B11, A12, D15, C18, A20, G20\n' +
        'Kraken: G4, A6, D7, E12, A16, G16, F19\nEnd: C20, E20, D21\nStorms: columns 5 and 14',
    )
    // The Learning scenario has one storm (docs/decisions.md).
    expect(lines({ scenario: 'learning' })[1]).toMatch(/^Place the Learning scenario’s tokens:/)
    expect(lines({ scenario: 'learning' })[1]).toMatch(/\nStorm: column 5$/)
  })

  it('names the storm columns in the language, with its plural', () => {
    const t = createTranslator('ru', ru)
    expect(setupLines(t, 'ru', { ...DEFAULT_SETTINGS, scenario: 4 })[1]).toMatch(
      // Russian typesetting puts non-breaking spaces after short words.
      /Штормы:\sстолбцы\s9\sи\s18$/,
    )
  })

  it('lays out the Pirate cards by difficulty on line 3 (docs/automa.md → Difficulty)', () => {
    expect(lines({ difficulty: 'easy' })[2]).toBe('Pirate cards: two, shared, beside the board.')
    expect(lines({ difficulty: 'medium' })[2]).toBe('Pirate cards: one for you, one for the Bosun.')
    expect(lines({ difficulty: 'medium', bosunCannonWheel: true })[2]).toBe(
      'Pirate cards: one for you, the Cannon + Wheel for the Bosun.',
    )
    expect(lines({ difficulty: 'hard', bosunCannonWheel: true })[2]).toBe(
      'Pirate card: one for you. The Bosun has none.',
    )
  })

  it('says you lead the first trick, as the variant has it (line 5)', () => {
    expect(firstLeader(1)).toBe('you')
    expect(lines({})[4]).toBe('Round disc on I, on your side: you lead the first trick.')
  })
})

describe('Set up the table: Set sail', () => {
  it('stays disabled, with a note, until every line is ticked', async () => {
    const { user } = renderSetup()
    const go = screen.getByRole('button', { name: 'Set sail' })
    expect(go).toBeDisabled()
    expect(screen.getByText('Tick all 9 lines to set sail')).toBeInTheDocument()
    const boxes = screen.getAllByRole('checkbox')
    for (const box of boxes.slice(0, 5)) await user.click(box)
    expect(screen.getByText('Tick the 4 lines left to set sail')).toBeInTheDocument()
    for (const box of boxes.slice(5, 8)) await user.click(box)
    expect(screen.getByText('Tick the last line to set sail')).toBeInTheDocument()
    expect(go).toBeDisabled()
    await user.click(boxes[8]!)
    expect(go).toBeEnabled()
    expect(screen.queryByText(/to set sail$/)).toBeNull()
    await user.click(boxes[8]!)
    expect(go).toBeDisabled()
  })

  it('keeps the ticks on the screen only (pwa layer → State)', async () => {
    const { user } = renderSetup({ ...DEFAULT_SETTINGS, scenario: 1 })
    const before = JSON.stringify({ ...localStorage })
    for (const box of screen.getAllByRole('checkbox')) await user.click(box)
    expect(JSON.stringify({ ...localStorage })).toBe(before)
  })

  it('starts the voyage with the chosen settings, asks to persist storage and goes to the game', async () => {
    const persist = vi.fn(() => Promise.resolve(true))
    Object.defineProperty(navigator, 'storage', { value: { persist }, configurable: true })
    const settings: Settings = { ...DEFAULT_SETTINGS, scenario: 5, difficulty: 'easy' }
    const { user, go } = renderSetup(settings)
    for (const box of screen.getAllByRole('checkbox')) await user.click(box)
    await user.click(screen.getByRole('button', { name: 'Set sail' }))
    expect(loadVoyage().voyage).toMatchObject({ settings, events: [] })
    expect(loadLastSettings()).toEqual(settings)
    expect(persist).toHaveBeenCalled()
    expect(go).toHaveBeenCalledWith('game', 'push')
  })

  it('goes back to New voyage', async () => {
    const { user, go } = renderSetup()
    await user.click(screen.getByRole('button', { name: 'New voyage' }))
    expect(go).toHaveBeenCalledWith('newVoyage', 'back')
  })
})

describe('the startVoyage test helper', () => {
  it('goes from New voyage through the setup to a saved voyage', async () => {
    window.history.replaceState(null, '', '/?screen=newVoyage')
    render(<App />)
    await startVoyage(userEvent.setup(), { scenario: 'Scenario 2', difficulty: 'Hard' })
    expect(loadVoyage().voyage?.settings).toMatchObject({ scenario: 2, difficulty: 'hard' })
  })
})
