import {
  loadSave,
  SAVE_VERSION,
  toSave,
  type LoadedVoyage,
  type Settings,
  type VoyageEvent,
} from '../../engine/index.ts'
import { browserStorage } from './storage.ts'

/**
 * Saving the voyage (design 00 → PWA checklist: "Never lose a voyage"). A voyage is a pure function
 * of its settings and events (AGENTS.md → Engine purity), so the save is the engine's
 * `toSave(settings, events)`, under a versioned key, written after every change.
 *
 * Loading never throws. A save from an older version is migrated step by step, then checked by the
 * engine's `loadSave`, which replays it. One that can't be read is kept under a backup key instead
 * of deleted (Core → Saved data is a promise), and the app starts fresh and says so.
 */

/** Where version `v` of the save lives. */
export const voyageKey = (version: number = SAVE_VERSION): string => `bosun:v${version}:voyage`
export const VOYAGE_KEY = voyageKey()
/** An unreadable save is moved here, so a later fix can still recover it. */
export const UNREADABLE_KEY = 'bosun:voyage:unreadable'

type Migration = (old: Record<string, unknown>) => unknown

/**
 * Steps from each old version to the next: `MIGRATIONS[1]` turns a version 1 save into version 2,
 * and so on. When the engine bumps `SAVE_VERSION`, add the step from the old shape here.
 */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Brings a parsed save up to `current`. Throws if it can't. */
export function migrate(
  value: unknown,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
  current: number = SAVE_VERSION,
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

/** Saves the voyage, or clears it with null. Never throws. */
export function saveVoyage(
  voyage: { readonly settings: Settings; readonly events: readonly VoyageEvent[] } | null,
  storage: Storage | null = browserStorage(),
): void {
  try {
    if (voyage === null) storage?.removeItem(VOYAGE_KEY)
    else storage?.setItem(VOYAGE_KEY, JSON.stringify(toSave(voyage.settings, voyage.events)))
  } catch {
    // Storage full or blocked: the voyage still plays, it just won't survive a reload.
  }
}

export interface Loaded {
  /** The saved voyage with its replayed state, or null when there is none (or it was unreadable). */
  readonly voyage: LoadedVoyage | null
  /** A save was there but couldn't be read; it was moved to `UNREADABLE_KEY`. */
  readonly unreadable: boolean
}

/**
 * Loads the saved voyage: the current key first, then older versions' keys, newest first, each
 * migrated to the current shape and replayed by the engine. Never throws.
 */
export function loadVoyage(storage: Storage | null = browserStorage()): Loaded {
  for (let version = SAVE_VERSION; version >= 1; version--) {
    const key = voyageKey(version)
    let raw: string | null
    try {
      raw = storage?.getItem(key) ?? null
    } catch {
      return { voyage: null, unreadable: false }
    }
    if (raw === null) continue
    let voyage: LoadedVoyage | null = null
    try {
      voyage = loadSave(migrate(JSON.parse(raw)))
    } catch {
      voyage = null
    }
    if (!voyage) {
      keepUnreadable(key, raw, storage)
      return { voyage: null, unreadable: true }
    }
    if (version !== SAVE_VERSION) {
      // Moved forward: written under the current key, the old one cleared.
      saveVoyage(voyage, storage)
      try {
        storage?.removeItem(key)
      } catch {
        // Harmless: the current key wins next time.
      }
    }
    return { voyage, unreadable: false }
  }
  return { voyage: null, unreadable: false }
}

function keepUnreadable(key: string, raw: string, storage: Storage | null): void {
  try {
    storage?.setItem(UNREADABLE_KEY, raw)
    storage?.removeItem(key)
  } catch {
    // Can't move it: leave it where it is, untouched.
  }
}
