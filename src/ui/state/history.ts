import { useCallback, useState } from 'react'
import {
  DIFFICULTIES,
  ROUNDS,
  SCENARIOS,
  toSave,
  type Difficulty,
  type LoseReason,
  type Round,
  type ScenarioId,
  type Settings,
  type VoyageEvent,
  type VoyageState,
} from '../../engine/index.ts'
import { browserStorage } from './storage.ts'

/**
 * The captain's log (design E3, #8): every voyage that ended, newest first. It's kept apart from
 * the saved voyage, so starting or ending a voyage never touches it, and only "Clear the log"
 * removes it. Modelled on splendor-marvel-automa's `src/ui/state/history.ts`.
 *
 * An entry is a summary, not the voyage: the date, the scenario and difficulty, the outcome, its
 * reason and the round. The date comes in from the caller (AGENTS.md → Engine purity: the clock
 * enters only at the UI's edge, in `useCaptainsLog`).
 *
 * The log lives under a versioned key. Loading never throws: an older version is migrated step by
 * step and moved to the current key, entries that can't be read are skipped, and a log that can't
 * be parsed at all is kept under a backup key rather than deleted (Core → Saved data is a promise).
 */

export const LOG_VERSION = 1
/** Where version `v` of the log lives. */
export const logKey = (version: number = LOG_VERSION): string => `bosun:v${version}:log`
export const LOG_KEY = logKey()
/** A log that can't be parsed is moved here, so a later fix can still recover it. */
export const UNREADABLE_LOG_KEY = 'bosun:log:unreadable'
/** Years of play; the oldest voyages beyond it are dropped. */
export const LOG_LIMIT = 500

export type Outcome = 'won' | 'lost' | 'unfinished'
/** Why it ended: the End token, one of the engine's ways to lose, or null for an unfinished one. */
export type EndReason = 'end' | LoseReason | null

export interface VoyageRecord {
  /** One entry per voyage: recording the same voyage again changes nothing (`voyageId`). */
  readonly id: string
  /** When it ended, as an ISO date and time. */
  readonly date: string
  readonly settings: { readonly scenario: ScenarioId; readonly difficulty: Difficulty }
  readonly outcome: Outcome
  readonly reason: EndReason
  /** The round it ended in (I to V). */
  readonly round: Round
}

/** What `recordVoyage` needs: `useVoyage().voyage`, or an engine fixture. */
export interface EndedVoyage {
  readonly settings: Settings
  readonly events: readonly VoyageEvent[]
  readonly state: VoyageState
}

interface StoredLog {
  readonly version: number
  readonly entries: readonly unknown[]
}

type Migration = (old: Record<string, unknown>) => unknown

/**
 * Steps from each old version to the next: `LOG_MIGRATIONS[1]` turns a version 1 log into version
 * 2, and so on. When the entry's shape changes, bump `LOG_VERSION` and add the step here.
 */
export const LOG_MIGRATIONS: Readonly<Record<number, Migration>> = {}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * A voyage's identity: a hash of its settings and events. A voyage is a pure function of the two
 * (AGENTS.md → Engine purity), so replaying a finished voyage, or the result screen and the game
 * screen both recording it, gives the same id and logs it once.
 */
export function voyageId(settings: Settings, events: readonly VoyageEvent[]): string {
  return hash(JSON.stringify(toSave(settings, events)))
}

