# Sail: the rules the app needs

A summary of the official rules, with page references. The solo variant the app runs, the Bosun's
procedure and the rulings table are in [`automa.md`](automa.md). When the code needs a rule this
file doesn't have, stop and raise it in the issue.

## Sources

| Source | File | What we take |
| --- | --- | --- |
| Sail rulebook v10, Allplay (EN, 4 pages) | [`reference/sail-rulebook-en.pdf`](reference/sail-rulebook-en.pdf) | Setup, gameplay, actions, cannon actions, hazards, winning and losing. Cited as **EN p.N** |
| «Парус», правила игры (RU, 4 pages) | [`reference/sail-rulebook-ru.pdf`](reference/sail-rulebook-ru.pdf) | The five phases, the storm columns, the extra loss past the finish, and the Russian terms. Cited as **RU p.N** |
| Scenario Book (2 pages) | [`reference/sail-scenarios.pdf`](reference/sail-scenarios.pdf) | Token positions and storm columns of the Learning scenario and scenarios 1 to 5. Cited as **SB p.N** |
| Sail Solitaire, Chuck Rosselli, 11/10/2023 (1 page) | [`reference/sail-automa.pdf`](reference/sail-automa.pdf) | The solo variant: [`automa.md`](automa.md). Cited as **Solitaire** |
| RulesPal FAQ, quoting Allplay and community answers on BoardGameGeek | Sail's BoardGameGeek forums (thread links to add with each ruling's issue) | Kraken damage order, round-end attacks, pirates. Cited as **BGG clarification** |

Credits (EN p.4): design Akiyama Koryo and Kozu Yusei; illustration Weberson Santiago; graphic
design Anca Gavril and Daniel Profiri; developer Taylor Reiner; 3D artist Filip Gavril; published by
Allplay. The Russian edition spells them Акияма Корё, Кодзу Юсэй, Веберсон Сантьягу (RU p.4).

## Components (EN p.1)

- **27 playing cards:** three colours, numbered 1 to 9. Each card shows one symbol: helm, helm &
  kraken, tail or cannon. The app stores only the symbols the user taps, never a card.
- 6 Pirate cards, 1 Kraken card, player aids (4 in EN, 6 in RU).
- Boards: ocean (in 5 parts), Kraken, play area. Trackers: Kraken meeple, 2 trick cubes, round
  disc, ship. Tokens: start, end, 12 islands, 9 Kraken, 4 storm.

## Setup (EN p.1, steps 1–7; RU p.1, steps 1–8)

1. Assemble the ocean board between the players; the play area and Kraken boards at opposite ends.
2. Place the tokens of the chosen scenario (Scenario Book, below).
3. Each player chooses a Pirate card.
4. Kraken meeple on the Kraken board's lowest left space, a **3** (RU p.1 step 5). Trick cubes on
   0, round disc on I.
5. Ship on the start token.
6. **Kraken deck:** the six cards numbered 1 and 2, shuffled, face up, with the Kraken card at the
   bottom.
7. **Player deck:** the remaining cards (3 to 9, 21 cards), shuffled, face down.

## The Kraken track

The Kraken board's spaces, from the start: **3, 3, 4, 5, skull ("Dead")**. The owner checked it on
the box (docs/decisions.md, 2026-11-25); the rulebooks only show it in pictures (EN p.3, RU p.3).
The number under the meeple is the number of attacks at round end. Moving onto the skull loses.

## A round (EN p.2; RU p.2–3, phases 1–5)

The game lasts at most 5 rounds. Players may not talk from the deal until the last trick is played.

1. **Deal:** 9 cards to each player from the player deck.
2. **Exchange:** each player gives one card to the other, before looking at the card received.
3. **Tricks:** the player with the round disc on their side leads the first trick; the winner of
   a trick leads the next. The second player must follow the colour led if they can. The highest
   card in the colour led wins. The winner's trick cube advances; both cards are discarded unless
   an action says otherwise. The discard pile and the Kraken deck may be inspected at any time.
4. **Round end:** when a player wins their **fourth** trick. The Kraken attacks as many times as
   the number under its meeple (RU p.3, phase 4: the number at the start of the phase).
