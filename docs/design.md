# Design

The design file is the reference: **`~/Graphics/sail-automa.pen`** on the owner's Mac (pen.dev),
reached through the Pencil MCP tools at `file:///Users/asilachev/Graphics/sail-automa.pen`. It is
encrypted: read and change it only with the Pencil tools (`pencil-sync`). Everything current is in
the top-level frame **Frame 4**; **Archive · old designs (before K3+)** holds superseded work and
the vector sources of the K3 drawings ("Section · Old drawing sources").

## Boards and screens

| Frame | What it holds |
| --- | --- |
| 00 · Bosun · overview | Start here: what the app replaces, persona and voice, the look, the owner's taste notes, requirements, the rules table, rulings, PWA checklist, open questions, sources |
| 01 · Tokens | Colours (day = rulebook page, night = card face), type, radii, motion |
| 02 · Journey | The user flows |
| 03 · Transitions and states | Push, fade, sheet, dialog, toast, FLIP, SAIL, ATTACK, CUBE, ROUND; PRESS and the pieces' states |
| 04 · Every tap | What each control does |
| 05 · Icon and favicons | The helm mark and the icon set |
| Components | Every reusable part: symbols, buttons, segments, chips, option cards, rows, sheet header, toast, install card, dialog, mini maps, board maps, HUD, dock, action bars |
| A1–A5 | Launch and Home: the screens below |
| B1–B7 | New voyage and setting up the table: the screens below |
| C1–C11 | At the table: the screens below |
| D1–D8 | Menu, sheets and recovery: the screens below |
| E1–E9 | End of the voyage and the captain's log: the screens below |
| F1–F5 | PWA states: the screens below |
| N1–N8 | Night mode: Home first visit (N1) and in progress (N2), Set up the table (N3), Trick 5 (N4), the order (N5), Round II ends (N6), Menu (N7), Land ho (N8) |
| Section G: Language · ES, DE, RU, SR | Every screen below in that language, one row per language, frame names ending `· ES` and so on |
| Language · 360 px checks | B1, C2, C5, C6 and C8 in German and Russian at 360 px |
| L1–L6 | Landing page: desktop 1440 (L1) and mobile 390 (L2) in English, mobile 390 in Spanish (L3), German (L4), Russian (L5) and Serbian (L6) |

### Every screen, and how to reach it

Each screen below is drawn in English in its section of Frame 4 and again in Spanish, German,
Russian and Serbian in Section G (F2 in English only). The second column says how to open that
state on the dev server (`npm run dev`) with the dev-only routes in `AGENTS.md`: `?screen=`,
`?fixture=` (engine fixtures, `src/engine/fixtures.ts`), `?script=` and `&layer=`. Add
`&lang=es` (or `de`, `ru`, `sr`) for another language. The fixtures use the default settings, so
they show the Learning scenario where the design shows scenario 3.

