import { browserStorage } from './storage.ts'

/**
 * Saving the voyage (design 00 → PWA checklist: "Never lose a voyage"). A voyage is a pure function
 * of its settings and events (AGENTS.md → Engine purity), so the save is exactly those, under a
 * versioned key, written after every change.
 *
 * Loading never throws. A save from an older version is migrated step by step; one that can't be
 * read is kept under a backup key instead of deleted (Core → Saved data is a promise), and the app
 * starts fresh and says so.
 *
 * The engine (issue #1) isn't merged yet, so settings and events are checked through a
 * `VoyageAdapter`: point one at the engine's validators and replay when it lands.
 */

/** Bump when the saved shape changes, and add the step from the old shape to `MIGRATIONS`. */
export const VOYAGE_VERSION = 1

/** Where version `v` of the save lives. */
export const voyageKey = (version: number = VOYAGE_VERSION): string => `bosun:v${version}:voyage`
export const VOYAGE_KEY = voyageKey()
/** An unreadable save is moved here, so a later fix can still recover it. */
export const UNREADABLE_KEY = 'bosun:voyage:unreadable'

export interface SavedVoyage<S = unknown, E = unknown> {
  readonly version: typeof VOYAGE_VERSION
  readonly settings: S
  readonly events: readonly E[]
}

/** Checks a saved voyage's parts. Each method throws on anything it can't accept. */
export interface VoyageAdapter<S, E> {
  parseSettings(value: unknown): S
  parseEvent(value: unknown): E
  /** Optional whole-voyage check, such as replaying the events through the engine. */
  check?(settings: S, events: readonly E[]): void
}

/** An event as the UI knows it before the engine lands: an object with a string `type`. */
export interface LooseEvent {
  readonly type: string
  readonly [field: string]: unknown
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Accepts any settings object and any event with a `type`. A stand-in until the engine's
 * validators replace it (issue #1).
 */
export const looseAdapter: VoyageAdapter<Readonly<Record<string, unknown>>, LooseEvent> = {
  parseSettings(value) {
    if (!isRecord(value)) throw new Error('Settings are not an object')
    return value
  },
  parseEvent(value) {
    if (!isRecord(value) || typeof value.type !== 'string') throw new Error('Bad event')
    return value as LooseEvent
  },
}

/**
 * Steps from each old version to the next: `MIGRATIONS[1]` turns a version 1 save into version 2,
 * and so on. Each takes the parsed JSON of the old save and returns the next version's.
 */
export const MIGRATIONS: Readonly<Record<number, (old: Record<string, unknown>) => unknown>> = {}

/** Brings a parsed save up to the current version. Throws if it can't. */
export function migrate(
  value: unknown,
  migrations: Readonly<Record<number, (old: Record<string, unknown>) => unknown>> = MIGRATIONS,
  current: number = VOYAGE_VERSION,
): Record<string, unknown> {
  let save = value
  for (;;) {
    if (!isRecord(save) || typeof save.version !== 'number') throw new Error('Not a save')
    if (save.version === current) return save
    const step = migrations[save.version]
    if (save.version > current || !step) throw new Error(`No way from version ${save.version}`)
    save = step(save)
  }
}

export function saveVoyage<S, E>(
  voyage: SavedVoyage<S, E> | null,
  storage: Storage | null = browserStorage(),
): void {
  try {
    if (voyage === null) storage?.removeItem(VOYAGE_KEY)
    else storage?.setItem(VOYAGE_KEY, JSON.stringify(voyage))
  } catch {
    // Storage full or blocked: the voyage still plays, it just won't survive a reload.
  }
}

export interface LoadedVoyage<S, E> {
  /** The saved voyage, or null when there is none (or it couldn't be read). */
  readonly voyage: SavedVoyage<S, E> | null
  /** A save was there but couldn't be read; it was moved to `UNREADABLE_KEY`. */
  readonly unreadable: boolean
}

/**
 * Loads the saved voyage: the current key first, then older versions' keys, newest first, each
 * migrated to the current shape and checked through the adapter. Never throws.
 */
export function loadVoyage<S, E>(
  adapter: VoyageAdapter<S, E>,
  storage: Storage | null = browserStorage(),
): LoadedVoyage<S, E> {
  for (let version = VOYAGE_VERSION; version >= 1; version--) {
    const key = voyageKey(version)
    let raw: string | null
    try {
      raw = storage?.getItem(key) ?? null
    } catch {
      return { voyage: null, unreadable: false }
    }
    if (raw === null) continue
    try {
      const voyage = parse(JSON.parse(raw), adapter)
      if (version !== VOYAGE_VERSION) {
        // Moved forward: written under the current key, the old one cleared.
        saveVoyage(voyage, storage)
        storage?.removeItem(key)
      }
      return { voyage, unreadable: false }
    } catch {
      keepUnreadable(key, raw, storage)
      return { voyage: null, unreadable: true }
    }
  }
  return { voyage: null, unreadable: false }
}

function parse<S, E>(value: unknown, adapter: VoyageAdapter<S, E>): SavedVoyage<S, E> {
  const save = migrate(value)
  if (!Array.isArray(save.events)) throw new Error('Events are not a list')
  const settings = adapter.parseSettings(save.settings)
  const events = save.events.map((e: unknown) => adapter.parseEvent(e))
  adapter.check?.(settings, events)
  return { version: VOYAGE_VERSION, settings, events }
}

function keepUnreadable(key: string, raw: string, storage: Storage | null): void {
  try {
    storage?.setItem(UNREADABLE_KEY, raw)
    storage?.removeItem(key)
  } catch {
    // Can't move it: leave it where it is, untouched.
  }
}
