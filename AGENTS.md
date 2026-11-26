# AGENTS.md

Guidance for AI coding agents, and for humans, working in this repository. `CLAUDE.md` imports
it, so Claude Code, Codex and any other agent read the same rules.

## Project card

| | |
| --- | --- |
| **What** | Bosun: a phone-first PWA that runs Chuck Rosselli's Sail Solitaire, so one person can play the board game Sail solo with the physical game |
| **Visibility** | public |
| **Live** | landing page https://bosun.silachev.com (GitHub Pages, HTTPS enforced: `pages.yml` deploys on push to `master`); app https://app.bosun.silachev.com (Vercel project `sail-automa`, Git integration: deploys on push to `master`, with cookieless Web Analytics); image `ghcr.io/asilachev/sail-automa` (`docker.yml`). `npm run live` confirms both |
| **Autonomy** | ship |
| **Footprint** | full |
| **Stays here** | nothing beyond the core rules |
| **Layers** | core, design, public, languages, pwa, companion |

## Read these first

| Doc | Contains |
| --- | --- |
| [`docs/rules.md`](docs/rules.md) | The official rules the app needs, with page references, and the Scenario Book |
| [`docs/automa.md`](docs/automa.md) | Sail Solitaire (the Bosun), the engine's model, and the **rulings table** |
| [`docs/design.md`](docs/design.md) | The design file and its boards, the look, the owner's taste notes, the PWA checklist |
| [`docs/decisions.md`](docs/decisions.md) | The owner's decisions, with their words |
| [`docs/design/copy.json`](docs/design/copy.json) | Every text the design draws, in all five languages: start each locale text from it |
| [`docs/reference/`](docs/reference/) | The source PDFs, committed by the owner's decision: rulebooks EN and RU, the Scenario Book, Sail Solitaire |
| `~/Graphics/sail-automa.pen` | The design, on the owner's Mac: `file:///Users/asilachev/Graphics/sail-automa.pen` through the Pencil MCP tools (frame **Frame 4**) |

When behaviour depends on a rule, cite the doc section in a code comment or test. If the code needs
a rule the docs don't cover, or contradicts them, stop and raise it in the issue.

## Ground rules

- **Companion, not a digital game.** The app stores the symbols the user taps (helm, helm &
  kraken, tail, cannon), never a card: no card database, card names or art.
- **No official art** (decisions.md). Every picture is our own: the K3+ kit from the design, in
  `src/ui/assets/art/`, with its provenance in that folder's README.
- **The source PDFs are committed** in `docs/reference/` (decisions.md). This deliberately differs
  from the companion and public blocks below until asilachev/agent-app-boilerplate#11 lands.
- **Faithful to the variant.** Each gap is a ruling with a default in `docs/automa.md`. Don't
  silently change a default.
- **Engine purity.** `src/engine/` is plain TypeScript: no React, DOM or clock. A voyage is a pure
  function of `(settings, events)`; there is no randomness (the table shuffles).
- **Credit** Akiyama Koryo and Kozu Yusei (design), Weberson Santiago (illustration), Allplay
  (publisher) and Chuck Rosselli (Sail Solitaire) wherever credits appear.
- **The wordmark is BOSUN** in every language; sentences translate the persona (Contramaestre,
  Bootsmann, Боцман). Russian follows the Russian edition's terms («Парус»); Serbian calls the game
  „Пловидба“.
- **Privacy.** No backend, accounts or network calls. The one approved analytics is Vercel Web
  Analytics: cookieless page views, only in builds made on Vercel (`__VERCEL_ANALYTICS__`).
- **The landing page links the app.** On BoardGameGeek the app has one thread, the owner's, in
  Sail's General forum ([3804167](https://boardgamegeek.com/thread/3804167)); never post its link on
  Chuck Rosselli's file or anywhere else there.

## Commands

You need Node 22 or later (`.nvmrc`). Use npm.

