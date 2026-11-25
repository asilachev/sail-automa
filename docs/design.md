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
| A1–A4 | Splash, Home (first visit, voyage in progress), Settings |
| B1–B4 | New voyage options, Set up the table (in progress, all ticked), Rulings sheet |
| C1–C9 | At the table: the exchange, you lead, the Bosun leads, the symbols, the order, cannon + cannon, the Bosun's Cannon + Wheel, round end with the storm check, the new deal |
| D1–D7 | Menu, End this voyage?, Undone toast, Ship's log, Fix the trackers, Rules · the combos, Abandon this voyage? |
| E1–E4 | Land ho, The Kraken wins, Captain's log, Clear the captain's log? |
| F1–F4 | Install on iPhone, Language, Offline and update toasts, Credits |
| N1–N8 | Night mode |
| G rows, Language · ES, 360 px checks | Every screen in Spanish (other languages as variables), German and Russian at 360 px |
| L1, L2 | Landing page, desktop 1440 and mobile 390 |

The design's texts are variables themed by language (`t.*` for the app, `l.*` for the landing
page). [`design/copy.json`](design/copy.json) is their export, in all five languages: the start
for every locale file.

## Known differences to fix in the design

- The Kraken dial shows 3, 4, 5, skull; the track is **3, 3, 4, 5, skull** (decisions.md).
- The scenario chips show 1 to 6; the book has **Learning and 1 to 5** (decisions.md).

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
  indicator, no overscroll.
- **Table ergonomics:** 44 px targets, 48 for the primary action; one screen per trick.
- **Screen awake** while a voyage is open, with a switch in the menu and Settings.
- **Never lose a voyage:** saved after every tap under a versioned key; `persist()` at Set sail;
  Continue · Round N on Home; Undo; ending and abandoning ask first.
- **Motion and access:** board 03's timings; reduced motion ends them at once; real roles.
