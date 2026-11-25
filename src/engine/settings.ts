/**
 * A voyage's settings: what New voyage picks, and the rulings. Every gap the variant leaves is a
 * ruling with a default (docs/automa.md → Rulings). Change a default only together with that
 * table and the design's B4 · Rulings sheet.
 */
import { SCENARIOS, type ScenarioId } from './scenarios.ts'

/** docs/automa.md → The variant → Difficulty: who has which Pirate card. */
export type Difficulty = 'easy' | 'medium' | 'hard'
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard']

/** Which side of the ocean board you sit on. The engine only carries it, for the UI. */
export type Seat = 'left' | 'right'
export const SEATS: readonly Seat[] = ['left', 'right']

export interface Rulings {
  /** Ruling 1 · the ship sails past the End token: you lose (default), or nothing happens. */
  readonly pastEnd: 'lose' | 'nothing'
  /** Ruling 2 · who decides if the Bosun uses its Pirate card: you, when it wins the trick. */
  readonly bosunPirate: 'you'
  /** Ruling 3 · the Cannon + Wheel pirate's new action: only its owner (default), or any winner. */
  readonly cannonWheel: 'owner' | 'anyWinner'
  /** Ruling 4 · too few cards to deal 9 each: deal evenly, as far as the deck goes. */
  readonly shortDeal: 'evenly'
  /** Ruling 5 · the fourth trick's action: resolve it, then end the round (default), or end first. */
  readonly fourthTrick: 'resolve' | 'endFirst'
}

/** Every ruling's options, default first (docs/automa.md → Rulings, in its order). */
export const RULING_OPTIONS: { readonly [K in keyof Rulings]: readonly Rulings[K][] } = {
  pastEnd: ['lose', 'nothing'],
  bosunPirate: ['you'],
  cannonWheel: ['owner', 'anyWinner'],
  shortDeal: ['evenly'],
  fourthTrick: ['resolve', 'endFirst'],
}

export const RULING_KEYS = Object.keys(RULING_OPTIONS) as readonly (keyof Rulings)[]

export const DEFAULT_RULINGS: Rulings = {
  pastEnd: 'lose',
  bosunPirate: 'you',
  cannonWheel: 'owner',
  shortDeal: 'evenly',
  fourthTrick: 'resolve',
}

export interface Settings {
  readonly scenario: ScenarioId
  readonly difficulty: Difficulty
  readonly seat: Seat
  /**
   * The Bosun has the Cannon + Wheel pirate (in Easy, one of the two shared cards is it), so the
   * app walks you through its swap (docs/automa.md → The Bosun's Cannon + Wheel). Ignored in Hard,
   * where the Bosun has no Pirate card.
   */
  readonly bosunCannonWheel: boolean
  readonly rulings: Rulings
}

export const DEFAULT_SETTINGS: Settings = {
  scenario: 'learning',
  difficulty: 'medium',
  seat: 'left',
  bosunCannonWheel: false,
  rulings: DEFAULT_RULINGS,
}

/** How many rulings differ from their defaults: "5 rulings · all defaults" when 0. */
export function changedRulings(rulings: Rulings): number {
  return RULING_KEYS.filter((k) => rulings[k] !== DEFAULT_RULINGS[k]).length
}

/** The Bosun can use the Cannon + Wheel pirate: it has it, and the difficulty gives it a pirate. */
export function bosunHasCannonWheel(settings: Settings): boolean {
  return settings.bosunCannonWheel && settings.difficulty !== 'hard'
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

function pick<T>(value: unknown, options: readonly T[], fallback: T): T | undefined {
  if (value === undefined) return fallback
  return options.includes(value as T) ? (value as T) : undefined
}

/**
 * Settings from saved or untrusted data, or null when they are invalid. Missing fields take
 * their defaults, so a save from before a new setting or ruling still loads (AGENTS.md → Saved
 * data is a promise); a field with an unknown value fails.
 */
export function parseSettings(raw: unknown): Settings | null {
  if (!isRecord(raw)) return null
  const scenario = SCENARIOS.find((s) => s.id === raw.scenario)?.id
  if (scenario === undefined) return null
  const difficulty = pick(raw.difficulty, DIFFICULTIES, DEFAULT_SETTINGS.difficulty)
  const seat = pick(raw.seat, SEATS, DEFAULT_SETTINGS.seat)
  const cw = pick(raw.bosunCannonWheel, [true, false], DEFAULT_SETTINGS.bosunCannonWheel)
  if (difficulty === undefined || seat === undefined || cw === undefined) return null
  const rawRulings = raw.rulings === undefined ? {} : raw.rulings
  if (!isRecord(rawRulings)) return null
  const rulings: Record<string, unknown> = {}
  for (const key of RULING_KEYS) {
    const options: readonly unknown[] = RULING_OPTIONS[key]
    const value = pick(rawRulings[key], options, DEFAULT_RULINGS[key])
    if (value === undefined) return null
    rulings[key] = value
  }
  return {
    scenario,
    difficulty,
    seat,
    bosunCannonWheel: cw,
    // Every key was checked against RULING_OPTIONS above.
    rulings: rulings as unknown as Rulings,
  }
}
