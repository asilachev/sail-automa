import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, type Settings } from '../../engine/index.ts'
import { LAST_SETTINGS_KEY, loadLastSettings, saveLastSettings } from './lastSettings.ts'

beforeEach(() => localStorage.clear())

const settings: Settings = {
  scenario: 3,
  difficulty: 'hard',
  seat: 'right',
  bosunCannonWheel: true,
  rulings: { ...DEFAULT_SETTINGS.rulings, pastEnd: 'nothing' },
}

describe('the last settings (remembered for the next New voyage)', () => {
  it('are null until a voyage is set up', () => {
    expect(loadLastSettings()).toBeNull()
  })

  it('come back as saved', () => {
    saveLastSettings(settings)
    expect(loadLastSettings()).toEqual(settings)
  })

  it('still load when a ruling was added since (saved data is a promise)', () => {
    localStorage.setItem(LAST_SETTINGS_KEY, JSON.stringify({ scenario: 2, difficulty: 'easy' }))
    expect(loadLastSettings()).toEqual({ ...DEFAULT_SETTINGS, scenario: 2, difficulty: 'easy' })
  })

  it('are null when unreadable, without throwing', () => {
    localStorage.setItem(LAST_SETTINGS_KEY, '{not json')
    expect(loadLastSettings()).toBeNull()
    localStorage.setItem(LAST_SETTINGS_KEY, JSON.stringify({ scenario: 9 }))
    expect(loadLastSettings()).toBeNull()
  })

  it('never throw when storage is missing', () => {
    expect(() => saveLastSettings(settings, null)).not.toThrow()
    expect(loadLastSettings(null)).toBeNull()
  })
})
