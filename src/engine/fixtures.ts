/**
 * Build any voyage state from a short script of events, for tests, screenshots and the design
 * (AGENTS.md → Phone-first PWA → Any state from a fixture). Made-up play only.
 *
 * A script is tokens separated by spaces:
 *
 * | Token          | Event                                                                 |
 * | -------------- | --------------------------------------------------------------------- |
 * | `x`            | exchange done                                                         |
 * | `Yht`, `Bkc`   | a trick: Y (you) or B (the Bosun) won; your symbol, then the Bosun's  |
 * | `Y!`, `B!`     | a quiet trick (tail + cannon: no action) and its order done           |
 * | `fh`           | a cannon flip showing that symbol                                     |
 * | `@o @k @e @p`  | the ship moved onto open sea, a Kraken token, the End token, past it  |
 * | `.`            | order done                                                            |
 * | `s+`, `s-`     | storm check: passed, not passed                                       |
 * | `e`            | round end done                                                        |
 * | `d`            | new deal done                                                         |
 * | `fix:a,b,t,p`  | fix the trackers: above, below, track (0–3), player deck              |
 * | `fix:a,b,t,p,r,y,b` | the same, and the round (1–5) and the tricks, yours and the Bosun's |
 *
 * Symbols: `h` helm, `k` helm & kraken, `t` tail, `c` cannon. Any token takes `*n` to repeat it:
 * `Y!*4` is four quiet tricks you win.
 */
import type { TrackIndex } from './kraken.ts'
import type { CardSymbol } from './orders.ts'
import { DEFAULT_SETTINGS, type Settings } from './settings.ts'
import {
  replay,
  type FixEvent,
  type Round,
  type Side,
  type Token,
  type VoyageEvent,
  type VoyageState,
} from './voyage.ts'

const SYMBOL: Readonly<Record<string, CardSymbol>> = {
  h: 'helm',
  k: 'helmKraken',
  t: 'tail',
  c: 'cannon',
}
const SIDE: Readonly<Record<string, Side>> = { Y: 'you', B: 'bosun' }
const TOKEN: Readonly<Record<string, Token>> = { o: 'open', k: 'kraken', e: 'end', p: 'past' }

function symbolOf(letter: string | undefined, token: string): CardSymbol {
  const s = letter === undefined ? undefined : SYMBOL[letter]
  if (!s) throw new Error(`Unknown symbol in "${token}"`)
  return s
}

