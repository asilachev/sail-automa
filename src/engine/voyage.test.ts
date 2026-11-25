import { describe, expect, it } from 'vitest'
import { fromScript, parseScript } from './fixtures.ts'
import { DEFAULT_RULINGS, DEFAULT_SETTINGS, type Rulings, type Settings } from './settings.ts'
import {
  applyEvent,
  canApply,
  currentStep,
  deal,
  hud,
  newVoyage,
  replay,
  shipsLog,
  undo,
  VoyageRuleError,
  type Step,
  type VoyageState,
} from './voyage.ts'

const play = (script: string, settings: Partial<Settings> = {}) =>
  fromScript(script, settings).state
const step = (script: string, settings: Partial<Settings> = {}) =>
  currentStep(play(script, settings))
const rulings = (r: Partial<Rulings>): Partial<Settings> => ({
  rulings: { ...DEFAULT_RULINGS, ...r },
})

function order(script: string, settings: Partial<Settings> = {}) {
  const s = step(script, settings)
  if (s.kind !== 'order') throw new Error(`expected the order step, got ${s.kind}`)
  return s.order
}
function roundEnd(script: string, settings: Partial<Settings> = {}) {
  const s = step(script, settings)
  if (s.kind !== 'roundEnd') throw new Error(`expected the round end, got ${s.kind}`)
  return s
}
const rejects = (script: string, settings: Partial<Settings> = {}) =>
  expect(() => play(script, settings)).toThrow(VoyageRuleError)

/** Keep the Kraken deck at 9 cards, so a long voyage doesn't sink before the rule under test. */
const KEEP = 'fix:9,0,0,0'
const roundOdd = `x ${KEEP} Y!*4 e`
const roundEven = `x ${KEEP} B!*4 s+ e`
/** The Learning scenario has no storm after round IV. */
const roundFour = `x ${KEEP} B!*4 e`
const FOUR_ROUNDS = `${roundOdd} d ${roundEven} d ${roundOdd} d ${roundFour} d`

describe('setup (docs/rules.md → Setup; docs/automa.md → Setup)', () => {
  it('starts at round I’s exchange, with you leading', () => {
    expect(currentStep(newVoyage(DEFAULT_SETTINGS))).toEqual({
      kind: 'exchange',
      round: 1,
      leader: 'you',
      cardsEach: 9,
    })
  })

  it('starts the HUD with six Kraken cards, 3 attacks at round end and 3 cards in the deck', () => {
    expect(hud(newVoyage(DEFAULT_SETTINGS))).toEqual({
      round: 1,
      tricks: { you: 0, bosun: 0 },
      leader: 'you',
      kraken: { above: 6, below: 0, cards: 6 },
      track: 0,
      attacksAtRoundEnd: 3,
      playerDeck: 3,
      cardsEach: 9,
    })
  })
})

describe('tricks (docs/rules.md → A round)', () => {
  it('the exchange leads to trick 1, which you lead in round I', () => {
    expect(step('x')).toEqual({ kind: 'trick', round: 1, trick: 1, leader: 'you' })
  })

  it('the winner of a trick leads the next one', () => {
    expect(step('x B!')).toMatchObject({ kind: 'trick', trick: 2, leader: 'bosun' })
    expect(step('x B! Y!')).toMatchObject({ kind: 'trick', trick: 3, leader: 'you' })
  })

  it('the winner’s trick cube advances', () => {
    expect(hud(play('x B! Y! B!')).tricks).toEqual({ you: 1, bosun: 2 })
  })

  it('the round disc swaps sides: you lead rounds I, III and V, the Bosun II and IV', () => {
    expect(step(`${roundOdd} d x`)).toMatchObject({ round: 2, leader: 'bosun' })
    expect(step(`${roundOdd} d ${roundEven} d x`)).toMatchObject({ round: 3, leader: 'you' })
    expect(step(`${FOUR_ROUNDS} x`)).toMatchObject({ round: 5, leader: 'you' })
  })

  it('the round ends when a player wins their fourth trick', () => {
    expect(step('x Y! B!*3')).toMatchObject({ kind: 'trick', trick: 5 })
    expect(step('x Y! B!*4').kind).toBe('roundEnd')
  })

  it('a new deal resets the trick cubes and moves the round disc', () => {
    expect(step(`x ${KEEP} Y!*4`).kind).toBe('roundEnd')
    expect(step(roundOdd)).toEqual({ kind: 'deal', round: 2, leader: 'bosun', cardsEach: 9 })
    expect(hud(play(roundOdd)).tricks).toEqual({ you: 0, bosun: 0 })
    expect(step(`${roundOdd} d`)).toMatchObject({ kind: 'exchange', round: 2 })
  })

  it('takes events only in their step', () => {
    rejects('Y!')
    rejects('x x')
    rejects('x .')
    rejects('x Yhh x')
    rejects('d')
  })
})

