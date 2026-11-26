import {
  shipsLog,
  TRACK,
  type AttackEffect,
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
          detail: trickDetail(t, e, entries.slice(i + 1)),
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
          detail: fixDetail(t, e),
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

/** The trackers after a fix; the round and the tricks first when the fix changed them (#31). */
function fixDetail(t: Translate, e: Extract<LogEntry, { kind: 'fix' }>): string {
  const { before, after } = e
  const kraken = t('shipsLog.fixDetail', {
    above: after.above,
    below: after.below,
    attacks: String(TRACK[after.track]),
    deck: after.playerDeck,
  })
  const roundTricks =
    before.round !== after.round ||
    before.tricks.you !== after.tricks.you ||
    before.tricks.bosun !== after.tricks.bosun
  if (!roundTricks) return kraken
  const head = t('shipsLog.fixRound', {
    round: numeral(after.round),
    you: after.tricks.you,
    bosun: after.tricks.bosun,
  })
  return `${head} · ${kraken}`
}

function trickDetail(
  t: Translate,
  e: Extract<LogEntry, { kind: 'trick' }>,
  older: readonly LogEntry[],
): string {
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
  if (e.attacks.length > 0) {
    parts.push(krakenMoved(t, e.attacks, older) ?? t('shipsLog.attacks', { n: e.attacks.length }))
  }
  if (parts.length === 1) parts.push(t('shipsLog.move', { move: 'none' }))
  return parts.join(' · ')
}

/** A round end's title: "Kraken ×3", with the Kraken's move when its card came up. */
function roundEndTitle(
  t: Translate,
  e: Extract<LogEntry, { kind: 'roundEnd' }>,
  older: readonly LogEntry[],
): string {
  return krakenMoved(t, e.attacks, older) ?? t('shipsLog.roundEnd', { n: e.attacks.length })
}

/**
 * "Kraken ×3, then it moved one space along its track: still 3 attacks", or null when the
 * Kraken card didn't come up. The track reads 3, 3, 4, 5, skull, so the first move keeps 3
 * attacks, and "3× → 3×" read as if nothing happened (#36). The track before is replayed from
 * the older entries: the setup's space, moved by every Kraken card that came up before.
 */
function krakenMoved(
  t: Translate,
  attacks: readonly AttackEffect[],
  older: readonly LogEntry[],
): string | null {
  const moves = attacks.filter((a) => a.kind === 'krakenCard')
  const last = moves[moves.length - 1]
  if (!last || last.kind !== 'krakenCard') return null
  const from = TRACK[trackBefore(older)]
  const to = TRACK[last.track]
  return t('shipsLog.krakenMoved', {
    n: attacks.length,
    spaces: moves.length,
    change: to === 'skull' ? 'skull' : to === from ? 'same' : 'more',
    attacks: to === 'skull' ? 0 : to,
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