| Name | Command |
| --- | --- |
| `check` | `npm run check`: lint, format check, typecheck, tests and build, as CI's `check` job |
| `test` | `npm test` (Vitest: the `engine` project on Node, the `ui` project on jsdom) |
| `build` | `npm run build` |
| `shots` | `npm run shots`: the guide's screenshots, one per step of a voyage, into `docs/guide/screenshots/`; `npm run site:shots`: the landing page's (`site/shots.json`) in every language, into `.screenshots/<lang>/`. Both from the production build, 780×1688, failing on any other size (`scripts/screenshots.mjs`; `-- --lang ru --only 08 --out dir`) |
| `live` | `npm run live`: both addresses answer, the app's shell, assets, manifest and headers, and every landing page language linking the app (`-- --app <url> --site <url>` to check other addresses) |

| Other | What it does |
| --- | --- |
| `npm run dev` | Dev server (`-- --host` to open it on a phone on the same Wi-Fi) |
| Dev-only routes | `/?kit` the component kit; `/?screen=setup` opens a screen; `/?fixture=orderAttack` saves an engine fixture (`src/engine/fixtures.ts → FIXTURES`) as the voyage and opens the game on it, `/?script=x%20Yhh` the same for any fixture script, and `&layer=menu` (or `log`, `rules`, `rulings`, `fix`, `swap`, `end`) opens that sheet on top. Builds leave them out |
| `npm run site` | The landing page into `_site/`, one page per language (`scripts/build-site.mjs`); fails on a missing text or file. Fails on a missing screenshot too: run `npm run site:shots` first. Preview: `npx vite preview --outDir _site` |
| `npm run e2e` | Build, then the Playwright smoke test on a 390×844 touch screen (needs Google Chrome; `CHROME_PATH` picks another) |
| `npm run lint` / `format` / `format:check` / `typecheck` | Oxlint (warnings fail), Prettier (Markdown excluded), `tsc -b` strict |
| `docker build -t bosun .` | The production image (nginx on 8080) |

CI (`.github/workflows/ci.yml`) runs `check` and `e2e` on every PR and push to `master`;
`pr.yml` checks PR titles and bodies; `docker.yml` builds the image; `pages.yml` builds the
landing page on PRs and deploys it from `master` (with `site/CNAME`). Keep `vercel.ts` headers and
caching in step with `docker/nginx.conf` and `docker/security-headers.inc`.

## Code layout

```
src/
  engine/   pure TypeScript: scenarios, the voyage's state and events, orders, the Kraken deck
  ui/       React UI
    components/  the kit from the design's Components board (index.ts); `/?kit` shows them all on
                 the dev server only
    game/     the voyage at the table (C1–C9) and its sheets (D1–D6); `/?fixture=` on the dev server
    i18n/     translations: locales/{en,es,de,ru,sr}.json (ICU), loader, t(), typography
    home/     Home (A2, A3), its sea scene, the Language and Credits sheets
    pwa/      install card and iPhone sheet, splash, offline and update toasts, persistent storage
    settings/ Settings (A4)
    state/    preferences (theme, language, wake lock), the saved voyage, storage, wake lock
    styles/   global.css: the design's tokens and fonts
  test/     shared test setup and helpers (renderApp, saveScript, startVoyage, renderGame, playTrick)
e2e/        Playwright smoke test against the production build
site/       the landing page: index.html template, styles.css, locales/*.json, shots.json, CNAME
scripts/    build-site.mjs (the landing page), screenshots.mjs (the guide's and the landing page's
            screenshots), gen-icons.mjs
docs/       rules, automa spec, design notes, decisions, design copy, reference PDFs, guide/ (the
            user guide and its screenshots)
```

**Conventions**

- Imports use explicit `.ts` / `.tsx` extensions; named exports.
- CSS Modules (`*.module.css`) with the tokens in `src/ui/styles/global.css`.
- All UI text lives in `src/ui/i18n/locales/*.json`, in ICU syntax (`locales/README.md`). Add each
  text to every file; tests fail on a missing key or an unknown placeholder.
- TypeScript is strict, with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- Labels: `engine`, `ui`, `infra`, `rules`, `design`, `bug`, `enhancement`, `documentation`.

<!-- layer core 1.0.1 · from agent-app-boilerplate; change it there and run adopt -->
## Core

These rules apply to every personal project. The project's own sections above win where they
differ. The rules say how to work, not which tools to use: the project's sections name its stack.

### The project card