describe('the order (docs/rules.md → Actions)', () => {
  it('asks where the ship moved when the order moves it, before order done', () => {
    const o = order('x Yhh')
    expect(o).toMatchObject({ move: 'towardWinner', winner: 'you', asksToken: true })
    expect(o.awaiting).toBe('ship')
    rejects('x Yhh .')
    expect(step('x Yhh @o .')).toMatchObject({ kind: 'trick', trick: 2, leader: 'you' })
  })

  it('moves toward the winner, whoever wins', () => {
    expect(order('x Bhh')).toMatchObject({ move: 'towardWinner', winner: 'bosun' })
  })

  it('Tail + Tail moves straight and asks the token', () => {
    expect(order('x Btt')).toMatchObject({ move: 'straight', awaiting: 'ship' })
  })

  it('a pair with no action asks nothing and goes on', () => {
    const o = order('x Yht')
    expect(o).toMatchObject({ move: 'none', attacks: 0, asksToken: false, awaiting: null })
    rejects('x Yht @o')
  })

  it('Helm & Kraken + Helm: the Kraken damages the ship once, even if the ship fails to move', () => {
    const o = order('x Bkh @o')
    expect(o.attacks).toBe(1)
    expect(o.attackEffects).toEqual([{ kind: 'discard', above: 5, below: 0 }])
    expect(hud(play('x Bkh @o .')).kraken.above).toBe(5)
  })

  it('Helm & Kraken + Helm & Kraken: the Kraken damages the ship twice', () => {
    expect(order('x Ykk').attacks).toBe(2)
    expect(hud(play('x Ykk @o .')).kraken.above).toBe(4)
  })

  it('a Kraken token: after moving onto it, the Kraken damages the ship once more', () => {
    expect(order('x Ykk @k').attacks).toBe(3)
    expect(hud(play('x Yhh @k .')).kraken.above).toBe(5)
  })

  it('Helm & Kraken + Cannon puts the card at the bottom of the Kraken deck', () => {
    const o = order('x Ykc')
    expect(o).toMatchObject({ krakenHit: true, toKrakenDeck: 1, move: 'none', awaiting: null })
    expect(hud(play('x Ykc .')).kraken).toEqual({ above: 6, below: 1, cards: 7 })
  })

  it('shows the pair and the trick number', () => {
    expect(step('x B! Yhk')).toMatchObject({
      kind: 'order',
      trick: 2,
      order: { yours: 'helm', bosuns: 'helmKraken' },
    })
  })
})