| Frame | How to reach it |
| --- | --- |
| A1 · Splash | `/`, on a cold launch |
| A2 · Home · first visit | `/` with empty storage |
| A3 · Home · voyage in progress | `/?fixture=orderAttack&screen=home` |
| A4 · Settings | `/?screen=settings` |
| A5 · Home · Learning voyage, the Kraken on the skull | The Learning line: `/?fixture=exchange&screen=home`. The skull line has no route: the engine ends the voyage when the Kraken reaches the skull, so Home shows it only for a save that is already there |
| B1 · New voyage · options | `/?screen=newVoyage` |
| B2 · Set up the table · 5 of 9 ticked | `/?screen=setup`, tick five lines |
| B3 · Set up the table · all ticked, ready | `/?screen=setup`, tick all nine |
| B4 · Rulings · sheet | The Rulings row on B1, or `/?fixture=exchange&layer=rulings` |
| B5 · New voyage · Hard | `/?screen=newVoyage`, pick Hard and change one ruling ("5 rulings · 1 changed") |
| B6 · Set up the table · Learning, last line left | `/?screen=newVoyage`: Learning, Medium, the Cannon + Wheel pirate with the Bosun, Next, then tick eight lines |
| B7 · Set up the table · line 3 for each Pirate choice | As B6, with Easy (not in play, then in the shared pair), Medium with the Bosun holding it, and Hard |
| C1 · Round I · the exchange | `/?fixture=exchange` |
| C2 · Trick 1 · you lead · how-to open | `/?fixture=trickYouLead` |
| C3 · Trick 6 · the Bosun leads · how-to folded | `/?fixture=trickBosunLeads` |
| C4 · Trick 5 · you lead · two of three picked | `/?fixture=trickYouLead`, pick the winner and one symbol |
| C5 · Trick 5 · the order: helm & kraken + helm | `/?fixture=orderAttack` |
| C6 · Trick 4 · cannon + cannon, then a tail | `/?fixture=cannonTail` (`cannonFlip` for the flip before it) |
| C7 · The Bosun's Cannon + Wheel · sheet | `/?fixture=bosunCannonWheel&layer=swap` |
| C8 · Round II ends · the Kraken and the storm | `/?fixture=roundEndStorm` |
| C9 · Round III · new deal | `/?fixture=deal` (round II's deal) |
| C10 · Round end · the Kraken's first move, 3 → 3 | `/?script=x%20fix:1,3,0,9%20Y!*4`: round I ends with the Kraken card second from the top, so the Kraken moves from the first 3 to the second |
| C11 · The order · Pirate reminders for the Cannon + Wheel | A board of the three reminders under ruling 3's "any trick winner": `/?fixture=yourCannonWheelAnyWinner` shows the Hard one; the Medium ones need that ruling and the Cannon + Wheel with the Bosun (you won) or with you (the Bosun won) on New voyage |
| D1 · Menu · sheet | `/?fixture=orderAttack&layer=menu` |
| D2 · End this voyage? · dialog | `/?fixture=orderAttack&layer=end` |
| D3 · Undone · toast | `/?fixture=orderAttack`, tap Undo |
| D4 · Ship's log · sheet | `/?fixture=orderAttack&layer=log`; its fix line with the round and the tricks: `/?fixture=fixedRound&layer=log` |
| D5 · Fix the trackers · sheet | `/?fixture=orderAttack&layer=fix` |
| D5 · Fix the trackers · sheet · the round ending, tricks locked | `/?script=x%20Y!*3%20Yhh&layer=fix`: a fourth trick's order, so the trick steppers are disabled |
| D6 · Rules · the combos · sheet | `/?fixture=orderAttack&layer=rules` |
| D7 · Abandon this voyage? · dialog | `/?fixture=exchange&screen=newVoyage` (or New voyage on Home while a voyage is saved) |
| D8 · Theme · sheet | `/?fixture=orderAttack&layer=menu`, tap Theme |
| E1 · Land ho · you win | `/?fixture=won` |
| E2 · The Kraken wins · you lose | `/?fixture=lostKrakenAlone` |
| E3 · Captain's log | `/?screen=log` after opening a few of the E fixtures below: each result screen writes its voyage into the log |
| E4 · Clear the captain's log? · dialog | E3, tap Clear the log |
| E5 · Captain's log · nothing yet | `/?screen=log` with empty storage |
| E6 · The Kraken wins · storm | `/?fixture=lostStorm` |
| E7 · The Kraken wins · the skull | `/?script=x%20fix:0,4,3,3%20Bkh%20@o%20.` |
| E8 · The Kraken wins · round V | `/?script=` with five rounds: `x fix:9,0,0,0 Y!*4 e d`, then the same with `B!*4 s+ e d`, `Y!*4 e d`, `B!*4 e d` and `Y!*4 e`, URL-encoded |
| E9 · The Kraken wins · past the End | `/?fixture=lostPastEnd` |
| F1 · Install on iPhone · sheet (once) | `/` in an iPhone Safari user agent, on the first visit |
| F2 · Language · sheet | Home, tap the language chip |
| F3 · Offline and update ready · toasts | Offline: DevTools → Network → Offline. Update ready: a production build (`npm run build`, `npx vite preview`) with a newer build deployed behind it |
| F4 · Credits · sheet | Home, tap Credits |
| F5 · Saving blocked · toast | `/` with site data blocked (Chrome: Settings → Site data) |

The design's texts are variables themed by language (`t.*` for the app, `l.*` for the landing
page). [`design/copy.json`](design/copy.json) is their export, in all five languages: the start
for every locale file.

## Notes for implementers

- Texts in the design are literal strings on every language copy; the `t.*` and `l.*` variables
  hold the same texts and are what `design/copy.json` exports. When a text changes, change both.