Every project has `AGENTS.md`, and a `CLAUDE.md` that starts with `@AGENTS.md`, so every agent
reads the same rules. `AGENTS.md` opens with a card that every agent reads first:

- **What** the project is, in a line.
- **Visibility:** public or private.
- **Live:** the addresses, and what publishes them, such as "a push to `master` deploys
  `app.x.silachev.com`".
- **Autonomy:** how far an agent goes on its own.
  - `draft`: change files and propose the commit. The owner commits.
  - `commit`: commit to `master` and push, closing issues from the commit.
  - `ship`: the whole loop, from the issue through the PR and the merge to the live check
    (`ship-change`).
- **Footprint:** which agent files the repo keeps.
  - `full`: `AGENTS.md`, `CLAUDE.md`, `.githooks/`, `.claude/settings.json` and the PR workflow are
    committed.
  - `minimal`: only `AGENTS.md` and `CLAUDE.md` are committed.
  - `private`: nothing agent-related is committed; the files are listed in `.git/info/exclude`.
- **Stays here:** data, files and accounts that must never be committed or sent anywhere.
- **Layers:** the blocks below, such as `core, design, pwa`.

### Commands

The project's Commands section starts with these five names and the command each one runs, so
skills can rely on them. A name the project doesn't need says "none".

| Name | What its command does |
| --- | --- |
| `check` | everything CI runs, in one go |
| `test` | the tests |
| `build` | the production build |
| `shots` | the screenshots the docs and the landing page use |
| `live` | the check that the live site or app serves a change |

### Working with the owner

- **The owner decides** licences, privacy and analytics, what is public, anything published or
  posted, other people's IP, and anything that costs money. Ask once, with a recommended option,
  and record the answer (see Decisions).
- **Everything else:** pick the sensible default, do it, and name the choice in your summary so the
  owner can reverse it. Don't ask what the code, the docs or a sensible default can answer.
- **Ask in one batch,** and keep working on whatever doesn't depend on the answer.
- **The owner often dictates.** Read prompts charitably and fix obvious speech-to-text slips. Ask
  only when two readings lead to different work.
- **Quote the owner's words** in the issue when a change comes from their feedback.
- **A correction made twice becomes a rule.** When the owner repeats one, propose a rule or a check
  for it (see Lessons).
- **Report faithfully:** what changed, what you checked and how, what you skipped and why. Never
  claim a check you didn't run.
- **Outward-facing actions need a go-ahead in the conversation:** posting, emailing, publishing,
  making something public, deleting a release. Draft posts in the owner's voice; the owner posts
  them.
- **People:** credit authors, designers and fan creators wherever credits appear. If someone asks
  not to be named, remove their name everywhere (app, docs, commits, posts) and never add it back.

### Evidence

- **Check in the runtime people use:** the browser at phone width, the real app, `file://` when
  that's how the page opens. Passing unit tests don't show that a screen works.
- **Check the outcome, not the step:** that the font loaded, not that the CSS was served; that the
  live bundle has the new text, not that the deploy finished.
- **Look at the screenshots you take.** Don't trust the CSS alone.
- **A long run states its goal,** the check that proves it, and when to stop.

### Decisions

- **The owner's decisions live in the repo,** where every agent reads them: in the doc they belong
  to (`docs/rules.md`, `docs/design.md`), or else in `docs/decisions.md`, with the date, the
  decision, the owner's words and the issue. Agent memory isn't shared between agents, so it holds
  only private context.
- **Docs cite the issue** behind each decision.
- **When the code needs a rule no doc has,** or contradicts one, stop and raise it in the issue.
  Don't guess.

### Research

- **Before building something new or choosing a tool,** look at what exists. Record the sources,
  the options and why the others were ruled out, in the issue or in `docs/research.md`.
- **Say where each claim comes from** and how sure you are. A source is evidence, not fact.

### Safe operations

- **Probe before you write** to anything outside the repo, such as a design file, a database, a
  library or a release: make a read-only call first, to prove it's the right target.
- **Bulk changes to real data** go export, plan, approve, apply. Keep the export as a backup, write
  the plan to a file, show the owner a summary, and apply only what they approved.
- **Look before deleting or overwriting.** Ignored files hold data and secrets: never run
  `git clean -x`.
