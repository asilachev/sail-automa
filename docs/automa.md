# Sail Solitaire: the Bosun

The app runs **Sail Solitaire**, Chuck Rosselli's fan solo variant of Sail
([`reference/sail-automa.pdf`](reference/sail-automa.pdf), 1 page, 11/10/2023; on BoardGameGeek
as [Sail Solo Variant](https://boardgamegeek.com/filepage/268364/sail-solo-variant)). The variant's
Dummy Player becomes **the Bosun**, a silent crewmate on the other side of the ship. Chuck Rosselli
agreed to the app and is credited wherever credits appear (docs/decisions.md, 2026-11-25).

The official rules are in [`rules.md`](rules.md). Every gap the variant leaves is a ruling below:
a setting with a default. Never change a default silently.

## What the app does, and what the table keeps

- **The app:** the Bosun's procedure (the exchange, flipping until it follows, leading with its
  top card, putting flipped cards back in order, its Cannon + Wheel swap); the order for each pair
  of symbols; the bookkeeping (tricks, rounds, who leads, the Kraken deck and its card, round-end
  attacks, storm checks, win and loss); the captain's log.
- **The table:** the board, the cards, the ship and the Pirate cards' texts. The app stores no
  card, only the symbols the user taps. It reminds who may use a Pirate card, and Fix the trackers
  lets the user match the app to the table when a power changes something.

## The variant (Solitaire)

### Setup

- As normal (rules.md → Setup), with these differences:
  - **You lead first:** arrange the play area so the round disc starts on your side. It then
    swaps sides each round: you lead rounds I, III and V, the Bosun leads II and IV.
  - **The Bosun's hand** is a face-down stack of 9 cards you may not inspect.
- **Difficulty** picks the Pirate cards:

| Difficulty | Pirate cards |
| --- | --- |
| Easy | Two Pirate cards, shared: whoever wins the trick may use either |
| Medium | One each: the trick's winner may use their own, not the other's |
| Hard | Only you have one, used as in the normal game; the Bosun has none |

### Play

- **Exchange:** the Bosun gives you the top card of its stack; the card you give it goes on top of
  its stack, so you know its first card.
- **You lead:** flip the Bosun's cards from the top until one follows your colour; it plays that
  card. If none can, you pick any of its cards for it (all are face up now). Then turn the flipped
  cards face down and put them back on its stack in the order they came off. You may study them
  first.
- **The Bosun leads:** flip its top card; it leads with it, and you play against it normally.
- You may inspect the face-up discard pile at any time.

### The Cannon + Wheel pirate: who holds it (#22)

New voyage asks who holds the Cannon + Wheel Pirate card, from the holders the difficulty allows
(`cannonWheel` in the settings):

| Difficulty | Holders offered |
| --- | --- |
| Easy | Not in play, or **in the shared pair** (`shared`): whoever wins the trick may use it, under either option of ruling 3, since both sides own the shared cards |
| Medium | Not in play, you, or the Bosun |
| Hard | Not in play, or you: the Bosun has no Pirate card |

Who may use its action follows ruling 3: under the default, only its holder (either side, when it
is in Easy's shared pair); under "any trick winner", whoever wins the trick. Whenever the Bosun
uses it, its own or yours, it does so through the special note below. On Hard, "any trick
winner" lets the Bosun use your Cannon + Wheel too, although it has no Pirate card of its own: the
ruling is about the card's action, not about owning a card.

A holder the difficulty doesn't offer reads as its nearest one (`cannonWheelHolder`): you or the
Bosun on Easy is the shared pair; the shared pair on Medium or Hard, or the Bosun on Hard, is
nobody. Settings saved before #22 had `bosunCannonWheel: boolean`; they load as `'bosun'` (true)
or `'none'` (false), so an old Easy voyage with it still has it in the shared pair.

### The Bosun's Cannon + Wheel (special note)

When the Bosun uses the Cannon + Wheel Pirate card:

1. Pick the new card from the player deck and set it aside.
2. Shuffle the player deck.
3. Put the Bosun's top card face down on the player deck.
4. Put the set-aside card on top of the Bosun's stack.

## The engine's model

- **A voyage** is a pure function of its settings and the events the user taps. Undo removes the
  last event. There is no randomness: the table shuffles.
- **The Kraken deck** is counted as the numbered cards above the Kraken card and those below it.
  Setup: 6 above, 0 below. An attack discards a card from above; with none above, the Kraken card
  is on top: the meeple moves one space and the card goes to the bottom (above takes below's count,
  below becomes 0). A card added to the deck goes below. The voyage is lost when the deck holds
  only the Kraken card.
- **The player deck** is counted too: at the deal it holds every numbered card not in the Kraken
  deck, minus the cards dealt; a cannon flip takes one card from it.
- **Round-end attacks** use the number under the meeple when the round ends, even if it moves
  during them (rules.md → A round).
- **Storm checks** ask the user after rounds II and IV (only after II in the Learning scenario),
  naming the storm's column from the scenario. A round whose attacks already lost asks nothing.

### Steps and events (`src/engine/voyage.ts`, #1)

The voyage starts at round I's exchange (the setup checklist, deal included, is screen-only). Each
step waits for the events the user taps; `orderDone` and `roundEndDone` commit what the step
previews, so the screen can show each attack's effect before the user does it at the table.

| Step | Shows | Events |
| --- | --- | --- |
| exchange | the round, who leads, cards each | `exchange` |
| trick | the trick number, who leads (you in I, III, V and the Bosun in II, IV first; then the winner) | `trick` {winner, yours, bosuns}: the winner's cube advances |
| order | the move, the attacks and their effects, cards to the Kraken deck, the flips so far, the Pirate reminder | `flip` {symbol} while a flip is due, `ship` {onto} when the order moves the ship, then `orderDone` |
| roundEnd | the attacks (the number under the meeple), each effect, the storm check | `storm` {passed} when there is a check, then `roundEndDone` |
| deal | the next round, who leads, cards each | `dealt` |
| won, lost | the reason and the round | none |

`fix` (Fix the trackers) sets the round (I to V), both trick counts, above, below, the meeple's
space (0 to 3) and the player deck at any step before the end; it rejects a Kraken deck with no
numbered card or more than 27 cards in all. The trick counts change only while the round is in
progress (the exchange, a trick, or an order before anyone has a fourth trick): 0 to 3 each, and
fewer in all than the cards each player was dealt, or as many at an order, whose trick is counted.
Once the round is ending (a fourth trick's order, the round end, the deal) they stay as they are.
A fix never decides a win or a loss: the step it leaves does, as usual (a fix to round V loses at
that round's end, not at once). A `fix` saved before #31 has no round or tricks and leaves them
as they are (#31).

- **The HUD's Kraken count** is the numbered cards in the Kraken deck, the Kraken card not counted:
  "6 cards left" at setup.
- **An order resolves** in the rulebook's order: the cards that go to the Kraken deck, then the
  move, then the damage (the pair's, then one for a Kraken token). The End token wins at once, so
  damage after it never loses (rules.md → if you both win and lose, you win); sailing past it
  loses at once under ruling 1's default.
- **The token answer** "open sea" also covers a move an island or the board's edge blocked.
- **The Cannon + Cannon chain** asks one flip at a time while the flipped card is a cannon and the
  player deck has cards; each flip takes one card from the player deck.
- **A short deal** (ruling 4) gives each player half the cards outside the Kraken deck, at most 9;
  an odd card stays in the player deck. With fewer than 7 cards each the hands can run out before
  anyone wins four tricks: the round then ends when they do.
- **Ruling 5's alternative** ends the round as soon as the fourth trick is won, and its action is
  not resolved; the log marks the trick as skipped.
- **Pirate cards:** the order shows whether the winner may use one (Hard: only you), and offers the
  Cannon + Wheel swap whenever the Bosun wins and may use that pirate (see who holds it, above).
  The swap changes no counts, so it logs nothing.
- **Saves** hold `{ version, settings, events }` (`SAVE_VERSION`, `src/engine/save.ts`); loading
  checks every event and replays them, and returns nothing for anything else.

## Rulings

Every gap is a setting with a default. Change a default only together with this table and the
B4 · Rulings sheet in the design.

| # | Question | Default | Other options | Basis |
| --- | --- | --- | --- | --- |
| 1 | The ship sails past the End token | You lose | Nothing happens | The Russian rulebook lists it (RU p.4); BGG clarification from Allplay; the English v10 doesn't |
| 2 | Who decides if the Bosun uses its Pirate card | You, when it wins the trick | — | Sail Solitaire says the Dummy Player "may use" it; pirate powers are optional and need a trick win (BGG clarification) |
| 3 | The Cannon + Wheel pirate's new action | Only its owner | Any trick winner | BGG clarification, Allplay, 2023, against the community's any-winner reading; the special note applies whenever the Bosun uses it: its own, Easy's shared one, or yours under any trick winner (#22) |
| 4 | Too few cards to deal 9 each | Deal evenly, as far as the deck goes | — | No rule; only possible when the Kraken deck holds more than nine cards. Our call |
| 5 | The fourth trick's action | Resolve it, then end the round | End the round first | The rulebook's order of play; a BGG reply, not confirmed by the publisher |

The BGG thread links for rulings 1, 2, 3 and 5, and for the Kraken card using up one attack
(rules.md → Kraken damage), are still open in #16: BoardGameGeek doesn't serve its threads to
automated reads, so no answer could be confirmed yet. The rulings sheet's sources name no thread, so
they stay as they are until a link is confirmed.

## Community etiquette

Don't post links to the app on BGG threads or files. Cite answers as "BGG clarification", with the
link.