function parseToken(token: string): VoyageEvent[] {
  const quiet = /^([YB])!$/.exec(token)
  if (quiet) {
    const winner = SIDE[quiet[1]!]!
    return [{ type: 'trick', winner, yours: 'tail', bosuns: 'cannon' }, { type: 'orderDone' }]
  }
  const trick = /^([YB])([hktc])([hktc])$/.exec(token)
  if (trick) {
    return [
      {
        type: 'trick',
        winner: SIDE[trick[1]!]!,
        yours: symbolOf(trick[2], token),
        bosuns: symbolOf(trick[3], token),
      },
    ]
  }
  const fix = /^fix:(\d+),(\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?$/.exec(token)
  if (fix) {
    const [above, below, track, playerDeck] = fix.slice(1, 5).map(Number) as [
      number,
      number,
      number,
      number,
    ]
    const event: FixEvent = { type: 'fix', above, below, track: track as TrackIndex, playerDeck }
    if (fix[5] === undefined) return [event]
    const [round, you, bosun] = fix.slice(5).map(Number) as [number, number, number]
    return [{ ...event, round: round as Round, tricks: { you, bosun } }]
  }
  if (/^f[hktc]$/.test(token)) return [{ type: 'flip', symbol: symbolOf(token[1], token) }]
  const ship = /^@([okep])$/.exec(token)
  if (ship) return [{ type: 'ship', onto: TOKEN[ship[1]!]! }]
  switch (token) {
    case 'x':
      return [{ type: 'exchange' }]
    case '.':
      return [{ type: 'orderDone' }]
    case 's+':
      return [{ type: 'storm', passed: true }]
    case 's-':
      return [{ type: 'storm', passed: false }]
    case 'e':
      return [{ type: 'roundEndDone' }]
    case 'd':
      return [{ type: 'dealt' }]
  }
  throw new Error(`Unknown script token "${token}"`)
}

/** The events a script stands for. Throws on an unknown token. */
export function parseScript(script: string): VoyageEvent[] {
  return script
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((raw) => {
      const [token = '', times] = raw.split('*')
      const n = times === undefined ? 1 : Number(times)
      if (!Number.isInteger(n) || n < 1) throw new Error(`Bad repeat in "${raw}"`)
      return Array.from({ length: n }, () => parseToken(token)).flat()
    })
}

export interface ScriptedVoyage {
  readonly settings: Settings
  readonly events: readonly VoyageEvent[]
  readonly state: VoyageState
}

/** A voyage from a script, replayed. Throws if the rules don't allow its events. */
export function fromScript(script: string, settings: Partial<Settings> = {}): ScriptedVoyage {
  const full: Settings = { ...DEFAULT_SETTINGS, ...settings }
  const events = parseScript(script)
  return { settings: full, events, state: replay(full, events) }
}

/** A quiet round you win four tricks to nothing, from the exchange to the round end. */
export const QUIET_ROUND = 'x Y!*4'
/**
 * Round I with two hits on the Kraken (Helm & Kraken + Cannon), so the Kraken deck lasts past
 * round II's attacks: 8 cards, then 5 after round I's three attacks.
 */
export const KRAKEN_HIT_ROUND = 'x Ykc . Ykc . Y!*2'

/** Named fixtures, one per screen state, for UI tests and screenshots. */
export const FIXTURES = {
  /** Round I's exchange: where a new voyage starts. */
  exchange: { script: '' },
  /** Trick 1, you lead. */
  trickYouLead: { script: 'x' },
  /** Trick 2: the Bosun won trick 1, so it leads. */
  trickBosunLeads: { script: 'x B!' },
  /** Helm + Helm: move toward you; did the ship land on a token? */
  orderMove: { script: 'x Yhh' },
  /** Helm & Kraken + Helm won by the Bosun: move toward it, then one attack. */
  orderAttack: { script: 'x Bkh' },
  /** Helm & Kraken + Cannon: the card goes to the bottom of the Kraken deck. */
  orderKrakenHit: { script: 'x Ykc' },
  /** Cannon + Cannon: flip the top card of the player deck. */
  cannonFlip: { script: 'x Ycc' },
  /** Cannon + Cannon, then Tail: move straight; did the ship land on a token? */
  cannonTail: { script: 'x Ycc ft' },
  /** The Bosun won and has the Cannon + Wheel pirate: offer its swap. */
  bosunCannonWheel: { script: 'x Bhh', settings: { cannonWheel: 'bosun' } },
  /** The Bosun won on Hard, you hold the Cannon + Wheel, any winner may use it: its swap. */
  yourCannonWheelAnyWinner: {
    script: 'x Bhh',
    settings: {
      difficulty: 'hard',
      cannonWheel: 'you',
      rulings: { ...DEFAULT_SETTINGS.rulings, cannonWheel: 'anyWinner' },
    },
  },
  /** Round I ends: three attacks, no storm check. */
  roundEnd: { script: QUIET_ROUND },
  /** Round II ends: attacks, then the storm check. */
  roundEndStorm: { script: `${KRAKEN_HIT_ROUND} e d x B!*4`, settings: { scenario: 3 } },
  /** Round II's deal: the Bosun leads. */
  deal: { script: `${QUIET_ROUND} e` },
  /** Won: the ship reached the End token in round I. */
  won: { script: 'x Yhh @e .' },
  /** Lost: only the Kraken card left in the Kraken deck. */
  lostKrakenAlone: { script: 'x Bkk @k . B!*3 e' },
  /** Lost: behind the storm at the end of round II. */
  lostStorm: { script: `${KRAKEN_HIT_ROUND} e d x B!*4 s- e` },
  /** Lost: the ship sailed past the End token (ruling 1's default). */
  lostPastEnd: { script: 'x Ytt @p .' },
  /** The trackers fixed by hand during trick 1. */
  fixed: { script: 'x fix:4,1,1,3' },
  /** The round and the tricks fixed by hand: round III, trick 5 after 2 tricks each. */
  fixedRound: { script: 'x Y!*2 fix:6,0,0,3,3,2,2' },
} as const satisfies Record<string, { script: string; settings?: Partial<Settings> }>

export type FixtureName = keyof typeof FIXTURES

export function fixture(name: FixtureName): ScriptedVoyage {
  const f: { script: string; settings?: Partial<Settings> } = FIXTURES[name]
  return fromScript(f.script, f.settings)
}