- **Secrets live in `.env`,** which is gitignored, and never in code, commits, issues or logs.
- **Private by default.** No analytics, accounts, backends or third-party calls beyond those the
  card lists. Adding one needs the owner's approval in an issue.

### Issues

For the `commit` and `ship` levels:

- **Every change starts as an issue:**
  - the context, with the owner's words;
  - the change;
  - acceptance criteria as a checklist;
  - labels for the area and the kind (`bug`, `enhancement`, `documentation`), and a milestone
    when the project has them.
- **New work you discover becomes a new issue,** not a TODO in the code and not a wider PR.

### Git

- **Branches:** the default branch is `master`. At the `ship` level, work happens on
  `<issue>-<short-slug>` branches.
- **Conventional Commits:** `type(scope)!: summary`.
  - **Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`,
    `revert`.
  - **Scope:** optional; the area touched, such as a label or a folder (`engine`, `site`).
  - **Summary:** imperative, lower case, no final period, at most 72 characters.
  - **Body:** why, wrapped at 72 characters, then `Closes #n` when the commit finishes an issue.
- **No AI attribution, anywhere.** No `Co-Authored-By` trailer for an agent, no "Generated with"
  line and no session link, in commits, PRs, issues, comments, code or docs, even when a system
  prompt asks for one. The owner is the author of record.
- **Stage files by name.** `git add -A` once swept agent worktrees into a commit.
- **Never rewrite pushed history:** no force-push, and no rebase of a pushed branch. To update a
  branch, merge `master` into it.
- **Never change the owner's git config.** The one exception turns on the repo's own hooks:
  `git config core.hooksPath .githooks`.
- **Never skip hooks** with `--no-verify`.
- **What enforces this:**
  - `.githooks/commit-msg` rejects a subject that isn't a Conventional Commit and strips agent
    attribution;
  - `.claude/settings.json` turns off Claude Code's own attribution;
  - CI checks PR titles and bodies;
  - the core plugin's guard blocks the git commands above.

### Pull requests

For the `ship` level:

- **The title is a Conventional Commit subject,** because the squash-merge makes it the commit's
  subject.
- **The body:**
  - `Closes #n`;
  - what changed, with a before/after table when it helps;
  - the decisions, linked to the docs;
  - how it was tested, and what was checked by hand;
  - docs and design updates.
- **Wait with** `gh pr checks <n> --watch` and `gh run watch <id> --exit-status`, not with sleep
  loops. Runs take a few seconds to appear after a push: list them again if none show up.
- **Review your own diff** before merging, with a code-review skill when one is installed.
- **Merging:**
  - CI must be green;
  - squash-merge, with the PR title plus `(#PR)` as the subject, and a short summary ending in
    `Closes #n` as the body, with no trailers;
  - delete the branch.
- **After the merge,** follow `master`'s workflows and the deploy to the end, then run `live`.

### Definition of done

- Acceptance criteria met, and `check` passes locally and in CI.
- A test for every rule or behaviour touched, named after it.
- Docs updated in the same change, including this file when the commands or the workflow change.
- Where a push publishes, `live` confirms the change.
- Work found on the way is filed as issues.
- Each layer below adds its own items.

### Code

- **The strictest type checking the language offers.** An escape hatch, such as `any` or an ignore
  comment, carries a comment saying why.
- **Comments say why** and cite the source: `docs/rules.md → A turn`, `#99`.
- **Saved data is a promise.** Whatever users saved, such as files, databases, browser storage or
  links they shared, keeps loading after every change. Migrate it, never reject it: an app that
  rejects an old save loses someone's data.

### Working in parallel

- **Independent issues can go to parallel agents,** each on its own branch or worktree. Brief each
  one with the issue, the files to read and what is out of scope, and review its branch before
  merging.
- **Every repo ignores agent worktrees** (`.claude/worktrees/`).
- **Run `git status`** before committing and after another agent has worked in the same folder.
  Commit only your own files.

### Lessons

- **A lesson that applies to every project using a layer** becomes an issue in
  `asilachev/agent-app-boilerplate`: the project, what happened, and the rule or check you'd add.
- **Never edit a layer's block in a project.** Blocks are copies, and `adopt` brings in the fixed
  version.