5. Advance the round disc, reset the trick cubes to 0, and shuffle the player deck, the discard
   pile and the cards left in hand into the next round's player deck (EN p.3; RU p.3, phase 5).

## Actions (EN p.3; RU p.3 "Комбинации")

The symbols of the two cards in a trick, in either order:

| Pair | Action |
| --- | --- |
| Helm + Helm | Move the ship forward and toward the trick's winner |
| Helm & Kraken + Helm | Move forward toward the winner; the Kraken damages the ship once (even if the ship fails to move) |
| Helm & Kraken + Helm & Kraken | Move forward toward the winner; the Kraken damages the ship twice (even if it fails to move) |
| Helm & Kraken + Cannon | Damage the Kraken: the Helm & Kraken card goes to the bottom of the Kraken deck instead of the discard pile |
| Tail + Tail | Move the ship straight forward one space |
| Cannon + Cannon | Flip the top card of the player deck, do its cannon action, then discard it. Empty deck: no effect |
| Any other pair | No action, no damage; the trick cube still moves |

### Cannon actions (EN p.4; RU p.4)

The flipped card's symbol:

| Symbol | Cannon action |
| --- | --- |
| Helm | Move forward toward the trick's winner |
| Helm & Kraken | Place this card at the bottom of the Kraken deck |
| Tail | Move straight forward one space |
| Cannon | Flip another card |

## Kraken damage (EN p.3; RU p.3)

- Each time the Kraken damages the ship, move the top card of the Kraken deck to the discard pile.
- If that card is the Kraken card: move the Kraken meeple one space clockwise and put the Kraken
  card at the bottom of the deck. That uses up the attack; the remaining attacks go on (BGG
  clarification, Allplay, Aug 2023).
- If the Kraken card is ever the only card in the Kraken deck, the players lose.

## Hazards (EN p.4; RU p.4)

- **Islands:** the ship may not enter them; a move onto an island doesn't happen.
- **Kraken tokens:** after moving onto one, the Kraken damages the ship.
- **The Great Unknown:** a move off the board doesn't happen.
- **Storms:** each storm is two tokens in one column of the ocean board. At the end of round II the
  ship must be completely past the first storm, and at the end of round IV past the second: if it
  is in the storm's column or any column before it, the players lose (EN p.4; RU p.3–4).

## Winning and losing (EN p.4; RU p.4)

- **Win:** the ship sails onto an End token.
- **Lose:** round V ends; behind a storm at the end of round II or IV; the Kraken card alone in the
  Kraken deck; the Kraken meeple moves onto the skull; the ship moves past the End token (RU only:
  see the rulings in [`automa.md`](automa.md)).
- If an action makes you both win and lose, you win.

## Scenarios (SB p.1–2)

The Scenario Book has the **Learning scenario and scenarios 1 to 5**. The data is in
[`src/engine/scenarios.ts`](../src/engine/scenarios.ts).

| Scenario | Islands | Kraken tokens | End | Storm columns |
| --- | --- | --- | --- | --- |
| Learning (p.1) | D3, A8, G8, A10, G10 | A4, G6, D7 | C10, E10, D11 | 5 (one storm, passed before round III) |
| 1 (p.1) | D3, G6, C10, G10, G12, A16, G16 | G4, A6, C8, C12, A14, F15 | C16, E16, D17 | 5 and 12 |
| 2 (p.1) | D3, G8, A10, E10, B11, A12, D15, A18, G18 | G4, A6, D7, E12, A16, F17 | C18, E18, D19 | 5 and 14 |
| 3 (p.2) | D3, G6, G8, A10, E10, B11, A12, D15, C18, A20, G20 | G4, A6, D7, E12, A16, G16, F19 | C20, E20, D21 | 5 and 14 |
| 4 (p.2) | D3, E6, C10, G10, G12, A14, B15, A16, D17, D19, A22, G22 | A4, C8, E10, D13, G14, A20, F21 | C22, E22, D23 | 9 and 18 |
| 5 (p.2) | D3, E6, C10, G10, G12, A14, B15, A16, D17, D19, C22 | A4, C8, E10, D13, G14, A20, G20, F23 | C24, E24, D25 | 9 and 18 |

Every scenario starts on D1. The Seafarers expansion (scenarios 7 to 10 in reviews) isn't
supported until we have its rulebook.