describe('Cannon + Cannon (docs/rules.md → Actions, Cannon actions)', () => {
  it('asks for the flipped card’s symbol', () => {
    const o = order('x Ycc')
    expect(o.awaiting).toBe('flip')
    expect(o.cannon).toEqual({ flips: [], needed: true, deckLeft: 3, emptyDeck: false })
    rejects('x Ycc .')
  })

  it('a flipped Tail moves straight, then asks the token', () => {
    const o = order('x Ycc ft')
    expect(o).toMatchObject({ move: 'straight', awaiting: 'ship' })
    expect(o.cannon).toMatchObject({ flips: ['tail'], needed: false, deckLeft: 2 })
  })

  it('a flipped Helm moves toward the winner', () => {
    expect(order('x Bcc fh')).toMatchObject({ move: 'towardWinner', winner: 'bosun' })
  })

  it('a flipped Helm & Kraken goes to the bottom of the Kraken deck', () => {
    const o = order('x Ycc fk')
    expect(o).toMatchObject({ move: 'none', toKrakenDeck: 1, awaiting: null })
    expect(hud(play('x Ycc fk .')).kraken.below).toBe(1)
  })

  it('a flipped Cannon flips another card, in a chain', () => {
    expect(order('x Ycc fc').awaiting).toBe('flip')
    const o = order('x Ycc fc fh')
    expect(o.cannon).toMatchObject({ flips: ['cannon', 'helm'], deckLeft: 1 })
    expect(o.move).toBe('towardWinner')
  })

  it('each flip takes a card from the player deck', () => {
    expect(hud(play('x Ycc fc fh @o .')).playerDeck).toBe(1)
  })

  it('stops when the player deck runs out mid-chain', () => {
    const o = order('x Ycc fc fc fc')
    expect(o.cannon).toEqual({
      flips: ['cannon', 'cannon', 'cannon'],
      needed: false,
      deckLeft: 0,
      emptyDeck: true,
    })
    expect(o).toMatchObject({ move: 'none', awaiting: null })
    rejects('x Ycc fc fc fc fh')
  })

  it('has no effect with an empty player deck', () => {
    const o = order('x fix:6,0,0,0 Ycc')
    expect(o.cannon).toEqual({ flips: [], needed: false, deckLeft: 0, emptyDeck: true })
    expect(o.awaiting).toBeNull()
    rejects('x fix:6,0,0,0 Ycc fh')
  })

  it('takes a flip only when one is due', () => {
    rejects('x Yhh fh')
    rejects('x Ycc ft fh')
  })
})

describe('winning and losing (docs/rules.md → Winning and losing)', () => {
  it('wins when the ship sails onto the End token', () => {
    expect(order('x Yhh @e').outcome).toEqual({ outcome: 'won', reason: 'end', round: 1 })
    expect(step('x Yhh @e .')).toEqual({ kind: 'won', round: 1, reason: 'end' })
  })

  it('if an action makes you both win and lose, you win', () => {
    // One card left: two attacks would leave the Kraken card alone.
    expect(step('x fix:1,0,0,3 Bkk @o .')).toMatchObject({ kind: 'lost', reason: 'krakenAlone' })
    expect(step('x fix:1,0,0,3 Bkk @e .')).toMatchObject({ kind: 'won', reason: 'end' })
  })

  it('loses when the Kraken card is the only card left in the Kraken deck', () => {
    expect(step('x Bkk @k . B!*3 e')).toEqual({ kind: 'lost', round: 1, reason: 'krakenAlone' })
  })

  it('loses when the Kraken meeple moves onto the skull', () => {
    expect(step('x fix:0,4,3,3 Bkh @o .')).toEqual({ kind: 'lost', round: 1, reason: 'skull' })
  })

  it('loses when round V ends', () => {
    const s = roundEnd(`${FOUR_ROUNDS} x ${KEEP} Y!*4`)
    expect(s.round).toBe(5)
    expect(s.storm).toBeNull()
    expect(s.outcome).toEqual({ outcome: 'lost', reason: 'roundFive', round: 5 })
    expect(step(`${FOUR_ROUNDS} x ${KEEP} Y!*4 e`)).toEqual({
      kind: 'lost',
      round: 5,
      reason: 'roundFive',
    })
  })

  it('ends the voyage: no more events', () => {
    rejects('x Yhh @e . x')
    rejects('x Yhh @e . fix:6,0,0,3')
  })
})