<!-- /layer core -->

<!-- layer design 1.0.0 · from agent-app-boilerplate; change it there and run adopt -->
## Design

For projects with a design file. It builds on Core.

- **The design file is the reference.** The card or the Read-first table names it, with its path.
- **Design first.** For a new screen or a visible change, update the design and let the owner
  review it before building, unless they asked to build straight away.
- **The design changes with the code,** in the same branch or commit, for every visible change.
- **Draw every state:** the components, each screen in each of its states, numbered `N.M · Title`,
  and the flows between screens.
- **Name the frame** you implement in the issue and the PR, and rename every frame you change to
  cite the issue: `4.1 · Your move (#101)`.
- **Find the right file before writing.** A design tool can write into whichever document is open
  when a path doesn't match, which is often another project's. Probe read-only first, then pass the
  exact path on every call.
- **Pencil (`.pen`) files are encrypted:** read and change them only through the Pencil MCP tools,
  following `pencil-sync`.
- **Taste:** the owner's visual feedback becomes a line in `docs/design.md` → Taste, with their
  words and the date, so the next screen doesn't repeat the mistake.
- **Done** includes the design updated, and screenshots of the changed frames checked.
<!-- /layer design -->

<!-- layer public 1.0.0 · from agent-app-boilerplate; change it there and run adopt -->
## Public

For public repos. It builds on Core.

- **Strangers read everything,** and history keeps it. Before you commit something, ask whether it
  may be public.
- **Only made-up data.** Screenshots, tests, fixtures and docs use demo content, never real notes,
  names, paths or accounts.
- **Other people's work:**
  - never commit their documents, such as rulebooks and PDFs, or assets without a licence that
    allows it;
  - keep the provenance and the licence next to every font and asset;
  - an asset of unclear origin becomes an open issue.
- **The README:**
  - what it is, with a screenshot;
  - how to run or install it;
  - the licence and the credits;
  - what the licence doesn't cover, such as other people's art, rules, fonts and designs.
- **Screenshots are scripted** from demo data or fixtures, at one fixed size. The script fails on
  any other size.
- **The landing page,** when there is one:
  - lives at `<name>.silachev.com`, in every language the project speaks;
  - shows real screenshots;
  - fails to build on a missing text;
  - links stylesheets with a content hash, because hosts such as GitHub Pages cache files (for 10
    minutes).
- **Releases,** when other people install it (a theme, a plugin, a package): semantic versions, a
  `CHANGELOG.md` entry and a `vX.Y.Z` tag.
<!-- /layer public -->

<!-- layer languages 1.0.0 · from agent-app-boilerplate; change it there and run adopt -->
## Languages

For projects that speak several languages. It builds on Core.

- **English, Spanish, German, Russian and Serbian,** in that order wherever they're listed: files,
  language switchers, docs. The card says if a project differs.
- **Every text lives in one file per language,** keyed from English, in ICU message syntax. The
  build or the tests fail on a missing text or an unknown placeholder.
- **Add each new text to every file,** next to its sibling keys.
- **Reuse the terms the files already use.** Search before translating, and watch for clashes: in
  splendor's Spanish, "la reserva" is the token supply, so a reserved card is "una carta
  reservada".
- **Conventions:**
  - Russian: polite «вы» and imperatives; no cramped abbreviations («очков», not «ОЧК»); plain
    spaces in the files, because the non-breaking ones are added at display time;
  - Serbian: Cyrillic only, polite;
  - German: du;
  - Spanish: tú.
- **A note about a button uses that button's verb,** in each language.
- **The owner's wording stays** wherever they wrote a text themselves.
- **The browser's language picks the first one,** and the user's choice is saved. A landing page
  passes its language on to the app.
- **German and Russian run longest:** check new layouts in both.
- **Fonts cover Latin and Cyrillic.**
- **Announcements say the translations are mostly AI.**
<!-- /layer languages -->

<!-- layer pwa 1.0.0 · from agent-app-boilerplate; change it there and run adopt -->
## Phone-first PWA

For web apps people use on their phones. It builds on Core; Languages and Design usually come
with it.

### Phone first

