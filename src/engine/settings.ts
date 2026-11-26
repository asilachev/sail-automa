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

/**
 * Who holds the Cannon + Wheel pirate (docs/automa.md → The Cannon + Wheel pirate, #22): nobody
 * (it isn't in play), you, the Bosun, or, on Easy, the shared pair (whoever wins may use either).
 * Each difficulty offers its own holders (`cannonWheelOptions`); `cannonWheelHolder` reads the
 * setting for the chosen difficulty.
 */
export type CannonWheel = 'none' | 'you' | 'bosun' | 'shared'
export const CANNON_WHEEL: readonly CannonWheel[] = ['none', 'you', 'bosun', 'shared']

export interface Settings {
  readonly scenario: ScenarioId
  readonly difficulty: Difficulty
  readonly seat: Seat
  /** Who holds the Cannon + Wheel pirate; it replaced `bosunCannonWheel: boolean` (#22). */
  readonly cannonWheel: CannonWheel
  readonly rulings: Rulings
}

export const DEFAULT_SETTINGS: Settings = {
  scenario: 'learning',
  difficulty: 'medium',
  seat: 'left',
  cannonWheel: 'none',
  rulings: DEFAULT_RULINGS,
}

/** How many rulings differ from their defaults: "5 rulings · all defaults" when 0. */
export function changedRulings(rulings: Rulings): number {
  return RULING_KEYS.filter((k) => rulings[k] !== DEFAULT_RULINGS[k]).length
}

/**
 * Who may hold the Cannon + Wheel pirate on each difficulty (docs/automa.md → Difficulty): on Easy
 * the two Pirate cards are shared, so it is in the pair or not; on Medium each side has one; on
 * Hard only you have a Pirate card.
 */
export function cannonWheelOptions(difficulty: Difficulty): readonly CannonWheel[] {
  if (difficulty === 'easy') return ['none', 'shared']
  if (difficulty === 'hard') return ['none', 'you']
  return ['none', 'you', 'bosun']
}

/**
 * The Cannon + Wheel's holder for the settings' difficulty. A holder the difficulty doesn't offer
 * reads as its nearest one: you or the Bosun on Easy is the shared pair (an old save's
 * `bosunCannonWheel: true` on Easy meant "one of the two shared cards is it"); the shared pair on
 * Medium or Hard, or the Bosun on Hard, is nobody.
 */
export function cannonWheelHolder(settings: Settings): CannonWheel {
  const { cannonWheel, difficulty } = settings
  if (cannonWheelOptions(difficulty).includes(cannonWheel)) return cannonWheel
  return difficulty === 'easy' && cannonWheel !== 'none' ? 'shared' : 'none'
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

function pick<T>(value: unknown, options: readonly T[], fallback: T): T | undefined {
  if (value === undefined) return fallback
  return options.includes(value as T) ? (value as T) : undefined
}

/**
 * The Cannon + Wheel's holder from saved data. Saves and last settings from before #22 have
 * `bosunCannonWheel: boolean` instead: true is the Bosun (read as the shared pair on Easy and
 * nobody on Hard, by `cannonWheelHolder`), false is nobody.
 */
function parseCannonWheel(raw: Record<string, unknown>): CannonWheel | undefined {
  if (raw.cannonWheel !== undefined || raw.bosunCannonWheel === undefined) {
    return pick(raw.cannonWheel, CANNON_WHEEL, DEFAULT_SETTINGS.cannonWheel)
  }
  if (raw.bosunCannonWheel === true) return 'bosun'
  if (raw.bosunCannonWheel === false) return 'none'
  return undefined
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
  const cw = parseCannonWheel(raw)
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
    cannonWheel: cw,
    // Every key was checked against RULING_OPTIONS above.
    rulings: rulings as unknown as Rulings,
  }
}