describe('round end (docs/rules.md → A round, phase 4)', () => {
  it('the Kraken attacks as many times as the number under its meeple', () => {
    const s = roundEnd('x Y!*4')
    expect(s.attacks).toBe(3)
    expect(s.attackEffects).toEqual([
      { kind: 'discard', above: 5, below: 0 },
      { kind: 'discard', above: 4, below: 0 },
      { kind: 'discard', above: 3, below: 0 },
    ])
    expect(hud(play('x Y!*4 e')).kraken.above).toBe(3)
  })

  it('uses the number when the round ends, even if the meeple moves during the attacks', () => {
    // On the second 3 with the Kraken card on top: it moves to the 4, yet only 3 attacks follow.
    const s = roundEnd('x fix:0,5,1,3 Y!*4')
    expect(s.attacks).toBe(3)
    expect(s.attackEffects.map((e) => e.kind)).toEqual(['krakenCard', 'discard', 'discard'])
    expect(s.track).toBe(2)
    expect(hud(play('x fix:0,5,1,3 Y!*4 e')).attacksAtRoundEnd).toBe(4)
  })

  it('lists the attacks, and the loss that stops them', () => {
    const s = roundEnd('x Bkk @k . B!*3')
    expect(s.attackEffects).toHaveLength(3)
    expect(s.outcome).toMatchObject({ reason: 'krakenAlone' })
    expect(s.storm).toBeNull()
  })
})

describe('storm checks (docs/rules.md → Hazards; docs/automa.md → The engine’s model)', () => {
  const roundTwoEnd = `${roundOdd} d x ${KEEP} B!*4`

  it('asks after round II, naming the first storm’s column', () => {
    const s = roundEnd(roundTwoEnd, { scenario: 4 })
    expect(s.storm).toEqual({ index: 0, column: 9, passed: null })
    expect(s.ready).toBe(false)
    rejects(`${roundTwoEnd} e`)
  })

  it('goes on to round III when the ship is past the storm', () => {
    expect(roundEnd(`${roundTwoEnd} s+`).storm).toMatchObject({ passed: true })
    expect(step(`${roundTwoEnd} s+ e`)).toMatchObject({ kind: 'deal', round: 3 })
  })

  it('loses behind a storm', () => {
    expect(roundEnd(`${roundTwoEnd} s-`).outcome).toEqual({
      outcome: 'lost',
      reason: 'storm',
      round: 2,
    })
    expect(step(`${roundTwoEnd} s- e`)).toEqual({ kind: 'lost', round: 2, reason: 'storm' })
  })

  it('asks after round IV, naming the second storm’s column', () => {
    const end4 = `${roundOdd} d ${roundEven} d ${roundOdd} d x ${KEEP} B!*4`
    expect(roundEnd(end4, { scenario: 1 }).storm).toEqual({ index: 1, column: 12, passed: null })
  })

  it('has only one storm in the Learning scenario, checked after round II', () => {
    const end4 = `${roundOdd} d ${roundEven} d ${roundOdd} d x ${KEEP} B!*4`
    expect(roundEnd(end4, { scenario: 'learning' }).storm).toBeNull()
    expect(roundEnd(`${roundOdd} d x ${KEEP} B!*4`).storm).toMatchObject({ column: 5 })
  })

  it('doesn’t ask after rounds I, III and V', () => {
    expect(roundEnd('x Y!*4').storm).toBeNull()
    rejects('x Y!*4 s+')
    expect(roundEnd(`${roundOdd} d ${roundEven} d x ${KEEP} Y!*4`).storm).toBeNull()
  })

  it('doesn’t ask when the round’s attacks already sank the ship', () => {
    const s = roundEnd(`${roundOdd} d x fix:2,0,0,3 B!*4`)
    expect(s.storm).toBeNull()
    expect(s.outcome).toMatchObject({ reason: 'krakenAlone' })
  })
})

