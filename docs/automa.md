# Sail Solitaire: the Bosun

The app runs **Sail Solitaire**, Chuck Rosselli's fan solo variant of Sail
([`reference/sail-automa.pdf`](reference/sail-automa.pdf), 1 page, 11/10/2023). The variant's
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
  naming the storm's column from the scenario.

## Rulings

Every gap is a setting with a default. Change a default only together with this table and the
B4 · Rulings sheet in the design.

| # | Question | Default | Other options | Basis |
| --- | --- | --- | --- | --- |
| 1 | The ship sails past the End token | You lose | Nothing happens | The Russian rulebook lists it (RU p.4); BGG clarification from Allplay; the English v10 doesn't |
| 2 | Who decides if the Bosun uses its Pirate card | You, when it wins the trick | — | Sail Solitaire says the Dummy Player "may use" it; pirate powers are optional and need a trick win (BGG clarification) |
| 3 | The Cannon + Wheel pirate's new action | Only its owner | Any trick winner | BGG clarification, Allplay, 2023, against the community's any-winner reading; the special note applies when the Bosun owns it |
| 4 | Too few cards to deal 9 each | Deal evenly, as far as the deck goes | — | No rule; only possible when the Kraken deck holds more than nine cards. Our call |
| 5 | The fourth trick's action | Resolve it, then end the round | End the round first | The rulebook's order of play; a BGG reply, not confirmed by the publisher |

The BGG thread links for rulings 1, 2, 3 and 5 are still to add (see the issue for the rulings
sheet).

## Community etiquette

Don't post links to the app on BGG threads or files. Cite answers as "BGG clarification", with the
link.
