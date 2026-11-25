import { parseSettings, type Settings } from '../../engine/index.ts'
import { browserStorage } from './storage.ts'

/**
 * The settings of the last voyage set up on this device, so the next New voyage starts from them
 * (as splendor-marvel-automa's saveSettings does). Kept apart from the saved voyage: they outlive
 * it, and the captain's log's "Try scenario N again" reuses them.
 *
 * Saved data is a promise (AGENTS.md → Code): the engine's `parseSettings` fills in a setting or
 * ruling added since, so an old entry still loads; one it can't read gives null.
 */
export const LAST_SETTINGS_KEY = 'bosun:v1:last-settings'

/** Remembers the settings for the next New voyage. Never throws. */
export function saveLastSettings(
  settings: Settings,
  storage: Storage | null = browserStorage(),
): void {
  try {
    storage?.setItem(LAST_SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // Not critical: the next New voyage starts from the defaults.
  }
}

/** The last settings, or null when there are none or they can't be read. Never throws. */
export function loadLastSettings(storage: Storage | null = browserStorage()): Settings | null {
  try {
    const raw = storage?.getItem(LAST_SETTINGS_KEY)
    if (!raw) return null
    return parseSettings(JSON.parse(raw))
  } catch {
    return null
  }
}