describe('the deal (docs/automa.md → The engine’s model; ruling 4)', () => {
  it('deals 9 each from the cards outside the Kraken deck', () => {
    expect(deal({ above: 6, below: 0, track: 0 })).toEqual({ cardsEach: 9, playerDeck: 3 })
    expect(deal({ above: 3, below: 2, track: 0 })).toEqual({ cardsEach: 9, playerDeck: 4 })
  })

  it('ruling 4: too few cards to deal 9 each, deals evenly as far as the deck goes', () => {
    expect(deal({ above: 11, below: 0, track: 0 })).toEqual({ cardsEach: 8, playerDeck: 0 })
    expect(deal({ above: 6, below: 6, track: 1 })).toEqual({ cardsEach: 7, playerDeck: 1 })
    const s = play('x fix:14,0,0,3 Y!*4 e')
    expect(currentStep(s)).toMatchObject({ kind: 'deal', cardsEach: 8 })
    expect(hud(s).playerDeck).toBe(0)
  })

  it('ends a short round when the hands run out before anyone wins four tricks', () => {
    const r2 = 'x fix:24,0,0,3 Y!*4 e d x'
    expect(hud(play(r2)).cardsEach).toBe(3)
    expect(step(`${r2} B! Y!`).kind).toBe('trick')
    expect(step(`${r2} B! Y! B!`).kind).toBe('roundEnd')
  })
})

describe('Pirate cards (docs/automa.md → Difficulty; rulings 2 and 3)', () => {
  it('Easy and Medium: the trick’s winner may use a Pirate card', () => {
    for (const difficulty of ['easy', 'medium'] as const) {
      expect(order('x Bhh', { difficulty }).pirate.mayUse).toBe(true)
      expect(order('x Yhh', { difficulty }).pirate.mayUse).toBe(true)
    }
  })

  it('Hard: only you have one; the Bosun has none', () => {
    expect(order('x Yhh', { difficulty: 'hard' }).pirate.mayUse).toBe(true)
    expect(order('x Bhh', { difficulty: 'hard' }).pirate.mayUse).toBe(false)
  })

  it('ruling 2: you decide for the Bosun when it wins the trick', () => {
    expect(order('x Bhh').pirate.decidedBy).toBe('you')
  })

  it('offers the Cannon + Wheel swap when the Bosun wins and has that pirate', () => {
    expect(order('x Bhh', { bosunCannonWheel: true }).pirate).toMatchObject({
      cannonWheel: true,
      swap: true,
    })
    expect(order('x Bhh').pirate.swap).toBe(false)
    expect(order('x Yhh', { bosunCannonWheel: true }).pirate.swap).toBe(false)
    expect(order('x Bhh', { bosunCannonWheel: true, difficulty: 'hard' }).pirate.swap).toBe(false)
  })

  it('ruling 3, default: only its owner uses the Cannon + Wheel action', () => {
    expect(order('x Yhh', { bosunCannonWheel: true }).pirate.cannonWheel).toBe(false)
  })

  it('ruling 3, alternative: any trick winner may use it', () => {
    const s = { bosunCannonWheel: true, ...rulings({ cannonWheel: 'anyWinner' }) }
    expect(order('x Yhh', s).pirate.cannonWheel).toBe(true)
  })

  it('Easy shares the Cannon + Wheel pirate with whoever wins', () => {
    const s = { bosunCannonWheel: true, difficulty: 'easy' } as const
    expect(order('x Yhh', s).pirate).toMatchObject({ cannonWheel: true, swap: false })
  })
})

describe('ruling 1: the ship sails past the End token', () => {
  it('default: you lose', () => {
    expect(step('x Ytt @p .')).toEqual({ kind: 'lost', round: 1, reason: 'pastEnd' })
  })

  it('alternative: nothing happens', () => {
    expect(step('x Ytt @p .', rulings({ pastEnd: 'nothing' }))).toMatchObject({
      kind: 'trick',
      trick: 2,
    })
  })
})

describe('ruling 5: the fourth trick’s action', () => {
  const fourth = 'x Y!*3 Yhh'

  it('default: resolve it, then end the round', () => {
    expect(order(fourth)).toMatchObject({ endsRound: true, awaiting: 'ship' })
    expect(step(`${fourth} @o .`).kind).toBe('roundEnd')
    expect(step('x Y!*3 Yhh @e .').kind).toBe('won')
  })

  it('alternative: end the round first, skipping the action', () => {
    const s = play(fourth, rulings({ fourthTrick: 'endFirst' }))
    expect(currentStep(s).kind).toBe('roundEnd')
    expect(shipsLog(s)[0]).toMatchObject({ kind: 'trick', trick: 4, skipped: true, move: 'none' })
  })

  it('alternative: earlier tricks still resolve', () => {
    expect(step('x Yhh', rulings({ fourthTrick: 'endFirst' })).kind).toBe('order')
  })
})