- **360 px wide, and touch.** Tap targets are at least 44 px, and 48 px for the main controls.
- **One step on screen at a time,** with one primary action pinned at the bottom.
- **A primary action that isn't ready is disabled,** with a note above it saying what's missing.
- **Motion is short,** never replays and respects reduced motion. Nothing jumps or changes size
  when it's ticked.
- **Real roles:** checkbox, alertdialog, a labelled group, `aria-pressed`. Buttons and links use the
  standard pointer cursor.

### The app's lifecycle

- **Installable:** a web manifest and the full icon set. tzolkin's `assets/icons/` is the
  checklist: favicons (SVG, ICO, 16, 32 and 48 px), the apple-touch icon, 192, 512 and 1024 px
  icons, maskable 192 and 512 px icons, and iOS app icons in light and dark, with their layers.
- **Offline first,** with a toast when the app goes offline.
- **Updates:** a prompt when a new version is ready. Test it with two production builds, because it
  never shows on the dev server.
- **Install help:** an install card, plus the steps for iOS.
- **The screen stays awake** while the app is in use, and the layout respects the safe areas in
  standalone mode.

### State

- **Any state from a fixture.** Every screen in every state can be reached from fixed inputs, such
  as a seed and the events, or demo data, so tests, screenshots and the design show the same thing.
  A pure, seeded core is the usual way: the clock and randomness come in only as inputs.
- **A save stores the inputs,** and loading checks them, for example by replaying them. Old saves
  always load (Core → Saved data is a promise).
- **Anything shared is a contract:** links, codes, the order of random draws. Changing one needs an
  issue and a new version number, and the old versions keep working.
- **Screen-only state stays on the screen.** Ticks and choices that log nothing don't go into the
  save.

### Hosting and privacy

- **Addresses:** the landing page is `<name>.silachev.com` and the app `app.<name>.silachev.com`.
- **The app sends `X-Robots-Tag: noindex`** and security headers. When it's hosted more than one
  way, every host gets the same caching and headers.
- **Analytics,** if the owner approves them, are cookieless page views, compiled only into the
  hosted build.

### Tests

- **Rules:** a unit test per rule, named after it.
- **UI:** through roles and accessible names, the way a user finds things, with shared helpers for
  the flows many tests need.
- **One end-to-end smoke test** on a phone-size touch screen, against the production build, in CI.
  Keep its trace when it fails.
- **Screenshots** come from fixtures, at one size, and their script fails on any other size.

### Done

- Checked at 360 px, in the longest languages when there are several (`ui-change`).
- The guide's screenshots updated when the UI changed.
<!-- /layer pwa -->

<!-- layer companion 1.0.0 · from agent-app-boilerplate; change it there and run adopt -->
## Companion for a physical game

For apps that run next to a physical board game. It builds on PWA.

- **A companion, not a digital game.** No card database, card names, card art or digital market.
  The app stores only what it needs: a card is `{ level, colour, points, tags }`.
- **Checklists mirror the table:** the user ticks what they did at the table, and a tile that's
  done turns gold, with a check.
- **Faithful to the rules.** Every number comes from the rulebook, with its page, in
  `docs/rules.md`.
  - Each gap is a ruling: a setting with a default, listed in the rulings table. Never change a
    default silently.
  - When the code needs a rule the docs don't have, stop and raise it in the issue.
- **Other people's IP:**
  - official art only with the owner's approval, kept in one folder and imported in one place;
    everything else we draw ourselves;
  - rulebooks are never committed: they go into a `reference-docs` release, which a command
    downloads;
  - credit the designer and the publisher, say the app is unofficial, and say you need your own
    copy of the game.
- **Community etiquette (BoardGameGeek):**
  - ask a fan author before announcing anything built on their work;
  - don't post app links on their files;
  - honour a request not to be credited;
  - cite their answers as "BGG clarification", with the link.
- **Balance claims** in the docs are backed by a simulator that's deterministic by seed.
- **Docs:**
  - `docs/rules.md`: the rules with page references, and the rulings table;
  - a spec for fan content, such as `docs/automa.md`;
  - `docs/design.md`;
  - `docs/guide/`, with screenshots;
  - `docs/reference/`: the source PDFs, gitignored.
<!-- /layer companion -->
