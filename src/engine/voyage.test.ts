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
    expect(order('x Bhh', { cannonWheel: 'bosun' }).pirate).toMatchObject({
      holder: 'bosun',
      cannonWheel: true,
      swap: true,
    })
    expect(order('x Bhh').pirate.swap).toBe(false)
    expect(order('x Yhh', { cannonWheel: 'bosun' }).pirate.swap).toBe(false)
  })
})

/**
 * Ruling 3 (docs/automa.md → Rulings) × who holds the Cannon + Wheel pirate (#22). `cannonWheel`
 * says the trick's winner may use its action; `swap` that the Bosun does, by the special note.
 */
describe('ruling 3: who may use the Cannon + Wheel action', () => {
  const owner = rulings({ cannonWheel: 'owner' })
  const anyWinner = rulings({ cannonWheel: 'anyWinner' })
  const pirate = (winner: 'Y' | 'B', settings: Partial<Settings>) =>
    order(`x ${winner}hh`, settings).pirate

  it('nobody holds it: nobody uses it, under either option', () => {
    for (const r of [owner, anyWinner]) {
      for (const w of ['Y', 'B'] as const) {
        expect(pirate(w, { cannonWheel: 'none', ...r })).toMatchObject({
          holder: 'none',
          cannonWheel: false,
          swap: false,
        })
      }
    }
  })

  it('only its owner, the Bosun holds it: the Bosun uses it when it wins, you don’t', () => {
    const s = { cannonWheel: 'bosun', ...owner } as const
    expect(pirate('B', s)).toMatchObject({ cannonWheel: true, swap: true })
    expect(pirate('Y', s)).toMatchObject({ cannonWheel: false, swap: false })
  })

  it('only its owner, you hold it: you use it when you win; the Bosun never swaps', () => {
    const s = { cannonWheel: 'you', ...owner } as const
    expect(pirate('Y', s)).toMatchObject({ holder: 'you', cannonWheel: true, swap: false })
    expect(pirate('B', s)).toMatchObject({ cannonWheel: false, swap: false })
  })

  it('any trick winner, the Bosun holds it: you may use it too when you win', () => {
    const s = { cannonWheel: 'bosun', ...anyWinner } as const
    expect(pirate('Y', s)).toMatchObject({ cannonWheel: true, swap: false })
    expect(pirate('B', s)).toMatchObject({ cannonWheel: true, swap: true })
  })

  it('any trick winner, you hold it: the Bosun uses yours by the special note when it wins', () => {
    const s = { cannonWheel: 'you', ...anyWinner } as const
    expect(pirate('B', s)).toMatchObject({ holder: 'you', cannonWheel: true, swap: true })
    expect(pirate('Y', s)).toMatchObject({ cannonWheel: true, swap: false })
  })

  it('Easy: in the shared pair, whoever wins may use it, under either option', () => {
    for (const r of [owner, anyWinner]) {
      const s = { difficulty: 'easy', cannonWheel: 'shared', ...r } as const
      expect(pirate('Y', s)).toMatchObject({ holder: 'shared', cannonWheel: true, swap: false })
      expect(pirate('B', s)).toMatchObject({ holder: 'shared', cannonWheel: true, swap: true })
    }
  })

  it('Easy: an old save’s Bosun holder means the shared pair', () => {
    const s = { difficulty: 'easy', cannonWheel: 'bosun' } as const
    expect(pirate('Y', s)).toMatchObject({ holder: 'shared', cannonWheel: true })
  })

  it('Hard: the Bosun can’t hold it, so a Bosun holder means nobody', () => {
    const s = { difficulty: 'hard', cannonWheel: 'bosun', ...anyWinner } as const
    expect(pirate('B', s)).toMatchObject({ holder: 'none', cannonWheel: false, swap: false })
  })

  it('Hard, you hold it: only you under its default; the Bosun swaps under any trick winner', () => {
    const hard = { difficulty: 'hard', cannonWheel: 'you' } as const
    expect(pirate('Y', { ...hard, ...owner })).toMatchObject({ cannonWheel: true, swap: false })
    expect(pirate('B', { ...hard, ...owner })).toMatchObject({
      mayUse: false,
      cannonWheel: false,
      swap: false,
    })
    expect(pirate('B', { ...hard, ...anyWinner })).toMatchObject({
      mayUse: false,
      cannonWheel: true,
      swap: true,
    })
  })

  it('Medium: the shared pair isn’t offered, so it means nobody', () => {
    expect(pirate('B', { cannonWheel: 'shared' })).toMatchObject({ holder: 'none', swap: false })
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
    const tricks = { you: 0, bosun: 0 }
    expect(shipsLog(play('x fix:4,1,1,2'))[0]).toEqual({
      kind: 'fix',
      round: 1,
      before: { round: 1, tricks, above: 6, below: 0, track: 0, playerDeck: 3 },
      after: { round: 1, tricks, above: 4, below: 1, track: 1, playerDeck: 2 },
    })
  })

  it('a fix without the round and the tricks (saved before #31) leaves them as they are', () => {
    const s = play('x Y! B! fix:4,1,1,2')
    expect(hud(s)).toMatchObject({ round: 1, tricks: { you: 1, bosun: 1 } })
  })

  it('sets the round and both trick counts (#31)', () => {
    const s = play('x Y! fix:6,0,0,3,3,2,1')
    expect(hud(s)).toMatchObject({ round: 3, tricks: { you: 2, bosun: 1 } })
    expect(currentStep(s)).toMatchObject({ kind: 'trick', round: 3, trick: 4 })
    expect(shipsLog(s)[0]).toMatchObject({
      kind: 'fix',
      round: 3,
      before: { round: 1, tricks: { you: 1, bosun: 0 } },
      after: { round: 3, tricks: { you: 2, bosun: 1 } },
    })
  })

  it('the round is I to V', () => {
    expect(hud(play('x fix:6,0,0,3,5,0,0')).round).toBe(5)
    rejects('x fix:6,0,0,3,0,0,0')
    rejects('x fix:6,0,0,3,6,0,0')
  })

  it('each trick cube shows 0 to 3 while the round is in progress', () => {
    expect(hud(play('x fix:6,0,0,3,1,3,3')).tricks).toEqual({ you: 3, bosun: 3 })
    rejects('x fix:6,0,0,3,1,4,0')
    rejects('x fix:6,0,0,3,1,0,4')
  })

  it('the tricks fit in the cards dealt: fewer than cards each before a trick', () => {
    // 24 cards, less round I's three attacks: 21, so 3 each (ruling 4), so at most 2 tricks played before the next one.
    const short = 'x fix:24,0,0,0 Y!*4 e d x'
    expect(currentStep(play(short))).toMatchObject({ kind: 'trick', round: 2 })
    expect(hud(play(`${short} fix:21,0,0,0,2,1,1`)).tricks).toEqual({ you: 1, bosun: 1 })
    rejects(`${short} fix:21,0,0,0,2,2,1`)
  })

  it('at an order, its trick is counted: the tricks may reach the cards each', () => {
    const short = 'x fix:24,0,0,0 Y!*4 e d x Y! Yhh'
    expect(hud(play(`${short} fix:21,0,0,0,2,2,1`)).tricks).toEqual({ you: 2, bosun: 1 })
    expect(step(`${short} fix:21,0,0,0,2,2,1`)).toMatchObject({
      kind: 'order',
      order: { endsRound: true },
    })
  })

  it('the tricks stay as they are once the round is ending', () => {
    // The fourth trick's order, the round end and the deal.
    for (const at of ['x Y!*3 Yhh', 'x Y!*4', 'x Y!*4 e']) {
      const t = hud(play(at)).tricks
      expect(() => play(`${at} fix:6,0,0,3,1,${t.you},${t.bosun}`), at).not.toThrow()
      rejects(`${at} fix:6,0,0,3,1,1,1`)
    }
  })

  it('never decides a win or a loss', () => {
    // Round V, with the tricks one short of the end: still a trick to play.
    expect(step('x fix:6,0,0,3,5,3,3')).toMatchObject({ kind: 'trick', round: 5, trick: 7 })
    // Round V's end loses only once its round end is done.
    expect(step('x Y!*4 fix:6,0,0,3,5,4,0')).toMatchObject({ kind: 'roundEnd', round: 5 })
    expect(step('x Y!*4 fix:6,0,0,3,5,4,0 e')).toMatchObject({ kind: 'lost', reason: 'roundFive' })
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