describe('fix the trackers (design D5)', () => {
  it('sets the Kraken deck, the track and the player deck', () => {
    const h = hud(play('x fix:4,1,1,2'))
    expect(h.kraken).toEqual({ above: 4, below: 1, cards: 5 })
    expect(h.track).toBe(1)
    expect(h.playerDeck).toBe(2)
  })

  it('logs what changed', () => {
    expect(shipsLog(play('x fix:4,1,1,2'))[0]).toEqual({
      kind: 'fix',
      round: 1,
      before: { above: 6, below: 0, track: 0, playerDeck: 3 },
      after: { above: 4, below: 1, track: 1, playerDeck: 2 },
    })
  })

  it('works at any step of a voyage in progress', () => {
    expect(currentStep(play('x Yhh fix:4,1,1,2')).kind).toBe('order')
  })

  it('rejects trackers the table can’t have', () => {
    rejects('fix:0,0,0,3')
    rejects('fix:6,0,4,3')
    rejects('fix:20,5,0,3')
    expect(() =>
      applyEvent(newVoyage(DEFAULT_SETTINGS), {
        type: 'fix',
        above: -1,
        below: 0,
        track: 0,
        playerDeck: 0,
      }),
    ).toThrow(VoyageRuleError)
  })
})

describe('the ship’s log (design D4)', () => {
  it('lists entries newest first, as data', () => {
    const log = shipsLog(play('x Bkh @k . Y!'))
    expect(log.map((e) => e.kind)).toEqual(['trick', 'trick', 'exchange'])
    expect(log[1]).toEqual({
      kind: 'trick',
      round: 1,
      trick: 1,
      winner: 'bosun',
      yours: 'helmKraken',
      bosuns: 'helm',
      flips: [],
      move: 'towardWinner',
      onto: 'kraken',
      toKrakenDeck: 0,
      attacks: [
        { kind: 'discard', above: 5, below: 0 },
        { kind: 'discard', above: 4, below: 0 },
      ],
      skipped: false,
    })
  })

  it('logs the round end, the storm, the deal and the result', () => {
    const kinds = shipsLog(play(`${roundOdd} d x ${KEEP} B!*4 s- e`)).map((e) => e.kind)
    expect(kinds.slice(0, 4)).toEqual(['result', 'storm', 'roundEnd', 'trick'])
    expect(kinds).toContain('deal')
  })
})

describe('the engine’s model (docs/automa.md)', () => {
  it('a voyage is a pure function of its settings and events', () => {
    const events = parseScript('x Bkh @k . Ycc fc fh @o . Y!')
    expect(replay(DEFAULT_SETTINGS, events)).toEqual(replay(DEFAULT_SETTINGS, events))
  })

  it('undo drops the last event', () => {
    const events = parseScript('x Yhh @o')
    expect(replay(DEFAULT_SETTINGS, undo(events))).toEqual(play('x Yhh'))
  })

  it('canApply says whether an event is allowed now', () => {
    const s: VoyageState = play('x')
    expect(canApply(s, { type: 'exchange' })).toBe(false)
    expect(canApply(s, { type: 'trick', winner: 'you', yours: 'helm', bosuns: 'tail' })).toBe(true)
  })

  it('every step has a kind the UI renders', () => {
    const kinds: Step['kind'][] = [
      step('').kind,
      step('x').kind,
      step('x Yhh').kind,
      step('x Y!*4').kind,
      step('x Y!*4 e').kind,
      step('x Yhh @e .').kind,
      step('x Ytt @p .').kind,
    ]
    expect(kinds).toEqual(['exchange', 'trick', 'order', 'roundEnd', 'deal', 'won', 'lost'])
  })
})
