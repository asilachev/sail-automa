import {
  shipsLog,
  TRACK,
  type CardSymbol,
  type LogEntry,
  type TrackIndex,
  type VoyageState,
} from '../../engine/index.ts'
import { numeral } from '../components/index.ts'
import type { Translate } from '../i18n/index.ts'
import { pairName } from './words.ts'

/** D4 · Ship's log as rows: the engine's `shipsLog(state)`, translated. */
export interface LogRow {
  readonly key: string
  readonly code: string
  readonly title: string
  readonly detail: string
  readonly symbols?: readonly [CardSymbol, CardSymbol]
}

/** The log as rows, newest first, with a new deal and its exchange (and a round end and its
 * storm check) shown as one row each, as D4 draws them. */
export function logRows(t: Translate, state: VoyageState): LogRow[] {
  const entries = shipsLog(state)
  const rows: LogRow[] = []
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]!
    const older = entries[i + 1]
    const key = String(entries.length - i)
    const round = numeral(e.round)
    switch (e.kind) {
      case 'exchange': {
        const dealt = older?.kind === 'deal' && older.round === e.round
        if (dealt) i++
        rows.push({
          key,
          code: round,
          title: t(dealt ? 'shipsLog.dealExchange' : 'shipsLog.exchange'),
          detail: t('shipsLog.leads', { side: e.round % 2 === 1 ? 'you' : 'bosun' }),
        })
        break
      }
      case 'deal':
        rows.push({
          key,
          code: round,
          title: t('shipsLog.deal'),
          detail: t('shipsLog.cardsEach', { n: e.cardsEach }),
        })
        break
      case 'trick':
        rows.push({
          key,
          code: t('shipsLog.codeTrick', { round, n: e.trick }),
          title: pairName(t, e.yours, e.bosuns, e.flips),
          detail: trickDetail(t, e),
          symbols: [e.yours, e.bosuns],
        })
        break
      case 'storm': {
        // Newest first: the storm check comes just before its round end.
        const end = older?.kind === 'roundEnd' && older.round === e.round ? older : null
        if (end) i++
        rows.push({
          key,
          code: t('shipsLog.codeEnd', { round }),
          title: end ? roundEndTitle(t, end, entries.slice(i + 1)) : t('shipsLog.storm'),
          detail: t(e.passed ? 'shipsLog.stormPassed' : 'shipsLog.stormFailed', {
            column: e.column,
          }),
        })
        break
      }
      case 'roundEnd':
        rows.push({
          key,
          code: t('shipsLog.codeEnd', { round }),
          title: roundEndTitle(t, e, entries.slice(i + 1)),
          detail: t('shipsLog.noStorm'),
        })
        break
      case 'fix':
        rows.push({
          key,
          code: t('shipsLog.codeFix', { round }),
          title: t('shipsLog.fixTitle'),
          detail: t('shipsLog.fixDetail', {
            above: e.after.above,
            below: e.after.below,
            attacks: String(TRACK[e.after.track]),
            deck: e.after.playerDeck,
          }),
        })
        break
      case 'result':
        rows.push({
          key,
          code: round,
          title: t(e.result.outcome === 'won' ? 'shipsLog.won' : 'shipsLog.lost'),
          detail: t('shipsLog.reason', { reason: e.result.reason }),
        })
        break
    }
  }
  return rows
}

function trickDetail(t: Translate, e: Extract<LogEntry, { kind: 'trick' }>): string {
  const parts = [t('shipsLog.took', { side: e.winner })]
  if (e.skipped) {
    parts.push(t('shipsLog.skipped'))
    return parts.join(' · ')
  }
  const krakenHit = e.toKrakenDeck > 0 && e.flips.length === 0
  if (krakenHit) parts.push(t('shipsLog.krakenHit'))
  else if (e.toKrakenDeck > 0) parts.push(t('shipsLog.toKraken', { n: e.toKrakenDeck }))
  const move =
    e.move === 'towardWinner' ? (e.winner === 'you' ? 'towardYou' : 'towardBosun') : e.move
  if (move !== 'none') parts.push(t('shipsLog.move', { move }))
  if (e.onto && e.onto !== 'open') parts.push(t('shipsLog.onto', { token: e.onto }))
  if (e.attacks.length > 0) parts.push(t('shipsLog.attacks', { n: e.attacks.length }))
  if (parts.length === 1) parts.push(t('shipsLog.move', { move: 'none' }))
  return parts.join(' · ')
}

/**
 * "Kraken ×3, its card cycled: 3× → 4×". The track before the round end is replayed from the
 * older entries: the setup's space, moved by every Kraken card that came up before.
 */
function roundEndTitle(
  t: Translate,
  e: Extract<LogEntry, { kind: 'roundEnd' }>,
  older: readonly LogEntry[],
): string {
  const cycled = e.attacks.filter((a) => a.kind === 'krakenCard')
  const last = cycled[cycled.length - 1]
  if (!last || last.kind !== 'krakenCard') return t('shipsLog.roundEnd', { n: e.attacks.length })
  const before = trackBefore(older)
  const from = TRACK[before]
  const to = TRACK[last.track]
  return t('shipsLog.roundEndCycled', {
    n: e.attacks.length,
    from: t('roundEnd.times', { n: String(from) }),
    to: to === 'skull' ? t('hud.skull') : t('roundEnd.times', { n: String(to) }),
  })
}

/** The Kraken's space before the older entries' last change: setup (0), or the latest move. */
function trackBefore(older: readonly LogEntry[]): TrackIndex {
  // `older` is newest first.
  for (const e of older) {
    if (e.kind === 'fix') return e.after.track
    const attacks = e.kind === 'trick' || e.kind === 'roundEnd' ? e.attacks : []
    for (let i = attacks.length - 1; i >= 0; i--) {
      const a = attacks[i]!
      if (a.kind === 'krakenCard') return a.track
    }
  }
  return 0
}
