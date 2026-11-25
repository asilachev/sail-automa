/**
 * Saved voyages: the inputs (settings and events), versioned, and checked on load by replaying
 * them (AGENTS.md → Phone-first PWA → State; Core → Saved data is a promise). A save from an older
 * version must keep loading: migrate it here, never reject it.
 */
import { CARD_SYMBOLS, type CardSymbol } from './orders.ts'
import { parseSettings, type Settings } from './settings.ts'
import type { TrackIndex } from './kraken.ts'
import {
  replay,
  SIDES,
  TOKENS,
  type Side,
  type Token,
  type VoyageEvent,
  type VoyageState,
} from './voyage.ts'

export const SAVE_VERSION = 1

export interface SavedVoyage {
  readonly version: typeof SAVE_VERSION
  readonly settings: Settings
  readonly events: readonly VoyageEvent[]
}

export interface LoadedVoyage extends SavedVoyage {
  readonly state: VoyageState
}

export function toSave(settings: Settings, events: readonly VoyageEvent[]): SavedVoyage {
  return { version: SAVE_VERSION, settings, events }
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const isCount = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0
const oneOf = <T>(options: readonly T[], v: unknown): v is T => options.includes(v as T)

/** One event from untrusted data, or null. Only the known fields are kept. */
export function parseEvent(raw: unknown): VoyageEvent | null {
  if (!isRecord(raw)) return null
  switch (raw.type) {
    case 'exchange':
    case 'orderDone':
    case 'roundEndDone':
    case 'dealt':
      return { type: raw.type }
    case 'trick': {
      const { winner, yours, bosuns } = raw
      if (!oneOf<Side>(SIDES, winner)) return null
      if (!oneOf<CardSymbol>(CARD_SYMBOLS, yours) || !oneOf<CardSymbol>(CARD_SYMBOLS, bosuns)) {
        return null
      }
      return { type: 'trick', winner, yours, bosuns }
    }
    case 'flip':
      return oneOf<CardSymbol>(CARD_SYMBOLS, raw.symbol)
        ? { type: 'flip', symbol: raw.symbol }
        : null
    case 'ship':
      return oneOf<Token>(TOKENS, raw.onto) ? { type: 'ship', onto: raw.onto } : null
    case 'storm':
      return typeof raw.passed === 'boolean' ? { type: 'storm', passed: raw.passed } : null
    case 'fix': {
      const { above, below, track, playerDeck } = raw
      if (![above, below, track, playerDeck].every(isCount)) return null
      // The reducer checks the ranges; here only the types.
      return {
        type: 'fix',
        above: above as number,
        below: below as number,
        track: track as TrackIndex,
        playerDeck: playerDeck as number,
      }
    }
    default:
      return null
  }
}

/**
 * A saved voyage from storage (an object or its JSON text), replayed; null for anything that
 * isn't a valid save. Never throws.
 */
export function loadSave(raw: unknown): LoadedVoyage | null {
  try {
    const data: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!isRecord(data) || data.version !== SAVE_VERSION) return null
    const settings = parseSettings(data.settings)
    if (!settings || !Array.isArray(data.events)) return null
    const events: VoyageEvent[] = []
    for (const e of data.events as unknown[]) {
      const event = parseEvent(e)
      if (!event) return null
      events.push(event)
    }
    return { version: SAVE_VERSION, settings, events, state: replay(settings, events) }
  } catch {
    // Bad JSON, or events the rules don't allow: not a save we can open.
    return null
  }
}