- The Kraken dial shows 3, 3, 4, 5, skull, and the scenario chips Learning and 1 to 5 (#3).
- The round track's clouds sit on III and V: the storm checks happen as rounds II and IV end, so
  before III and V begin.
- Night text tokens are lighter than the design's first night colours, for 4.5:1 on small text
  (#14): `text-3` #a2b4b1, `accent-text` #ffab85, and `danger-text` (#d9342b by day, #ffa294 at
  night) for small red labels; fills, borders and large numbers keep `danger`. `board-navy`
  (#22529a by day, #183f7a at night) is the Bosun's name on the board, and the Kraken dial's
  current space is #d9342b in both themes. Below 380 px the round track's diamonds overlap by 5 px.

## Look

- **Day** is the rulebook page: white, sky-blue panels, ink `#231F20`, coral-orange symbols
  `#F26A3D`, dark-blue step badges. **Night** is the card face, slate teal. Auto follows the phone.
- **Type:** Bitter 900 for headings and numbers, Fira Sans Condensed for text; Latin and Cyrillic,
  OFL, self-hosted. Icons: Phosphor.
- **Pictures** are our own: the K3+ kit, wooden pieces with printed details and stamp symbols, and
  hand-inked sketches in one ink colour. No official art.
- **The HUD** is the play-area board: black trick cells, the yellow cube, the I to V diamond track
  with clouds on the storm rounds, the Kraken deck and its dial.

## Taste

The owner's words, and what each changed. New notes go at the end.

| Date | The owner said | What it became |
| --- | --- | --- |
| 2026-11-19 | "Make sure colors/fonts/visuals share more of Sail game details. Now it looks foreign to the game" | Palette, type and parts taken from the rulebook and the boards |
| 2026-11-19 | "Not sure I like the logo; want a better font variant; hero BG matches poorly with text color and buttons/icons" | Bitter 900 for headings; hero text on a cream tile, never on the busy sea |
| 2026-11-19 | "icons shall not be boxed" | No tile, ring or card behind an icon or the logo. Buttons and choice chips keep their shape |
| 2026-11-19 | "I like helm as logo, but remove sail, and make it bit more cartoonish according to game graphics" | The helm alone is the mark |
| 2026-11-19 | "Hero is not ideal, too boring" · "match game's graphics better" | The hero is the ocean board itself |
| 2026-11-19 | "can we make images more look more sketch like (same as in rulebook)" | Every picture is a hand-inked sketch |
| 2026-11-19 | "k3+ looks great! Let's work on icons, make logo (helm) more like wooden meeple, fix palm positioning" | K3+ is the kit; card symbols are wooden tokens with thickness |
| 2026-11-19 | "this looks good, let's just make it bigger for logo" | The wooden helm is the logo: 68 px in the site nav, 40 px in the app bar |
| 2026-11-19 | "make overlap so the icon will be visible" | A piece standing on a token overlaps its far corner and never hides the token's icon |
| 2026-11-19 | "now logo is not synced with logo text" | Helm and wordmark are one lockup, centred on the hub |
| 2026-11-19 | "Make space between logo letters smaller" | Wordmark tracking 0.04 em |
| 2026-11-19 | "move logo closer to logo text" (the splash) | On the splash the helm sits 13 px above the wordmark |
| 2026-11-19 | "don't forget about transitions, states, user journey diagram" | A look is done only with board 03, every screen's states and the journey |
| 2026-11-19 | "when we're having boxes horizontally make sure height is equal" | Boxes side by side share one height; icons and titles on the same lines |
| 2026-11-19 | "in Serbian this game called Plovidba (serbian word)" | Serbian names the game „Пловидба“ |
| 2026-11-20 | "text gets cutoff" (Russian landing footer) | Translated text wraps inside its box; every copy is checked for overflow |

## PWA checklist (from the design)

- **Manifest:** name and short_name Bosun, start_url `/`, standalone, portrait, the day page's
  colours, icons 192, 512 and maskable 512 (plus the pwa layer's full set).
- **Offline first:** the shell, fonts, pictures and icons precached; a toast when offline (F3).
- **Updates:** prompt mode, "A new version is ready · Reload" (F3); never a reload mid-voyage.
- **Install:** the install card on Home (A2); a one-time iPhone sheet (F1).
- **Standalone layout:** `viewport-fit=cover`, safe areas, the action bar and dock above the home
  indicator, no overscroll. The iPhone status bar is opaque (`default`), in the theme's colour.
  Installed from the Home Screen, iOS 26 and later still blur the status bar and about 40 pt
  below it, and no CSS turns that off. So there, in portrait, every screen starts 40 px lower:
  nothing is blurred at rest, and scrolled content passes under the system's blur, with no band
  or line of ours (`--top-inset`, `global.css`; #50).
- **Table ergonomics:** 44 px targets, 48 for the primary action; one screen per trick.
- **Screen awake** while a voyage is open, with a switch in the menu and Settings.
- **Never lose a voyage:** saved after every tap under a versioned key; `persist()` at Set sail;
  Continue · Round N on Home; Undo; ending and abandoning ask first.
- **Motion and access:** board 03's timings; reduced motion ends them at once; real roles.