/** cyrb53: a small, fast 53-bit string hash. Not cryptographic; it only tells voyages apart. */
function hash(text: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 2654435761)
    h2 = Math.imul(h2 ^ c, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

/**
 * The log entry for a voyage that ended: won or lost from the engine's result, or unfinished when
 * there is none ("End this voyage?", design D2). An unfinished voyage's id also carries its date:
 * two voyages ended at the same early step would otherwise share one, and ending is a single tap
 * (the dialog guards double taps), not something a screen repeats.
 */
export function summarizeVoyage(voyage: EndedVoyage, date: string): VoyageRecord {
  const { settings, events, state } = voyage
  const id = voyageId(settings, events)
  const summary = { scenario: settings.scenario, difficulty: settings.difficulty }
  const result = state.result
  if (!result)
    return {
      id: `${id}@${date}`,
      date,
      settings: summary,
      outcome: 'unfinished',
      reason: null,
      round: state.round,
    }
  return {
    id,
    date,
    settings: summary,
    outcome: result.outcome,
    reason: result.reason,
    round: result.round,
  }
}

/** Brings a parsed log up to `current`. Throws if it can't. */
export function migrateLog(
  value: unknown,
  migrations: Readonly<Record<number, Migration>> = LOG_MIGRATIONS,
  current: number = LOG_VERSION,
): StoredLog {
  let log = value
  for (;;) {
    if (!isRecord(log) || typeof log.version !== 'number') throw new Error('Not a log')
    if (log.version === current) {
      if (!Array.isArray(log.entries)) throw new Error('No entries')
      return { version: current, entries: log.entries }
    }
    const step = migrations[log.version]
    if (log.version > current || !step) throw new Error(`No way from version ${log.version}`)
    log = step(log)
  }
}

/**
 * Loads the log, newest first: the current key, then older versions' keys, newest first, each
 * migrated and moved to the current key. Never throws; returns [] when there's nothing to read.
 */
export function loadLog(
  storage: Storage | null = browserStorage(),
  migrations: Readonly<Record<number, Migration>> = LOG_MIGRATIONS,
  current: number = LOG_VERSION,
): VoyageRecord[] {
  for (let version = current; version >= 1; version--) {
    const key = logKey(version)
    let raw: string | null
    try {
      raw = storage?.getItem(key) ?? null
    } catch {
      return []
    }
    if (raw === null) continue
    let entries: VoyageRecord[]
    try {
      entries = migrateLog(JSON.parse(raw), migrations, current).entries.flatMap((item) => {
        const entry = readEntry(item)
        return entry ? [entry] : []
      })
    } catch {
      keepUnreadable(key, raw, storage)
      return []
    }
    if (version !== current) {
      writeLog(entries, storage, current)
      try {
        storage?.removeItem(key)
      } catch {
        // Harmless: the current key wins next time.
      }
    }
    return entries
  }
  return []
}

/**
 * Adds a voyage that ended (won, lost, or unfinished from "End this voyage?"). Idempotent: a voyage
 * already in the log is left as it was, with its first date. Returns the new log. Never throws.
 */
export function recordVoyage(
  voyage: EndedVoyage,
  date: string,
  storage: Storage | null = browserStorage(),
): VoyageRecord[] {
  const entry = summarizeVoyage(voyage, date)
  const log = loadLog(storage)
  if (log.some((e) => e.id === entry.id)) return log
  return writeLog([entry, ...log], storage)
}

/** Removes a voyage, e.g. when an undo steps back from its result. Returns the new log. */
export function forgetVoyage(
  id: string,
  storage: Storage | null = browserStorage(),
): VoyageRecord[] {
  return writeLog(
    loadLog(storage).filter((e) => e.id !== id),
    storage,
  )
}

/** "Clear the log" (design E4). */
export function clearLog(storage: Storage | null = browserStorage()): void {
  try {
    storage?.removeItem(LOG_KEY)
  } catch {
    // Blocked storage: nothing was saved there either.
  }
}

// ── selectors ────────────────────────────────────────────────────────────────────────────────

export interface LogCounts {
  readonly voyages: number
  readonly reachedLand: number
}

/** Home's line, "N voyages · M reached land" (design A2). */
export function logCounts(entries: readonly VoyageRecord[]): LogCounts {
  return {
    voyages: entries.length,
    reachedLand: entries.filter((e) => e.outcome === 'won').length,
  }
}

export interface LogStats extends LogCounts {
  /** Share of all logged voyages that reached land, 0 to 1; null without voyages. */
  readonly winRate: number | null
  /** The first voyage's date ("since 2 Nov"); null without voyages. */
  readonly since: string | null
}

/** The captain's log's key figures (design E3): voyages, reached land, win rate. */
export function logStats(entries: readonly VoyageRecord[]): LogStats {
  const counts = logCounts(entries)
  const since = entries.reduce<string | null>(
    (first, e) => (first === null || e.date < first ? e.date : first),
    null,
  )
  return {
    ...counts,
    winRate: counts.voyages ? counts.reachedLand / counts.voyages : null,
    since,
  }
}

export interface GridCell {
  readonly difficulty: Difficulty
  /** At least one voyage at this scenario and difficulty reached land: the cell turns gold. */
  readonly reached: boolean
  /** Voyages logged here, finished or not. */
  readonly tries: number
}

export interface GridRow {
  readonly scenario: ScenarioId
  readonly cells: readonly GridCell[]
}

/** Scenarios by difficulty (design E3): every scenario, Learning first, in Easy, Medium, Hard. */
export function scenarioGrid(entries: readonly VoyageRecord[]): GridRow[] {
  return SCENARIOS.map(({ id }) => ({
    scenario: id,
    cells: DIFFICULTIES.map((difficulty) => {
      const here = entries.filter(
        (e) => e.settings.scenario === id && e.settings.difficulty === difficulty,
      )
      return {
        difficulty,
        reached: here.some((e) => e.outcome === 'won'),
        tries: here.length,
      }
    }),
  }))
}

// ── the hook ─────────────────────────────────────────────────────────────────────────────────

export interface CaptainsLogApi {
  /** Newest first. */
  readonly entries: readonly VoyageRecord[]
  /** Logs a voyage that ended, dated now. Idempotent per voyage. */
  record(voyage: EndedVoyage): void
  forget(id: string): void
  clear(): void
}

/** The captain's log for a screen. The clock enters here, at the UI's edge. */
export function useCaptainsLog(): CaptainsLogApi {
  const [entries, setEntries] = useState<readonly VoyageRecord[]>(() => loadLog())
  const record = useCallback((voyage: EndedVoyage) => {
    setEntries(recordVoyage(voyage, new Date().toISOString()))
  }, [])
  const forget = useCallback((id: string) => setEntries(forgetVoyage(id)), [])
  const clear = useCallback(() => {
    clearLog()
    setEntries([])
  }, [])
  return { entries, record, forget, clear }
}

// ── storage ──────────────────────────────────────────────────────────────────────────────────

function writeLog(
  entries: readonly VoyageRecord[],
  storage: Storage | null,
  version: number = LOG_VERSION,
): VoyageRecord[] {
  const kept = entries.slice(0, LOG_LIMIT)
  try {
    storage?.setItem(logKey(version), JSON.stringify({ version, entries: kept }))
  } catch {
    // Storage full or blocked: the log shows this session's voyages but won't keep them.
  }
  return kept
}

function keepUnreadable(key: string, raw: string, storage: Storage | null): void {
  try {
    storage?.setItem(UNREADABLE_LOG_KEY, raw)
    storage?.removeItem(key)
  } catch {
    // Can't move it: leave it where it is, untouched.
  }
}

const OUTCOMES: readonly Outcome[] = ['won', 'lost', 'unfinished']
const LOSE_REASONS: readonly LoseReason[] = [
  'roundFive',
  'storm',
  'krakenAlone',
  'skull',
  'pastEnd',
]

/** A stored entry, checked; anything unreadable is skipped rather than breaking the screen. */
function readEntry(value: unknown): VoyageRecord | null {
  if (!isRecord(value) || !isRecord(value.settings)) return null
  const { id, date, outcome, reason, round } = value
  const scenario = SCENARIOS.find(
    (s) => s.id === (value.settings as Record<string, unknown>).scenario,
  )?.id
  const difficulty = DIFFICULTIES.find(
    (d) => d === (value.settings as Record<string, unknown>).difficulty,
  )
  if (
    typeof id !== 'string' ||
    typeof date !== 'string' ||
    Number.isNaN(Date.parse(date)) ||
    scenario === undefined ||
    difficulty === undefined ||
    !OUTCOMES.includes(outcome as Outcome) ||
    typeof round !== 'number' ||
    !Number.isInteger(round) ||
    round < 1 ||
    round > ROUNDS
  )
    return null
  const okReason =
    (outcome === 'won' && reason === 'end') ||
    (outcome === 'lost' && LOSE_REASONS.includes(reason as LoseReason)) ||
    (outcome === 'unfinished' && reason === null)
  if (!okReason) return null
  return {
    id,
    date,
    settings: { scenario, difficulty },
    outcome: outcome as Outcome,
    reason: reason as EndReason,
    round: round as Round,
  }
}
